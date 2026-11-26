import { describe, it, expect } from "vitest";
import { IdempotencyRepository } from "../../src/backend/repositories/idempotency-repository";
describe("idempotency-repo-shape", () => {
  it("exposes claim/complete", async () => {
    const r = new IdempotencyRepository();
    expect(typeof r.claim).toBe("function");
    expect(typeof r.complete).toBe("function");
  });
});
