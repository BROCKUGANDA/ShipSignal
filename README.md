<p align="center">
  <img src="public/logo.svg" alt="ShipSignal" width="360" />
</p>

<h1 align="center">ShipSignal</h1>

<p align="center"><strong>Evidence-driven release intelligence for Atlassian teams.</strong><br/>
It doesn't guess — it shows its work.</p>

<p align="center">
  <a href="https://shipsignal.atlassian.net">Live site</a> ·
  <a href="https://youtu.be/mXgh5iUUsQ0">Demo video (3:04)</a> ·
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
3. **Demo flow:** Jira project page → ShipSignal panel → overview → release brief → Checks and cited Evidence → run sync → ask Rovo *"Why is release X at risk?"* → invoke MCP `get-release-readiness` → check Audit.
4. **Video:** [https://youtu.be/mXgh5iUUsQ0](https://youtu.be/mXgh5iUUsQ0) (3:04, narrated; local file `demo-video/demo-final.mp4`).
5. **Verify locally:** `npm run typecheck && npm run build && npm run build:backend && npm test`
6. **No-login UI preview:** `npm run dev:demo` (real UI with deterministic sample evidence; explicitly labelled as preview data).

Full walkthrough: [`docs/JUDGING_GUIDE.md`](docs/JUDGING_GUIDE.md). Bonus-prize map (Rovo / MCP) is in [`docs/DEVPOST_SUBMISSION.md`](docs/DEVPOST_SUBMISSION.md).

## Key features

- **Release brief** — `SHIP`, `SHIP WITH GUARDRAILS`, `HOLD`, or `INSUFFICIENT EVIDENCE` with deterministic score, confidence, source coverage, and next actions.
- **Evidence-backed checks** — review readiness, critical issues, documentation, freshness, and coverage, each linked to cited records.
- **Workspace overview** — release verdicts, blockers, confidence, and per-source context health.
- **Evidence explorer** — source platform, source ID, retrieval/update time, freshness, and direct source links where Atlassian exposes them.
- **Risk register** — release-level blockers with factor confidence and explicit human-verification flags.
- **Rovo agent** — evidence-grounded Q&A and read-only release actions.
- **MCP server** — 9 typed tools: `get-release-readiness`, `get-release-blockers`, `get-project-health`, `get-change-impact`, `get-service-dependencies`, `get-risk-evidence`, `generate-release-report`, `create-remediation-task`, `update-risk-status`. Mutations require explicit confirmation.
- **Sync worker** — hourly trigger + manual sync; release-scoped Jira issues, Confluence pages, Bitbucket PRs, and Compass components; content-hash deduplication; partial results and durable audit.
- **Durable audit** — readiness checks, sync reconciliation, and confirmed mutations are written to Forge SQL and surfaced in the Audit view.

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

- **Frontend:** React 18 Custom UI (Vite), hash routing for the Forge iframe, accessible status/tab surfaces.
- **Backend:** split Forge entrypoints for the UI resolver, Rovo actions, scheduled trigger, and webtrigger; services, repositories, workers, security (retry, circuit breaker, durable audit).
- **Domain:** `src/domain/` — typed evidence references, deterministic risk policy, release brief.
- **Security:** server-side authz, tenant isolation from Forge `cloudId`/installation context (payload tenant IDs are never trusted), strict Zod inputs, least-privilege scopes, no secrets in repo.
- **Teamwork Graph:** consumes curated GraphQL queries (`atlassianUserAssignedJiraWorkItems`, `atlassianUserPullRequests`) through `api.asUser().requestTeamworkGraph`, then stores the results as cited evidence and shows them in Integrations. The three per-object scopes must be granted by an organization admin at install time.

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
| `npm test` | PASS (41 tests across 13 files) |
| `npm run build` | PASS → `static/frontend/` |
| `npm run build:backend` | PASS |
| `forge lint` | PASS |

See [`docs/PRODUCTION_READINESS.md`](docs/PRODUCTION_READINESS.md) for remaining limitations (Compass API preview, in-memory sync-event idempotency, release provisioning).

## Documentation

Start at [`docs/README.md`](docs/README.md) — architecture, Rovo/MCP reference, production readiness, judging guide, Devpost submission, video scripts.
