import { describe, it, expect } from "vitest";
import { normalizeError } from "../../src/backend/security/errors";

describe("error normalization", () => {
  it("classifies rate limit", () => {
    const e = normalizeError(new Error("HTTP 429 rate limit"));
    expect(e.code).toBe("RATE_LIMITED");
    expect(e.retryable).toBe(true);
  });
  it("classifies forbidden", () => {
    const e = normalizeError(new Error("403 forbidden"));
    expect(e.code).toBe("AUTHORIZATION_ERROR");
    expect(e.retryable).toBe(false);
  });
});