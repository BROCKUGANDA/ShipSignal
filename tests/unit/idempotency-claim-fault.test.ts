import { describe, it, expect, vi, beforeEach } from "vitest";

const queue: Array<"ok" | Error> = [];

vi.mock("@forge/sql", () => ({
  sql: {
    prepare: () => ({
      bindParams: () => ({
        execute: async () => {
          const next = queue.shift() ?? "ok";
          if (next instanceof Error) throw next;
          return { rows: [] };
        },
      }),
    }),
  },
}));

import { IdempotencyRepository } from "../../src/backend/repositories/idempotency-repository";

describe("IdempotencyRepository.claim fault distinction", () => {
  beforeEach(() => {
    queue.length = 0;
  });

  it("returns true on a fresh insert", async () => {
    queue.push("ok");
    await expect(new IdempotencyRepository().claim("w1", "sync", "k1")).resolves.toBe(true);
  });

  it("returns false on a duplicate-key violation", async () => {
    queue.push(new Error("Duplicate entry 'w1-sync-k1' for key 'PRIMARY' (code 1062)"));
    await expect(new IdempotencyRepository().claim("w1", "sync", "k1")).resolves.toBe(false);
  });

  it("rethrows infrastructure faults so the caller warns instead of dropping", async () => {
    queue.push(new Error("connection lost"));
    await expect(new IdempotencyRepository().claim("w1", "sync", "k1")).rejects.toThrow("connection lost");
  });
});
