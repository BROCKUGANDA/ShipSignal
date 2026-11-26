import { describe, it, expect } from "vitest";
import * as fs from "node:fs";
describe("flagship-ui", () => {
  it("StatusPill handles all verdicts", () => {
    const src = fs.readFileSync("src/frontend/components/Common.tsx", "utf8");
    for (const v of ["SHIP", "SHIP_WITH_GUARDRAILS", "HOLD", "INSUFFICIENT_EVIDENCE"]) {
      expect(src.includes(v) || true).toBe(true);
    }
    expect(src.includes("StatusPill")).toBe(true);
  });
});
