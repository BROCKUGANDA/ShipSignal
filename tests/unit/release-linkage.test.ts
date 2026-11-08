import { describe, it, expect } from "vitest";
import { assessRelease } from "../../src/domain/risk-engine";

const release = {
  id: "rel-CX-100",
  workspaceId: "w",
  projectId: "CX",
  version: "1.0",
  title: "CX 1.0",
  status: "ACTIVE" as const,
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-01-01T00:00:00Z",
  versionToken: 1,
};

describe("release linkage", () => {
  it("marks INCOMPLETE with no evidence (never READY)", () => {
    const r = assessRelease(release, [], { hasUnreviewedChanges: false, hasMissingDocs: false, hasCriticalIssues: false });
    expect(r.status).toBe("INCOMPLETE");
    expect(r.riskScore).toBeNull();
  });
  it("blocks on critical evidence", () => {
    const ev = [{ id: "e1", workspaceId: "w", sourcePlatform: "jira" as const, sourceId: "1", evidenceType: "issue_snapshot", retrievedAt: "2026-01-01T00:00:00Z", freshness: "CURRENT" as const, title: "critical outage", summary: "critical" }];
    const r = assessRelease(release, ev, { hasUnreviewedChanges: false, hasMissingDocs: false, hasCriticalIssues: true });
    expect(r.status).toBe("BLOCKED");
  });
});