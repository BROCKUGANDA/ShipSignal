import { describe, it, expect, beforeEach } from "vitest";
import { IdempotencyStore } from "../../src/backend/services/idempotency-store";

describe("idempotency", () => {
  beforeEach(() => IdempotencyStore.clear());
  it("stores and retrieves", () => {
    IdempotencyStore.set("k", { status: "done", result: 42 });
    expect(IdempotencyStore.has("k")).toBe(true);
    expect(IdempotencyStore.get("k")?.result).toBe(42);
  });
  it("missing returns undefined", () => {
    expect(IdempotencyStore.get("nope")).toBeUndefined();
  });
});