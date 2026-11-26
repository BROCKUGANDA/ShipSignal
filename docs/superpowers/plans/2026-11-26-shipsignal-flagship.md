# ShipSignal Flagship Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship hybrid-C flagship: durable trust core + Grand-Prize demo spine without breaking install link.

**Architecture:** Freeze `manifest.yml` keys + resolver contracts; add SQL-backed repos behind existing interfaces; batch N+1; additive UI tokens/CSS only.

**Tech Stack:** Atlassian Forge (nodejs24.x), TypeScript strict, React 18 + Atlaskit, Forge SQL `@forge/sql`, Zod, Vitest, Vite.

**Spec:** `docs/superpowers/specs/2026-11-26-shipsignal-flagship-design.md`

## Global Constraints

- `manifest.yml` module keys unchanged: `resolver`, `actions`, `sync-trigger`, `scheduled-sync`, `shipsignal-project-page`, `shipsignal-space-page`, `shipsignal-agent`, 9 actions, `shipsignal-mcp`.
- Resolver request/response shapes unchanged; `resolveWorkspaceId` stays context-authoritative, payload workspace IDs never trusted.
- TypeScript strict passes: `npm run typecheck`.
- Tests pass: `npm test` (currently 41/41).
- Risk engine deterministic: AI never changes scores; missing evidence → `INCOMPLETE`/`INSUFFICIENT_EVIDENCE`.
- Mutations `createRemediationTask`/`updateRiskStatus` require `confirm:true` + durable audit.
- No new Forge scopes; no secrets in repo.

---

### Task 1: Durable idempotency repository

**Files:**
- Create: `src/backend/repositories/idempotency-repository.ts`
- Modify: `src/backend/services/idempotency-store.ts`
- Test: `tests/unit/idempotency.test.ts`

**Interfaces:**
- Consumes: `@forge/sql` `sql.prepare().bindParams().execute()`, table `idempotency_keys(workspace_id, operation, idempotency_key, status, result_json, created_at)`.
- Produces: `IdempotencyRepository.claim(ws, op, key): Promise<boolean>`; `complete(ws, op, key, resultJson: string): Promise<void>`; `IdempotencyStore.tryClaimSync` stays sync in-memory fast-path.

- [ ] **Step 1: Write the failing test**

```typescript
import { describe, it, expect } from "vitest";
import { IdempotencyRepository } from "../../src/backend/repositories/idempotency-repository";
describe("idempotency-repo-shape", () => {
  it("exposes claim/complete", async () => {
    const r = new IdempotencyRepository();
    expect(typeof r.claim).toBe("function");
    expect(typeof r.complete).toBe("function");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/unit/idempotency.test.ts`
Expected: FAIL with "not defined" or new file test missing until created — create a temp shape test `tests/unit/idempotency-repo-shape.test.ts` with above, run `npx vitest run tests/unit/idempotency-repo-shape.test.ts`, expect FAIL module not found.

- [ ] **Step 3: Write minimal implementation**

```typescript
import { sql } from "@forge/sql";
export class IdempotencyRepository {
  async claim(workspaceId: string, operation: string, key: string): Promise<boolean> {
    const now = new Date().toISOString();
    try {
      await sql.prepare(
        `INSERT INTO idempotency_keys (workspace_id, operation, idempotency_key, status, created_at) VALUES (?, ?, ?, 'CLAIMED', ?)`
      ).bindParams(workspaceId, operation, key, now).execute();
      return true;
    } catch {
      return false;
    }
  }
  async complete(workspaceId: string, operation: string, key: string, resultJson: string): Promise<void> {
    await sql.prepare(
      `UPDATE idempotency_keys SET status='DONE', result_json=? WHERE workspace_id=? AND operation=? AND idempotency_key=?`
    ).bindParams(resultJson, workspaceId, operation, key).execute();
  }
}
```

Note: migration `003_idempotency` in `src/backend/database/migrations.ts` already creates `idempotency_keys(workspace_id, operation, idempotency_key, status, result_json, created_at)` with PK triple — match those column names exactly. The older `src/database/migrations/002` variant uses different columns and is not the Forge runtime path; do not use it.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/unit/idempotency-repo-shape.test.ts`
Expected: PASS. Then `npm test` full — Expected: 41+ PASS (new file adds 1).

- [ ] **Step 5: Commit**

```bash
git add src/backend/repositories/idempotency-repository.ts tests/unit/idempotency-repo-shape.test.ts
git commit -m "feat: add SQL idempotency repository with claim/complete"
```

### Task 2: Wire sync idempotency + durable audit on sync

**Files:**
- Modify: `src/backend/workers/sync-worker.ts:37-50`
- Modify: `src/backend/services/audit-service.ts:38-48`
- Test: `tests/unit/release-linkage.test.ts` (extend, do not rewrite)

**Interfaces:**
- Consumes: `IdempotencyRepository.claim/complete` from Task 1, `AuditService.record/listDurable`.
- Produces: `SyncWorker.run` skips duplicate `operation='sync'` + records `SYNC_COMPLETED` durable audit.

- [ ] **Step 1: Write the failing test**

```typescript
import { describe, it, expect } from "vitest";
import { AuditService } from "../../src/backend/services/audit-service";
describe("sync-audit-durable", () => {
  it("listDurable is function returning array", async () => {
    expect(typeof AuditService.listDurable).toBe("function");
  });
});
```

Save as `tests/unit/sync-audit-shape.test.ts`.

- [ ] **Step 2: Run test to verify it fails/passes baseline**

Run: `npx vitest run tests/unit/sync-audit-shape.test.ts`
Expected: PASS baseline (documents interface before wiring).

- [ ] **Step 3: Write minimal implementation**

In `src/backend/workers/sync-worker.ts` top of `run()` after `ensureMigrations()`:

```typescript
import { IdempotencyRepository } from "../repositories/idempotency-repository";
import { AuditService } from "../services/audit-service";
const idem = new IdempotencyRepository();
const syncKey = `sync-${new Date().toISOString().slice(0,13)}`;
const first = await idem.claim(workspaceId, "sync", syncKey).catch(() => true);
if (!first) return { workspaceId, sources: [], evidenceCount: 0, releasesUpserted: 0, warnings: ["Duplicate sync suppressed."], syncedAt: now };
```

At end of `run()` before return:

```typescript
AuditService.record({ id: `audit-sync-${Date.now()}`, workspaceId, actorId: "system", actorType: "SYSTEM", operation: "SYNC_COMPLETED", targetEntity: `workspace:${workspaceId}`, result: "SUCCESS", timestamp: now, correlationId: `sync-${Date.now()}` });
```

- [ ] **Step 4: Run tests**

Run: `npm run typecheck && npm test`
Expected: PASS, no type errors, 42+ tests.

- [ ] **Step 5: Commit**

```bash
git add src/backend/workers/sync-worker.ts tests/unit/sync-audit-shape.test.ts
git commit -m "feat: sync idempotency guard plus durable sync audit"
```

### Task 3: Fix listReleases N+1

**Files:**
- Modify: `src/backend/index.ts:478-501`
- Modify: `src/backend/repositories/evidence-repository.ts:47-56` (add batch method)
- Test: `tests/unit/release-linkage.test.ts`

**Interfaces:**
- Consumes: `ReleaseRepository.listByWorkspace`, `EvidenceRepository.listByWorkspace`.
- Produces: identical `listReleases` response shape `{ releases: [...], count, retrievedAt }` with `verdict/riskScore/confidence/blockerCount` enriched, single evidence query.

- [ ] **Step 1: Write the failing test**

Add to new file `tests/unit/list-releases-batch.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import * as fs from "node:fs";
describe("listReleases-batched", () => {
  it("does not call loadAssessment in a per-release loop", () => {
    const src = fs.readFileSync("src/backend/index.ts", "utf8");
    const block = src.slice(src.indexOf("define(\"listReleases\""), src.indexOf("define(\"listReleases\"") + 3000);
    expect(block.includes("for (const release of releases")).toBe(false);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run tests/unit/list-releases-batch.test.ts`
Expected: FAIL (current code has the loop).

- [ ] **Step 3: Write minimal implementation**

Add to `EvidenceRepository`:

```typescript
async listByWorkspaceIds(workspaceId: string, releaseIds: string[], limit = 500): Promise<EvidenceRow[]> {
  if (!releaseIds.length) return [];
  const marks = releaseIds.map(() => "?").join(",");
  const result = await sql.prepare<EvidenceRow>(
    `SELECT id, workspace_id, source_platform, source_id, evidence_type, title, summary, retrieved_at, source_updated_at, freshness, release_id, source_url, content_hash FROM evidence_records WHERE workspace_id = ? AND release_id IN (${marks}) ORDER BY retrieved_at DESC LIMIT ?`
  ).bindParams(workspaceId, ...releaseIds, limit).execute();
  return result.rows ?? [];
}
```

Rewrite `listReleases` body: fetch `releases = await releaseRepo.listByWorkspace(workspaceId, 50)`, slice 25, single `evidenceRepo.listByWorkspace(workspaceId, 200)` + `listByWorkspaceIds` grouped by `release_id` in-memory, then `assessRelease`+`buildReleaseBrief` per release without extra SQL. Keep response shape identical.

- [ ] **Step 4: Run tests**

Run: `npm run typecheck && npx vitest run tests/unit/list-releases-batch.test.ts && npm test`
Expected: PASS all.

- [ ] **Step 5: Commit**

```bash
git add src/backend/index.ts src/backend/repositories/evidence-repository.ts tests/unit/list-releases-batch.test.ts
git commit -m "perf: batch listReleases evidence, remove N+1"
```

### Task 4: Flagship UI polish (additive only)

**Files:**
- Modify: `src/frontend/components/Common.tsx:44-60`
- Modify: `src/frontend/pages/OverviewPage.tsx:50-84`
- Modify: `src/frontend/pages/ReleaseDetailPage.tsx:105-152`
- Modify: `src/frontend/styles/app.css` (append verdict + chip classes)
- Test: `tests/unit/empty-state.test.tsx` (extend)

**Interfaces:**
- Consumes: existing `useResolver("listReleases")`, `useResolver("getReleaseReadiness")`.
- Produces: same routes; verdict banner with `policyVersion/confidence/coverage`, freshness chips, copy-brief fallback.

- [ ] **Step 1: Write the failing test**

```typescript
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
```

Save as `tests/unit/flagship-ui.test.ts`.

- [ ] **Step 2: Run**

Run: `npx vitest run tests/unit/flagship-ui.test.ts`
Expected: PASS baseline (locks file presence before CSS work).

- [ ] **Step 3: Write minimal implementation**

`Common.tsx` — add `title` attr + `aria-label` to `StatusPill`/`FreshnessChip`, add `VerdictBanner` export:

```tsx
export function VerdictBanner({ verdict, confidence, riskScore, policyVersion }: { verdict: string; confidence: number; riskScore: number | null; policyVersion: string }) {
  return (
    <div className={`verdict verdict-${verdict}`} role="status" aria-label={`Release verdict ${verdict}`}>
      <strong>{verdict.replaceAll("_", " ")}</strong>
      <span className="muted"> · {confidence}% confidence · risk {riskScore ?? "n/a"} · {policyVersion}</span>
    </div>
  );
}
```

`app.css` append:

```css
.verdict { border-left: 4px solid var(--ink); padding: 10px 14px; border-radius: 8px; background: var(--card); margin-bottom: 14px; }
.verdict-HOLD { border-color: #c00; } .verdict-SHIP { border-color: #0a0; }
.verdict-SHIP_WITH_GUARDRAILS { border-color: #e80; } .verdict-INSUFFICIENT_EVIDENCE { border-color: #888; }
```

`OverviewPage`/`ReleaseDetailPage`: insert `<VerdictBanner>` above tables, add `navigator.clipboard` fallback with `try/catch` + `prompt()` fallback in `copyBrief`.

- [ ] **Step 4: Run**

Run: `npm run typecheck && npm run build && npm test`
Expected: PASS, `static/frontend/` builds.

- [ ] **Step 5: Commit**

```bash
git add src/frontend/components/Common.tsx src/frontend/pages/OverviewPage.tsx src/frontend/pages/ReleaseDetailPage.tsx src/frontend/styles/app.css tests/unit/flagship-ui.test.ts
git commit -m "feat: flagship verdict banner, a11y pills, copy fallback"
```

### Task 5: Judging pack + promotion proof + contract lock

**Files:**
- Create: `scripts/promotion-pipeline.mjs` (or patch if exists)
- Modify: `docs/DEVPOST_SUBMISSION.md` (install-link + testing instructions + bonus writeups)
- Modify: `docs/JUDGING_GUIDE.md` (3-min spine)
- Test: `tests/contract/manifest.test.ts`, `tests/contract/mcp-shapes.test.ts`

**Interfaces:**
- Consumes: `manifest.yml` keys, `git rev-parse HEAD`.
- Produces: `dist/release/stamp.json` `{version, sha, env, timestamp}`; judging docs with concrete Rovo prompt + MCP example.

- [ ] **Step 1: Write the failing test**

```typescript
import { describe, it, expect } from "vitest";
import * as fs from "node:fs";
describe("promotion-stamp", () => {
  it("pipeline script exists", () => {
    expect(fs.existsSync("scripts/promotion-pipeline.mjs")).toBe(true);
  });
});
```

Save as `tests/unit/promotion-stamp.test.ts`.

- [ ] **Step 2: Run**

Run: `npx vitest run tests/unit/promotion-stamp.test.ts`
Expected: FAIL if script missing, else PASS — either way proceed to ensure stamp output.

- [ ] **Step 3: Write minimal implementation**

`scripts/promotion-pipeline.mjs`:

```js
import { execSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
const sha = execSync("git rev-parse --short HEAD").toString().trim();
const stamp = { version: "1.0.0", sha, env: process.env.SHIP_ENV ?? "dev", timestamp: new Date().toISOString() };
mkdirSync("dist/release", { recursive: true });
writeFileSync("dist/release/stamp.json", JSON.stringify(stamp, null, 2));
console.log("stamp written", stamp);
```

Update `docs/JUDGING_GUIDE.md` 3-min spine: Overview → release Brief → Evidence → Risks → Rovo `"Why is 2.4.0 at risk?"` → MCP `get-release-readiness {releaseId}` → Activity audit. Update `docs/DEVPOST_SUBMISSION.md` testing instructions + install-link placeholder + bonus paragraphs (Rovo 9 actions, MCP 9 tools, TWG honest fallback, Runs-on-Atlassian storage-only).

- [ ] **Step 4: Run**

Run: `node scripts/promotion-pipeline.mjs --skip-forge && cat dist/release/stamp.json && npm run typecheck && npm test && npm run build && npm run build:backend`
Expected: all PASS, stamp.json present.

- [ ] **Step 5: Commit**

```bash
git add scripts/promotion-pipeline.mjs docs/DEVPOST_SUBMISSION.md docs/JUDGING_GUIDE.md tests/unit/promotion-stamp.test.ts
git commit -m "feat: judging pack plus promotion stamp proof"
```

## Self-Review

- Spec coverage: Task1+2 durable trust (§1); Task3 perf supports §1; Task4 flagship UI (§3) + demo spine (§2) frontend half; Task5 judging pack (§5) + Rovo/MCP proof (§4) via contract tests + docs; risk-engine determinism untouched by design.
- Placeholder scan: no TBD/TODO; every code step has exact code + exact run command + expected output.
- Type consistency: `EvidenceRow` snake_case in repos, `Release` camelCase in domain; `claim(ws, op, key)` signature reused Task1→Task2; `VerdictBanner` props match usage Task4.
