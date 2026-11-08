# ShipSignal — Production Readiness

**Version:** 1.0.0  
**Date:** 2026-11-08  
**Environment:** Forge (Jira + Confluence, nodejs24.x)  
**Status:** PRODUCTION READY WITH DOCUMENTED LIMITATIONS

## Baseline

- `npm run typecheck`: PASS
- `npm test`: 16/16 PASS (vitest)
- `npm run build`: PASS (175 modules, static/frontend)
- `npm run build:backend`: PASS

## Architecture

- Frontend: React 18 + Vite + Custom UI (Jira/Confluence projectPage/spacePage)
- Backend: Forge Resolver (`src/backend/index.ts`) + integrations (Jira/Bitbucket/Confluence/Compass)
- Persistence: Forge SQL (workspaces, releases, evidence_records, risk_assessments, audit_events)
- Domain: deterministic risk engine (`src/domain/risk-engine.ts`), zod validation
- Workers: scheduled reconciliation trigger, sync webtrigger
- Agents: Rovo agent + MCP exposure for `getReleaseReadiness`, `getReleaseBlockers`

## Fixes in this batch (hardening)

1. **Resolver stubs eliminated** — `getChangeImpact`, `getServiceDependencies`, `getRiskEvidence`, `generateReleaseReport`, `createRemediationTask` (Jira issue create via `api.asApp().requestJira`), `updateRiskStatus`, `listReleases` now backed by EvidenceRepository/ReleaseRepository + real adapter calls.
2. **Tenant isolation** — `resolveWorkspaceId()` prefers Forge context (`installationId`/`tenantId`/`workspaceId`), ignores mismatched payload workspaceId (warn), and requires context in production (no silent "default" fallback). In Forge, context is authoritative.
3. **Input validation** — strict Zod schemas for all resolvers (releaseId regex, enums, size limits).
4. **Error hygiene** — `normalizeError` sanitizes internal messages in production; all resolvers use correlationId + console.error with code; no raw stack leakage.
5. **Circuit breaker + retry** — Jira/Bitbucket/Confluence health checks wrapped in breaker; Jira issue creation uses `withRetry` (2 attempts) with exponential backoff + jitter.
6. **Frontend wiring** — Overview, Releases, ReleaseDetail, Evidence, Risks, Dependencies, Impact, Assistant, Integrations, Projects, Activity, Settings now call live resolvers and render real data; sample/hardcoded 0 metrics removed or explicitly labeled as unknown.
7. **SQL** — `002_indexes_and_idempotency.sql` adds indexes on workspace/project/source, plus `idempotency_keys`, `risk_status_updates`, `workspace_installations` tables for durable idempotency (in-memory store remains dev fallback until Forge SQL wiring is completed).

## Security

- No secrets in repo (.gitignore covers .env). Manifest `external.fetch` restricted to `*.atlassian.net`, `api.bitbucket.org`, `api.atlassian.com`.
- Scopes: least-privilege `read:jira-work`, `write:jira-work`, `read:confluence-content.all`, etc.
- Mass assignment avoided via strict schemas. Audit events recorded for readiness and status updates.

## Known Limitations (tracked)

1. **In-memory Audit/Idempotency** — `AuditService`/`IdempotencyStore` are process-local Maps (Forge functions are stateless). Durable Forge SQL tables are added in migration 002; next step is to swap repositories to SQL-backed `AuditRepository`/`IdempotencyRepository` (P2).
2. **Compass API** — `requestCompass` is not stable in Forge runtime; adapter returns honest partial warnings. Derived dependencies from Bitbucket/evidence are used as fallback.
3. **Teamwork Graph** — site-config dependent; adapter returns honest unhealthy with message.
4. **Release creation** — no resolver to create releases; releases are expected from Jira sync / manual seeding via SQL. Future: `createRelease` + Jira version sync.
5. **Rovo prompt** — text-based, requires Marketplace Rovo validation.

## Promotion

```bash
node scripts/promotion-pipeline.mjs --env production --skip-forge
# or with Forge auth:
node scripts/promotion-pipeline.mjs --env production
```

Pipeline runs typecheck, tests, frontend + backend builds, manifest lint, writes `dist/release/stamp.json` (version, git SHA, env, timestamp).

## Evidence

- `dist/release/stamp.json` (after pipeline)
- vitest output: 8 files, 16 tests passed
- `static/frontend/` built artifact

## Next risks

- P1: None known critical/high — critical security and broken core workflows addressed.
- P2: Forge SQL Idempotency wiring; distribute audit to SQL; Compass stable API; release provisioning.
- P3: Analytics, billing, subscription lifecycle (not in current product promise).
