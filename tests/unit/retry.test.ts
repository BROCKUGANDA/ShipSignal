import { describe, it, expect } from "vitest";
import { calculateBackoff, isRetryableStatus } from "../../src/backend/security/retry";

describe("retry", () => {
  it("backoff within max", () => {
    const v = calculateBackoff(0, 500, 1000);
    expect(v).toBeGreaterThanOrEqual(0);
    expect(v).toBeLessThanOrEqual(1000);
  });
  it("retryable statuses", () => {
    expect(isRetryableStatus(429)).toBe(true);
    expect(isRetryableStatus(400)).toBe(false);
  });
});