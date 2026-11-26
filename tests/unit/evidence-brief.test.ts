import { describe, it, expect } from "vitest";
import { assessRelease, buildReleaseBrief, deriveEvidenceSignals } from "../../src/domain/risk-engine";
import type { EvidenceReference, Release } from "../../src/domain/types";

const release: Release = {
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

const evidence = (overrides: Partial<EvidenceReference>): EvidenceReference => ({
  id: "ev-1",
  workspaceId: "w1",
  sourcePlatform: "jira",
  sourceId: "SHIP-1",
  evidenceType: "issue_snapshot",
  retrievedAt: "2026-11-26T00:00:00.000Z",
  sourceUpdatedAt: "2026-11-25T00:00:00.000Z",
  freshness: "CURRENT",
  title: "Issue",
  summary: "status=To Do; priority=Low",
  ...overrides,
});

describe("evidence-derived readiness", () => {
  it("blocks a release with a critical issue and cites that issue", () => {
    const records = [
      evidence({ id: "ev-critical", title: "SHIP-9: Payment outage", summary: "status=Open; priority=Highest" }),
      evidence({ id: "ev-pr", sourcePlatform: "bitbucket", evidenceType: "pull_request_snapshot", title: "PR #12: draft", summary: "state=OPEN; review=draft; draft=true" }),
      evidence({ id: "ev-doc", sourcePlatform: "confluence", evidenceType: "documentation_snapshot", title: "Runbook", summary: "updated=2026-11-25" }),
    ];
    const signals = deriveEvidenceSignals(records, undefined, new Date("2026-11-26T00:00:00.000Z"));
    const assessment = assessRelease(release, records, signals, undefined, new Date("2026-11-26T00:00:00.000Z"));
    const critical = assessment.factors.find((factor) => factor.category === "CRITICAL_ISSUES");
    const review = assessment.factors.find((factor) => factor.category === "UNREVIEWED_CHANGES");

    expect(assessment.status).toBe("BLOCKED");
    expect(critical?.evidenceIds).toEqual(["ev-critical"]);
    expect(review?.evidenceIds).toEqual(["ev-pr"]);
  });

  it("returns INSUFFICIENT_EVIDENCE when source coverage is too thin", () => {
    const records = [evidence({ id: "ev-only" })];
    const assessment = assessRelease(release, records);
    const brief = buildReleaseBrief(release, records, assessment);
    expect(assessment.status).toBe("INCOMPLETE");
    expect(brief.verdict).toBe("INSUFFICIENT_EVIDENCE");
    expect(brief.evidenceGaps.length).toBeGreaterThan(0);
    expect(brief.confidence).toBeLessThan(70);
  });

  it("returns SHIP only for current, multi-source, risk-free evidence", () => {
    const records = [
      evidence({ id: "ev-jira", title: "SHIP-1: Ready", summary: "status=Done; priority=Low" }),
      evidence({ id: "ev-bb", sourcePlatform: "bitbucket", evidenceType: "pull_request_snapshot", title: "PR #3: approved", summary: "state=OPEN; review=approved; draft=false" }),
      evidence({ id: "ev-cf", sourcePlatform: "confluence", evidenceType: "documentation_snapshot", title: "Runbook", summary: "updated=2026-11-25" }),
    ];
    const assessment = assessRelease(release, records);
    const brief = buildReleaseBrief(release, records, assessment);
    expect(brief.verdict).toBe("SHIP");
    expect(brief.confidence).toBeGreaterThanOrEqual(70);
  });
});
