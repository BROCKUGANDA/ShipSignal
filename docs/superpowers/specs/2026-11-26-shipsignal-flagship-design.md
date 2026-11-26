# ShipSignal Flagship + Production Design (Hybrid C)

Date: 2026-11-26
Baseline verified: `typecheck` PASS, 41/41 tests PASS (13 files).
Rubric: Codegeist Stage2 equal-weight — Quality of Idea / Implementation / Potential Impact + install link + <5min video + Forge modules. Bonuses: Rovo, MCP, Teamwork Graph, Runs-on-Atlassian.

## 1. Trust core (conservative, additive)
- Add SQL-backed `AuditRepository` + `IdempotencyRepository` behind existing `AuditService`/`IdempotencyStore` interfaces; keep in-memory as fallback for local/dev only. No resolver signature changes.
- Fix `listReleases` N+1: single batched evidence fetch + in-memory assessment, cap 25 enriched, preserve `INSUFFICIENT_EVIDENCE` semantics.
- Keep `resolveWorkspaceId` strict (context-authoritative, payload never trusted). Webtrigger 503 path unchanged.
- Add `node scripts/promotion-pipeline.mjs --skip-forge` proof → `dist/release/stamp.json` (version, git SHA, env, timestamp). Docs counts reconciled to 41.
- Contract tests for all 9 MCP tool shapes + manifest keys frozen (no renames).

## 2. Demo spine (Grand Prize path, <3min)
Overview → Release (`Brief` verdict first) → Evidence (provenance: platform+ID+URL+retrievedAt) → Risks (blockers + human-verify flags) → Assistant (Rovo: "Why is 2.4.0 at risk?") → Integrations (Run sync) → Activity (Audit trail). Empty states always route to Sync; INCOMPLETE never renders as READY.

## 3. Flagship UI (additive CSS/tokens only)
- Verdict hierarchy: SHIP / SHIP_WITH_GUARDRAILS / HOLD / INSUFFICIENT_EVIDENCE with confidence + coverage + policy version visible.
- Freshness chips CURRENT/STALE/PARTIAL/UNKNOWN, source deep links (Jira `/browse/`, Confluence), copy-brief button.
- Tables get loading/error/empty states, `StatusPill` consistency, keyboard focus + aria for tabs/status. No router or manifest changes.

## 4. Rovo / MCP proof (deterministic)
- Risk engine stays sole scorer (v `2026-11-26.1`); AI summarises only. `create-remediation-task` + `update-risk-status` keep `confirm:true` gate + durable audit.
- Demo prompts with expected cited outputs; `get-release-readiness`, `get-risk-evidence`, `generate-release-report` return evidence IDs.
- TWG/Compass honest partial-state preserved, surfaced as coverage gap (lowers confidence, never fabricates).

## 5. Judging pack
- Clean-site install test (Jira project page + Confluence space page), testing instructions, bonus writeups (Rovo/MCP/TWG/Runs-on), screenshots, video shot list <5min reusing `demo-video/demo-final.mp4` structure.
- No manifest scope additions; Bitbucket companion stays future work (YAGNI).

## Non-goals
No new scopes, no resource renames, no billing/analytics, no Compass API rewrite, no Bitbucket workspace companion.
