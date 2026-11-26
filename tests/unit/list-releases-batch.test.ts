import { describe, it, expect } from "vitest";
import * as fs from "node:fs";
describe("listReleases-batched", () => {
  it("does not call loadAssessment in a per-release loop", () => {
    const src = fs.readFileSync("src/backend/index.ts", "utf8");
    const block = src.slice(src.indexOf('define("listReleases"'), src.indexOf('define("listReleases"') + 3000);
    expect(block.includes("for (const release of releases")).toBe(false);
  });
});
