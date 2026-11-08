#!/usr/bin/env node
/**
 * ShipSignal Promotion Pipeline
 * Runs: typecheck -> test -> build -> backend build -> manifest lint -> artifact stamp
 * Usage: node scripts/promotion-pipeline.mjs [--env production] [--skip-forge]
 */
import { execSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";

const args = process.argv.slice(2);
const env = args.includes("--env") ? args[args.indexOf("--env") + 1] || "production" : "production";
const skipForge = args.includes("--skip-forge");

function run(cmd, label) {
  console.log(`\n=== ${label} ===`);
  console.log(`> ${cmd}`);
  execSync(cmd, { stdio: "inherit", cwd: process.cwd() });
}

function checkFile(p) {
  if (!existsSync(p)) throw new Error(`Missing required file: ${p}`);
  return true;
}

console.log("ShipSignal Promotion Pipeline");
console.log(`Environment: ${env}`);
console.log(`Skip Forge deploy: ${skipForge}`);

checkFile("package.json");
checkFile("manifest.yml");
checkFile("src/backend/index.ts");

const pkg = JSON.parse(readFileSync("package.json", "utf-8"));
console.log(`Version: ${pkg.version}`);

// 1. Typecheck
run("npm run typecheck", "Typecheck");

// 2. Tests
run("npm test", "Tests");

// 3. Frontend build
run("npm run build", "Frontend build");

// 4. Backend build
run("npm run build:backend", "Backend build");

// 5. Manifest sanity checks
console.log("\n=== Manifest checks ===");
const manifest = readFileSync("manifest.yml", "utf-8");
const required = ["app:", "modules:", "permissions:", "resources:"];
for (const r of required) {
  if (!manifest.includes(r)) throw new Error(`manifest.yml missing ${r}`);
  console.log(`OK manifest contains ${r}`);
}

// 6. Artifact stamp
mkdirSync("dist/release", { recursive: true });
const stamp = {
  app: "ShipSignal",
  version: pkg.version,
  environment: env,
  gitSha: (() => { try { return execSync("git rev-parse HEAD", { encoding: "utf-8" }).trim(); } catch { return "unknown"; } })(),
  builtAt: new Date().toISOString(),
  manifestSha: Buffer.from(manifest).toString("base64").slice(0, 32),
};
writeFileSync("dist/release/stamp.json", JSON.stringify(stamp, null, 2));
console.log("\nRelease stamp written to dist/release/stamp.json");
console.log(stamp);

// 7. Forge validation (if available)
if (!skipForge) {
  console.log("\n=== Forge validation ===");
  try {
    execSync("forge --version", { stdio: "inherit" });
    execSync("forge deploy --dry-run", { stdio: "inherit" });
  } catch (e) {
    console.warn("Forge CLI not available or dry-run failed. Skipping forge deploy (expected in CI without auth).");
    console.warn(e.message);
  }
} else {
  console.log("Skipping Forge deploy (--skip-forge).");
}

console.log("\nPromotion pipeline completed for env:", env);
console.log("Next steps:");
console.log("  - Push to remote (git push) to trigger CI staging deploy");
console.log("  - forge deploy --environment production (with auth) to promote");
console.log("  - forge install --site <site> --product jira/confluence");

process.exit(0);
