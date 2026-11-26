import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  assessRelease,
  buildReleaseBrief,
  deriveEvidenceSignals,
} from "../../src/domain/risk-engine";
import type { EvidenceReference, Release, RiskAssessment } from "../../src/domain/types";
import { resetMigrationStateForTests } from "../../src/backend/database/migrations";
import { EvidenceRepository } from "../../src/backend/repositories/evidence-repository";
import {
  mockDb,
  recordedSqlCalls,
  resetForgeSqlMock,
} from "./helpers/forge-sql-mock";

vi.mock("@forge/sql", async () => {
  const helper = await import("./helpers/forge-sql-mock");
  return helper.createForgeSqlMock();
});

// Transparent wrapper: capture the per-release assessment that feeds each
// brief, so tests can assert on warnings that never reach the response shape.
vi.mock("../../src/domain/risk-engine", async (importOriginal) => {
  const orig = await importOriginal<typeof import("../../src/domain/risk-engine")>();
  const captured: RiskAssessment[] =
    ((globalThis as Record<string, unknown>).__briefAssessments as RiskAssessment[]) ??
    (((globalThis as Record<string, unknown>).__briefAssessments = []) as RiskAssessment[]);
  return {
    ...orig,
    buildReleaseBrief: (
      ...args: Parameters<typeof orig.buildReleaseBrief>
    ): ReturnType<typeof orig.buildReleaseBrief> => {
      captured.push(args[2]);
      return orig.buildReleaseBrief(...args);
    },
  };
});

function capturedAssessments(): RiskAssessment[] {
  return (
    ((globalThis as Record<string, unknown>).__briefAssessments as RiskAssessment[]) ?? []
  );
}

const REL_1: Release = {
  id: "rel-1",
  workspaceId: "w1",
  projectId: "SHIP",
  version: "2.4.0",
  title: "Payments release",
  status: "ACTIVE",
  createdAt: "2026-11-01T00:00:00.000Z",
  updatedAt: "2026-11-20T00:00:00.000Z",
  versionToken: 1,
};

const REL_2: Release = {
  id: "rel-2",
  workspaceId: "w1",
  projectId: "SHIP",
  version: "2.5.0",
  title: "Ledger release",
  status: "ACTIVE",
  createdAt: "2026-11-02T00:00:00.000Z",
  updatedAt: "2026-11-21T00:00:00.000Z",
  versionToken: 1,
};

function releaseRow(r: Release): Record<string, unknown> {
  return {
    id: r.id,
    workspace_id: r.workspaceId,
    project_id: r.projectId,
    version: r.version,
    title: r.title,
    status: r.status,
    target_date: null,
    created_at: r.createdAt,
    updated_at: r.updatedAt,
    version_token: r.versionToken,
  };
}

function evidenceRow(
  id: string,
  releaseId: string | null,
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    id,
    workspace_id: "w1",
    source_platform: "jira",
    source_id: `SRC-${id}`,
    evidence_type: "issue_snapshot",
    title: "LEG-101 critical sev-1 outage",
    summary: "critical blocker open issue",
    retrieved_at: "2026-11-20T00:00:00.000Z",
    source_updated_at: null,
    freshness: "CURRENT",
    release_id: releaseId,
    source_url: null,
    content_hash: null,
    ...overrides,
  };
}

function toRef(row: Record<string, unknown>): EvidenceReference {
  return {
    id: row.id as string,
    workspaceId: row.workspace_id as string,
    sourcePlatform: row.source_platform as EvidenceReference["sourcePlatform"],
    sourceId: row.source_id as string,
    evidenceType: row.evidence_type as string,
    retrievedAt: row.retrieved_at as string,
    freshness: row.freshness as EvidenceReference["freshness"],
    title: row.title as string,
    summary: (row.summary as string) ?? "",
  };
}

// Linked critical issue for rel-1 (also visible in the workspace-wide list),
// a linked doc that therefore appears in BOTH the linked set and the
// contextual set, plus unlinked workspace doc + PR.
const E_LINKED_ISSUE = evidenceRow("e-crit-1", "rel-1");
const E_LINKED_DOC = evidenceRow("e-doc-linked", "rel-1", {
  source_platform: "confluence",
  evidence_type: "documentation",
  title: "Release runbook",
  summary: "rollback plan",
});
const E_WS_DOC = evidenceRow("e-doc-ws", null, {
  source_platform: "confluence",
  evidence_type: "documentation",
  title: "Runbook draft",
  summary: "notes",
});
const E_WS_PR = evidenceRow("e-pr-ws", null, {
  source_platform: "bitbucket",
  source_id: "PR-7",
  evidence_type: "pull_request",
  title: "Add ledger export",
  summary: "approved",
});

function seedDb(): void {
  mockDb.releases.push(releaseRow(REL_1), releaseRow(REL_2));
  mockDb.evidence.push(E_LINKED_ISSUE, E_LINKED_DOC, E_WS_DOC, E_WS_PR);
}

async function invokeListReleases(): Promise<{
  success: boolean;
  data: {
    releases: Array<Record<string, unknown>>;
    count: number;
    retrievedAt: string;
  };
}> {
  const { handler } = await import("../../src/backend/index");
  const raw = (await handler(
    {
      call: { functionKey: "listReleases", payload: { correlationId: "test-batch" } },
      context: { cloudId: "w1" },
    },
    undefined,
  )) as unknown;
  return raw as {
    success: boolean;
    data: { releases: Array<Record<string, unknown>>; count: number; retrievedAt: string };
  };
}

function briefFor(release: Release, refs: EvidenceReference[]) {
  const assessment = assessRelease(release, refs, deriveEvidenceSignals(refs));
  return buildReleaseBrief(release, refs, assessment);
}

describe("listReleases batched evidence fetch", () => {
  beforeEach(() => {
    resetForgeSqlMock();
    resetMigrationStateForTests();
    capturedAssessments().length = 0;
    seedDb();
  });

  it("issues one batched IN query and zero per-release queries", async () => {
    const res = await invokeListReleases();
    expect(res.success).toBe(true);
    expect(res.data.count).toBe(2);

    const inQueries = recordedSqlCalls.filter((c) => c.text.includes("release_id IN ("));
    expect(inQueries).toHaveLength(1);

    const perReleaseEvidence = recordedSqlCalls.filter((c) =>
      c.text.includes("AND release_id = ?"),
    );
    expect(perReleaseEvidence).toHaveLength(0);

    const perReleaseLookup = recordedSqlCalls.filter((c) =>
      c.text.includes("FROM releases WHERE workspace_id = ? AND id = ?"),
    );
    expect(perReleaseLookup).toHaveLength(0);

    // Constant query budget: releases list + IN batch + workspace list.
    expect(recordedSqlCalls).toHaveLength(3);
  });

  it("dedupes evidence present in both linked and contextual sets", async () => {
    const res = await invokeListReleases();
    const rel1 = res.data.releases.find((r) => r.id === "rel-1");
    expect(rel1).toBeDefined();

    // rel-1: linked [issue, linked-doc]; contextual docs/PRs [linked-doc, ws-doc, ws-pr]
    // → deduped to 4 rows. A naive concat would assess 5 rows (linked-doc twice).
    const deduped = [E_LINKED_ISSUE, E_LINKED_DOC, E_WS_DOC, E_WS_PR].map(toRef);
    const duplicated = [...deduped, toRef(E_LINKED_DOC)];
    const expected = briefFor(REL_1, deduped);
    const withoutDedupe = briefFor(REL_1, duplicated);
    expect(withoutDedupe.confidence).not.toBe(expected.confidence);

    expect(rel1!.verdict).toBe(expected.verdict);
    expect(rel1!.riskScore).toBe(expected.riskScore);
    expect(rel1!.confidence).toBe(expected.confidence);
    expect(rel1!.blockerCount).toBe(expected.blockers.length);
  });

  it("falls back to workspace context with a warning for unlinked releases", async () => {
    const res = await invokeListReleases();
    const rel2 = res.data.releases.find((r) => r.id === "rel-2");
    expect(rel2).toBeDefined();

    // rel-2 has no linked rows → whole workspace set is assessed as context.
    const contextual = [E_LINKED_ISSUE, E_LINKED_DOC, E_WS_DOC, E_WS_PR].map(toRef);
    const expected = briefFor(REL_2, contextual);
    expect(rel2!.verdict).toBe(expected.verdict);
    expect(rel2!.blockerCount).toBe(expected.blockers.length);

    const [a1, a2] = capturedAssessments() as [RiskAssessment, RiskAssessment];
    expect(a1.releaseId).toBe("rel-1");
    expect(a2.releaseId).toBe("rel-2");
    expect(a2.warnings).toContain(
      "No evidence is linked to this release yet; workspace evidence is shown as context.",
    );
    expect(a1.warnings).not.toContain(
      "No evidence is linked to this release yet; workspace evidence is shown as context.",
    );
  });

  it("listByWorkspaceIds short-circuits on empty ids without SQL", async () => {
    const repo = new EvidenceRepository();
    const callsBefore = recordedSqlCalls.length;
    await expect(repo.listByWorkspaceIds("w1", [])).resolves.toEqual([]);
    expect(recordedSqlCalls.length).toBe(callsBefore);
  });
});
