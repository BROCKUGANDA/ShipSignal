import { describe, it, expect } from "vitest";
import { z } from "zod";

const RiskAssessmentSchema = z.object({
  id: z.string(),
  releaseId: z.string(),
  status: z.enum(["READY", "AT_RISK", "BLOCKED", "INCOMPLETE"]),
  riskScore: z.number().nullable(),
  assessedAt: z.string(),
  evidenceFreshness: z.enum(["CURRENT", "STALE", "PARTIAL", "UNKNOWN"]),
  factors: z.array(z.any()),
  blockers: z.array(z.any()),
  recommendations: z.array(z.string()),
  warnings: z.array(z.string()),
});

describe("MCP response contract", () => {
  it("validates risk assessment shape", () => {
    const sample = {
      id: "ra-1",
      releaseId: "r1",
      status: "AT_RISK",
      riskScore: 25,
      assessedAt: "2026-10-30T00:00:00Z",
      evidenceFreshness: "CURRENT",
      factors: [],
      blockers: [],
      recommendations: [],
      warnings: [],
    };
    expect(() => RiskAssessmentSchema.parse(sample)).not.toThrow();
  });

  it("rejects invalid status", () => {
    const sample = {
      id: "ra-1",
      releaseId: "r1",
      status: "UNKNOWN",
      riskScore: 25,
      assessedAt: "2026-10-30T00:00:00Z",
      evidenceFreshness: "CURRENT",
      factors: [],
      blockers: [],
      recommendations: [],
      warnings: [],
    };
    expect(() => RiskAssessmentSchema.parse(sample)).toThrow();
  });
});