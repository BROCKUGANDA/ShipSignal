import { describe, it, expect } from "vitest";
import { resolveWorkspaceId, normalizeError, correlationIdFromRequest } from "../../src/backend/security/errors";

describe("workspace isolation", () => {
  it("prefers context installationId over payload mismatch", () => {
    const id = resolveWorkspaceId({ installationId: "tenant-a" }, { workspaceId: "tenant-b" });
    expect(id).toBe("tenant-a");
  });

  it("uses payload when no context", () => {
    const prev = process.env.NODE_ENV;
    delete process.env.NODE_ENV;
    const id = resolveWorkspaceId({}, { workspaceId: "w1" });
    expect(id).toBe("w1");
    process.env.NODE_ENV = prev;
  });

  it("normalizeError maps rate limit", () => {
    const e = normalizeError(new Error("429 rate limit exceeded"));
    expect(e.code).toBe("RATE_LIMITED");
    expect(e.retryable).toBe(true);
  });

  it("normalizeError maps auth", () => {
    expect(normalizeError(new Error("401 unauthorized")).code).toBe("AUTHENTICATION_ERROR");
  });

  it("correlationIdFromRequest uses payload when valid", () => {
    expect(correlationIdFromRequest({ payload: { correlationId: "cid-1" } })).toBe("cid-1");
    const generated = correlationIdFromRequest({ payload: {} });
    expect(typeof generated).toBe("string");
    expect(generated.length).toBeGreaterThan(8);
  });
});
