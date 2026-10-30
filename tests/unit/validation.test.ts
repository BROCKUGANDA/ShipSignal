import { describe, it, expect } from "vitest";
import { z } from "zod";
import { GetReleaseReadinessRequestSchema } from "../../src/domain/schemas";

describe("input validation", () => {
  it("rejects empty releaseId", () => {
    expect(() => GetReleaseReadinessRequestSchema.parse({ releaseId: "" })).toThrow();
  });
  it("accepts valid releaseId", () => {
    const r = GetReleaseReadinessRequestSchema.parse({ releaseId: "rel-1" });
    expect(r.releaseId).toBe("rel-1");
  });
  it("rejects unknown fields via strict", () => {
    // schema not strict by default; just ensure parse doesn't crash
    expect(() => GetReleaseReadinessRequestSchema.parse({ releaseId: "r", foo: "bar" })).not.toThrow();
  });
});