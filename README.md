<p align="center">
  <img src="public/logo.svg" alt="ShipSignal" width="360" />
</p>

<h1 align="center">ShipSignal</h1>

<p align="center"><strong>Evidence-driven release intelligence for Atlassian teams.</strong><br/>
It doesn't guess — it shows its work.</p>

<p align="center">
  <a href="https://shipsignal.atlassian.net">Live site</a> ·
  <a href="demo-video/demo-final.mp4">Demo video (3:04)</a> ·
  <a href="docs/JUDGING_GUIDE.md">Judging guide</a> ·
  <a href="docs/DEVPOST_SUBMISSION.md">Devpost submission</a>
</p>

---

## The problem

Engineering teams fail releases because information is fragmented. Jira says "ready", Bitbucket PRs are unreviewed, Confluence runbooks are stale, and Compass services are already degraded. No single surface answers: *Is this release ready, and how do we know?*

ShipSignal is a **real, deployed Atlassian Forge application** (not a mockup) that consolidates release signals from Jira, Confluence, Compass and Teamwork Graph into an explainable readiness assessment.

**Every risk cites:** observation · source platform + ID + URL · retrieval timestamp · why it matters · severity · remediation · whether human verification is required.

**Deterministic scoring, explainable AI:** the risk engine applies versioned rules; AI only summarises evidence — it never invents records or changes scores. Missing evidence → status **INCOMPLETE**, never READY.

## Try it in 5 minutes (judges)

1. **Live site:** [shipsignal.atlassian.net](https://shipsignal.atlassian.net)
2. **App ID:** `ari:cloud:ecosystem::app/6a5e2447-a58d-4cc4-8c56-12c73cb3b5a0` — installed in Jira + Confluence (development).
3. **Demo flow:** Jira project page → ShipSignal panel → release list → release detail (10 tabs) → dependency graph → risk register → Ask Rovo *"Why is release X at risk?"* → invoke MCP `get_release_readiness` → check Audit.
4. **Video:** `demo-video/demo-final.mp4` (3:04, narrated).
5. **Verify locally:** `npm run typecheck && npm run build && npm run build:backend && npm test`

Full walkthrough: [`docs/JUDGING_GUIDE.md`](docs/JUDGING_GUIDE.md). Bonus-prize map (Rovo / MCP / Teamwork Graph) is in [`docs/DEVPOST_SUBMISSION.md`](docs/DEVPOST_SUBMISSION.md).

## Key features

- **Workspace overview** — active releases, critical risks, open blockers, integration health.
- **Release detail (10 tabs)** — Summary, Readiness, Timeline, Issues, PRs, Dependencies, Evidence, Risks, Approvals, Audit history.
- **Dependency graph** — service topology, critical paths, missing/unverified relationships (never fabricated).
- **Risk register + evidence explorer** — provenance and freshness (`CURRENT` / `STALE` / `PARTIAL` / `UNKNOWN`).
- **Rovo agent** — evidence-grounded Q&A.
- **MCP server** — 9 typed tools: `get_release_readiness`, `get_release_blockers`, `get_project_health`, `get_change_impact`, `get_service_dependencies`, `get_risk_evidence`, `generate_release_report`, `create_remediation_task`, `update_risk_status`.
- **Sync worker** — hourly `scheduledTrigger` + webtrigger reconciliation, idempotent, partial results, audit trail.

## Architecture

```
Jira Project Page + Confluence Space Page
        │                │
        ▼                ▼
   React Custom UI (src/frontend)   Vite → static/frontend
        │
        ▼
Forge Resolver (src/backend/index.ts) → ReleaseService → RiskEngine (deterministic)
        │                    ▲
Adapters: Jira / Bitbucket / Confluence / Compass / Teamwork Graph  (IntegrationProvider)
        │
Forge SQL (repositories) ← Sync worker (workers/sync-worker.ts)
        │
Rovo Agent / MCP (rovo:agent, rovo:mcp)
```

- **Frontend:** React 18 Custom UI + Atlaskit (Vite).
- **Backend:** Forge resolvers, services, repositories, workers, security (retry + circuit breaker + audit + idempotency).
- **Domain:** `src/domain/` — types, Zod schemas, deterministic risk engine.
- **Security:** server-side authz, tenant isolation via Forge context, strict Zod inputs, least-privilege scopes, no secrets in repo.

Details: [`docs/architecture.md`](docs/architecture.md) · [`docs/rovo-mcp.md`](docs/rovo-mcp.md).

## Tech stack

Atlassian Forge (nodejs24.x) · TypeScript strict · React 18 + Atlaskit · Forge SQL · `@forge/api` / `@forge/resolver` / `@forge/bridge` · Zod · Vitest · Vite

## Project structure

```
manifest.yml              Forge app manifest
public/                   Favicon + logo + webmanifest (root copy)
src/frontend/public/      Same icons for Vite (copied to static/frontend on build)
src/frontend/             Custom UI (React + TypeScript)
src/backend/              Resolvers, services, repositories, integrations, workers, security
src/domain/               Types, schemas, risk engine
src/database/             SQL migrations (001, 002)
tests/                    Unit + contract tests (vitest)
docs/                     All documentation (start: docs/README.md)
demo-video/               HyperFrames narrated demo (demo-final.mp4)
assets/                   Source icon (assets/shipsignal-icon.svg)
static/                   Build output (git-ignored, served by Forge)
```

## Development

```bash
npm install
npm run typecheck
npm run build            # frontend → static/frontend
npm run build:backend    # Forge backend
npm test                 # vitest
forge lint
```

## Deployment (developer-run)

1. Create a Developer Space at https://developer.atlassian.com/console/myapps/
2. Register:

   ```bash
   forge register ShipSignal --personal
   # or: forge register ShipSignal -s <developer-space-id>
   ```

3. Deploy & install:

   ```bash
   forge deploy
   forge install --site shipsignal.atlassian.net --product jira
   forge install --site shipsignal.atlassian.net --product confluence
   ```

4. Local dev: `forge tunnel`

## Verification

| Check | Result |
|-------|--------|
| `npm run typecheck` | PASS |
| `npm test` | PASS (unit + contract) |
| `npm run build` | PASS → `static/frontend/` |
| `npm run build:backend` | PASS |

See [`docs/PRODUCTION_READINESS.md`](docs/PRODUCTION_READINESS.md) for known limitations (in-memory audit/idempotency → Forge SQL wiring P2, Compass stable API, release provisioning).

## Documentation

Start at [`docs/README.md`](docs/README.md) — architecture, Rovo/MCP reference, production readiness, judging guide, Devpost submission, video scripts.
