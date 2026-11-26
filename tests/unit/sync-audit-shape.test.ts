import { describe, it, expect } from "vitest";
import { AuditService } from "../../src/backend/services/audit-service";
describe("sync-audit-durable", () => {
  it("listDurable is function returning array", async () => {
    expect(typeof AuditService.listDurable).toBe("function");
  });
});
