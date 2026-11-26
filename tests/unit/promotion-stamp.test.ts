import { describe, it, expect } from "vitest";
import * as fs from "node:fs";

describe("promotion-stamp", () => {
  it("pipeline script exists", () => {
    expect(fs.existsSync("scripts/promotion-pipeline.mjs")).toBe(true);
  });

  it("pipeline script writes exactly the contract stamp keys", () => {
    const src = fs.readFileSync("scripts/promotion-pipeline.mjs", "utf8");
    expect(src).toContain("dist/release/stamp.json");
    const stampStart = src.indexOf("const stamp = {");
    const block = src.slice(stampStart, src.indexOf("\n};", stampStart));
    expect(block.length).toBeGreaterThan(0);
    const keys = [...block.matchAll(/^\s*([A-Za-z_]+)\s*[:,]/gm)].map((m) => m[1]).sort();
    expect(keys).toEqual(["env", "sha", "timestamp", "version"]);
  });

  it("stamp.json, when present, has exactly the contract shape", () => {
    // Conditional by design: the pipeline runs `npm test` BEFORE writing the
    // stamp, so requiring the artifact here would deadlock fresh checkouts.
    // The script-level exact-keys test above always enforces the contract.
    if (!fs.existsSync("dist/release/stamp.json")) return;
    const stamp = JSON.parse(fs.readFileSync("dist/release/stamp.json", "utf8"));
    expect(Object.keys(stamp).sort()).toEqual(["env", "sha", "timestamp", "version"]);
    expect(Number.isNaN(Date.parse(stamp.timestamp))).toBe(false);
  });
});
