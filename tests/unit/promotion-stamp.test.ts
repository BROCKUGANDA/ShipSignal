import { describe, it, expect } from "vitest";
import * as fs from "node:fs";

describe("promotion-stamp", () => {
  it("pipeline script exists", () => {
    expect(fs.existsSync("scripts/promotion-pipeline.mjs")).toBe(true);
  });

  it("pipeline script writes the required stamp keys", () => {
    const src = fs.readFileSync("scripts/promotion-pipeline.mjs", "utf8");
    expect(src).toContain("dist/release/stamp.json");
    for (const key of ["version", "sha", "env", "timestamp"]) {
      expect(src.includes(key)).toBe(true);
    }
  });

  it("stamp.json, when present, has the required shape", () => {
    if (!fs.existsSync("dist/release/stamp.json")) return;
    const stamp = JSON.parse(fs.readFileSync("dist/release/stamp.json", "utf8"));
    expect(typeof stamp.version).toBe("string");
    expect(typeof stamp.sha).toBe("string");
    expect(typeof stamp.env).toBe("string");
    expect(typeof stamp.timestamp).toBe("string");
    expect(Number.isNaN(Date.parse(stamp.timestamp))).toBe(false);
  });
});
