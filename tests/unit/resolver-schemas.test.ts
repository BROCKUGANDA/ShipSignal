import { describe, it, expect } from "vitest";
import {
  GetReleaseReadinessRequestSchema,
  GetChangeImpactRequestSchema,
  GenerateReleaseReportRequestSchema,
  CreateRemediationTaskRequestSchema,
  UpdateRiskStatusRequestSchema,
  GetRiskEvidenceRequestSchema,
} from "../../src/domain/schemas";

describe("resolver request schemas (production hardening)", () => {
  it("getReleaseReadiness defaults includeEvidence false", () => {
    const r = GetReleaseReadinessRequestSchema.parse({ releaseId: "rel_1-X" });
    expect(r.includeEvidence).toBe(false);
  });

  it("getChangeImpact requires changeId", () => {
    expect(() => GetChangeImpactRequestSchema.parse({})).toThrow();
    expect(GetChangeImpactRequestSchema.parse({ changeId: "PR-123" }).changeId).toBe("PR-123");
  });

  it("generateReleaseReport defaults markdown", () => {
    expect(GenerateReleaseReportRequestSchema.parse({ releaseId: "r1" }).format).toBe("markdown");
    expect(() => GenerateReleaseReportRequestSchema.parse({ releaseId: "r1", format: "pdf" })).toThrow();
  });

  it("createRemediationTask validates summary and projectKey uppercase", () => {
    expect(CreateRemediationTaskRequestSchema.parse({ releaseId: "r1", summary: "Fix", projectKey: "SHIP" }).summary).toBe("Fix");
    expect(() => CreateRemediationTaskRequestSchema.parse({ releaseId: "r1", summary: "x", projectKey: "ship" })).toThrow();
    expect(() => CreateRemediationTaskRequestSchema.parse({ releaseId: "r1", summary: "" })).toThrow();
  });

  it("updateRiskStatus restricts status enum", () => {
    expect(UpdateRiskStatusRequestSchema.parse({ releaseId: "r1", status: "AT_RISK" }).status).toBe("AT_RISK");
    expect(() => UpdateRiskStatusRequestSchema.parse({ releaseId: "r1", status: "UNKNOWN" })).toThrow();
  });

  it("getRiskEvidence caps limit at 100", () => {
    expect(GetRiskEvidenceRequestSchema.parse({ limit: 50 }).limit).toBe(50);
    expect(() => GetRiskEvidenceRequestSchema.parse({ limit: 200 })).toThrow();
  });

  it("rejects unknown keys strict", () => {
    expect(() => GetChangeImpactRequestSchema.parse({ changeId: "c1", evil: true })).toThrow();
  });
});
