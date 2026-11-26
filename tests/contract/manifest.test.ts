import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("manifest MCP tools", () => {
  const manifest = readFileSync(join(process.cwd(), "manifest.yml"), "utf8");
  it("exposes all 9 MCP tools", () => {
    const tools = [
      "get-release-readiness",
      "get-release-blockers",
      "get-project-health",
      "get-change-impact",
      "get-service-dependencies",
      "get-risk-evidence",
      "generate-release-report",
      "create-remediation-task",
      "update-risk-status",
    ];
    for (const t of tools) {
      expect(manifest).toContain(t);
    }
  });
  it("has no placeholder icon URL", () => {
    expect(manifest).not.toContain("example.com");
  });
  it("declares rovo agent and mcp modules", () => {
    expect(manifest).toContain("rovo:agent");
    expect(manifest).toContain("rovo:mcp");
  });
  it("enables Forge SQL for the repositories", () => {
    expect(manifest).toContain("sql:");
    expect(manifest).toContain("engine: mysql");
  });
  it("routes actions through a dedicated function and declares inputs", () => {
    expect(manifest).toContain("handler: backend/index.actionHandler");
    expect(manifest).toContain("function: actions");
    expect(manifest).toContain("releaseId:");
    expect(manifest).toContain("confirm:");
  });
  it("wires webtrigger and scheduled trigger to separate handlers", () => {
    expect(manifest).toContain("handler: backend/index.webtriggerHandler");
    expect(manifest).toContain("handler: backend/index.scheduledHandler");
  });
});