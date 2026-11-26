# ShipSignal — Production Readiness

**Version:** 3.0.0  
**Date:** 2026-11-26  
**Environment:** Forge (Jira + Confluence, nodejs24.x)  
**Status:** PRODUCTION READY WITH DOCUMENTED LIMITATIONS

## Baseline

- `npm run typecheck`: PASS
- `npm test`: 41/41 PASS (13 files)
- `npm run build`: PASS → `static/frontend/`
- `npm run build:backend`: PASS
- `forge lint`: PASS
- `forge deploy`: PASS (v3.0.0, MAJOR_VERSION_RULE approved for Forge SQL)
- Jira + Confluence installations upgraded

## Architecture

- Frontend: React 18 + Vite Custom UI; hash routing for the Forge iframe.
- Backend entrypoints: UI resolver, Rovo actions, scheduled trigger, webtrigger.
- Persistence: Forge SQL (workspaces, releases, evidence_records, risk_assessments, audit_events, risk_status_updates, idempotency_keys, workspace_installations).
- Domain: typed evidence references, versioned deterministic risk policy, release brief.
- Workers: hourly reconciliation and manual sync; release-scoped Jira issue evidence, Confluence page evidence, Bitbucket PR evidence, Compass component evidence.
- Agents: Rovo agent + 9 MCP tools with explicit confirmation required for mutations.

## Fixes in the 2026-11-26 core pass

1. **Forge SQL enabled** — `modules.sql` added; repositories now have a real runtime.
2. **Correct Forge entrypoints** — actions, webtrigger, and scheduled trigger no longer share the UI resolver's `call.functionKey` contract.
3. **Tenant context** — workspace ID is derived from Forge `cloudId`/installation context; payload tenant IDs are ignored.
4. **Evidence-driven scoring** — review state, critical issues, documentation, freshness, and source coverage produce cited factors; `INCOMPLETE` when coverage is insufficient.
5. **Release brief** — deterministic verdict, confidence, checks, blockers, evidence gaps, and next actions.
6. **Structured evidence** — release-scoped issues, PR review state, page update times, source URLs, content-hash dedupe.
7. **Durable audit** — audit rows persist to Forge SQL and appear in the Audit view.
8. **Risk decisions** — `updateRiskStatus` writes `risk_status_updates` instead of corrupting `releases.status`; mutations require `confirm: true`.
9. **UI** — release brief, evidence explorer, risk register, integration health, honest dependency view, hash routing, no-login preview harness (`npm run dev:demo`).

## Security

- No secrets in repo (`.gitignore` covers `.env`).
- Manifest `external.fetch` restricted to Atlassian/Bitbucket hosts.
- Strict Zod schemas at resolver boundaries.
- Mutation actions require explicit confirmation and are audited.
- Forge context is authoritative for tenant scope; payload overrides are rejected.

## Known Limitations

1. **Compass API** — preview API behavior varies; failures are labelled partial rather than replaced with invented data.
2. **Sync-event idempotency** — the event marker is still process-local; evidence itself is deduplicated durably by content hash.
3. **Release provisioning** — releases are created from Jira versions during sync; there is no UI to create a release manually.
4. **Marketplace** — not listed; no Marketplace listing/review ticket exists yet.

Teamwork Graph per-object scopes require organization-admin approval. If the scopes are declined, the graph panel reports the specific query failure and the rest of ShipSignal continues with an explicit evidence gap.

## Promotion

```bash
npm run typecheck && npm test && npm run build && npm run build:backend
forge lint
forge deploy --approve MAJOR_VERSION_RULE
forge install --upgrade=all -s shipsignal.atlassian.net -p jira -e development --confirm-scopes
forge install --upgrade=all -s shipsignal.atlassian.net -p confluence -e development --confirm-scopes
```

## Evidence

- `dist/release/stamp.json` after promotion pipeline
- `static/frontend/` built artifact
- Forge deployment 3.0.0
