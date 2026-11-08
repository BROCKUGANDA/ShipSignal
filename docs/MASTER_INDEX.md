# MASTER INDEX — ShipSignal (AI Azimara ecosystem slice)

Repository: ShipSignal — Forge Evidence-Driven Release Intelligence
Stack: Node 24, TypeScript, React 18, Vite, Forge (Resolver/SQL), vitest, zod

## Repositories inventoried

| Repo | Path | Branch | Commit | Status |
|------|------|--------|--------|--------|
| ShipSignal | C:/Users/HP/Desktop/ShipSignal | master | f625094 + hardening batch | PASS |

No remote configured; `git remote -v` empty. Other AI Azimara repos not present on this workstation in this session — scope is ShipSignal only. To extend: clone siblings and rerun WAVE 1 inventory.

## System architecture

- Jira Project Page + Confluence Space Page → React SPA (Custom UI)
- Forge Resolver → ReleaseService → RiskEngine (deterministic)
- Adapters: Jira/Bitbucket/Confluence/Compass behind `IntegrationProvider`
- Sync worker (hourly schedule-trigger + webtrigger) → EvidenceRepository (Forge SQL)
- Rovo Agent / MCP → getReleaseReadiness, getReleaseBlockers

## API catalog (resolvers)

- getReleaseReadiness (strict) → RiskAssessment + optional evidence
- getReleaseBlockers → RiskFactor[]
- getProjectHealth → per-service health (breaker-wrapped)
- getChangeImpact → change + related evidence
- getServiceDependencies → compass + derived
- getRiskEvidence → evidence list
- generateReleaseReport → summary/markdown/json
- createRemediationTask → Jira issue
- updateRiskStatus → audit + status
- syncProject → SyncResult
- handleSyncEvent → idempotent handler
- listReleases → Release[]

## Database catalog

- 001_initial.sql: workspaces, releases, evidence_records, risk_assessments, audit_events
- 002_indexes_and_idempotency.sql: indexes + idempotency_keys, risk_status_updates, workspace_installations

## Security inventory

- Strict Zod inputs, workspace isolation, sanitized errors, least-privilege scopes, no secrets in repo, audit trail

## Test coverage

16/16 vitest pass (unit + contract). Frontend pages now wire resolvers; no e2e harness for Forge Custom UI in repo (Forge tunnel required).

## Technical debt

- In-memory audit/idempotency → migrate to SQL repos (P2)
- Compass stable API
- Release provisioning
- Billing/analytics (future product)

## Promotion pipeline

`scripts/promotion-pipeline.mjs --env production`

## Docs

- docs/PRODUCTION_READINESS.md
- docs/architecture.md
- docs/rovo-mcp.md
