import { describe, it, expect } from "vitest";
import { CircuitBreaker } from "../../src/backend/security/circuit-breaker";

describe("circuit breaker", () => {
  it("opens after threshold failures", async () => {
    const cb = new CircuitBreaker(2, 1000);
    const failing = async () => { throw new Error("boom"); };
    for (let i = 0; i < 2; i++) {
      try { await cb.execute(failing); } catch {}
    }
    expect(cb.getState()).toBe("OPEN");
  });
  it("allows success in closed state", async () => {
    const cb = new CircuitBreaker(2, 1000);
    const result = await cb.execute(async () => 42);
    expect(result).toBe(42);
    expect(cb.getState()).toBe("CLOSED");
  });
});