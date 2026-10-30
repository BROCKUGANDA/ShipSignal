import { describe, it, expect } from "vitest";
import { assessRelease } from "../../src/domain/risk-engine";

describe("risk engine", () => {
  it("marks incomplete when no evidence", () => {
    const release = {
      id: "r1",
      workspaceId: "w",
      projectId: "p",
      version: "1.0",
      title: "t",
      status: "ACTIVE" as const,
      createdAt: "",
      updatedAt: "",
      versionToken: 1,
    };
    const res = assessRelease(release, [], {
      hasUnreviewedChanges: false,
      hasMissingDocs: false,
      hasCriticalIssues: false,
    });
    expect(res.status).toBe("INCOMPLETE");
    expect(res.riskScore).toBeNull();
  });

  it("blocks on critical issues", () => {
    const release = {
      id: "r1",
      workspaceId: "w",
      projectId: "p",
      version: "1.0",
      title: "t",
      status: "ACTIVE" as const,
      createdAt: "",
      updatedAt: "",
      versionToken: 1,
    };
    const res = assessRelease(release, [{ id: "e1", workspaceId: "w", sourcePlatform: "jira", sourceId: "1", evidenceType: "issue", retrievedAt: "", freshness: "CURRENT", title: "t", summary: "s" }], {
      hasUnreviewedChanges: false,
      hasMissingDocs: false,
      hasCriticalIssues: true,
    });
    expect(res.status).toBe("BLOCKED");
  });
});