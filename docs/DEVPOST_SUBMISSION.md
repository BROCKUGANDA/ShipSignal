# ShipSignal — Devpost Submission (Atlassian Codegeist 2026)

**Project URL (after upload):** https://youtu.be/YOUR_VIDEO_ID  
**Live site:** https://shipsignal.atlassian.net  
**App ID:** `ari:cloud:ecosystem::app/6a5e2447-a58d-4cc4-8c56-12c73cb3b5a0`  
**Demo video:** 3:04, 1920×1080, narrated (see `demo-video/demo-final.mp4`)

---

## Tagline
Evidence-driven release intelligence for Atlassian teams. It doesn't guess — it shows its work.

## The Problem
Engineering teams fail releases because information is fragmented. Jira says "ready", Bitbucket PRs are unreviewed, Confluence runbooks are stale, and Compass services are already degraded. No single surface answers: *Is this release ready, and how do we know?*

## The Solution — ShipSignal
ShipSignal is a real, deployed Atlassian Forge application (not a mockup) that consolidates release signals from Jira, Confluence, Compass and Teamwork Graph into an explainable readiness assessment.

**Every risk cites:** observation, source platform + ID + URL, retrieval timestamp, why it matters, severity, remediation, and whether human verification is required. **Deterministic scoring, explainable AI:** the risk engine applies versioned rules; AI only summarises evidence — it never invents records or changes scores. Missing evidence → status **INCOMPLETE**, never READY.

### Key features
- Workspace overview: active releases, critical risks, open blockers, integration health
- Release detail with 10 tabs (Summary, Readiness, Timeline, Issues, PRs, Dependencies, Evidence, Risks, Approvals, Audit)
- Dependency graph: topology, critical paths, missing/unverified relationships (never fabricated)
- Risk register + evidence explorer with provenance and freshness (CURRENT/STALE/PARTIAL/UNKNOWN)
- Rovo Agent: evidence-grounded Q&A ("Why is 2.4.0 at risk?")
- MCP server: 9 typed tools (read-only independent; mutations gated)
- Sync worker: idempotent reconciliation, partial results, audit trail

### Bonus prizes targeted
- **Best Rovo Agents:** dedicated `rovo:agent` + `action` modules
- **Best Atlassian MCP:** `rovo:mcp` with `get_release_readiness`, `get_release_blockers`, `get_project_health`, `get_change_impact`, `get_service_dependencies`, `get_risk_evidence`, `generate_release_report`, `create_remediation_task`, `update_risk_status`
- **Best Teamwork Graph:** adapter with resilient fallback to authorised sources

## Tech Stack
Atlassian Forge (nodejs24.x) · TypeScript strict · React 18 Custom UI + Atlaskit · Forge SQL · `@forge/api` / `@forge/resolver` / `@forge/bridge` · Zod · Vitest · Vite

## Architecture
Modular: `src/frontend` (UI) · `src/backend` (resolvers, services, repositories, integrations, workers, security) · `src/domain` (types, schemas, deterministic risk engine). Vendor isolation via adapter anti-corruption layer. Security: server-side authz, tenant isolation, parameterised SQL, idempotency, exponential backoff + jitter, per-provider circuit breakers. Tests: 16 passing (risk engine, retry, circuit breaker, validation, idempotency, contracts, UI).

## How to Try It
1. Open https://shipsignal.atlassian.net → Jira project page → ShipSignal panel; Confluence space page → ShipSignal (`/shipsignal`).
2. Ask the Rovo agent: *"Why is release 2.4.0 at risk?"*
3. Invoke MCP tool `get_release_readiness` with a release ID.
4. Check Activity & Audit for the trail.

## Challenges
- Forge scope model: workspace vs site scopes can't mix (Bitbucket `read:repository:bitbucket` removed to lint-clean; adapter retained for a future workspace-scoped companion). Developer Space creation requires the web console. Forge SQL has no FK cascades — explicit cleanup.

## Accomplishments
- ✅ `forge lint` clean, deployed v2.2.0, installed + upgraded in Jira & Confluence
- ✅ 16/16 tests, typecheck + frontend/backend builds green
- ✅ 3:04 narrated demo video (HyperFrames + Kokoro TTS at natural pace, ffmpeg loudness-normalised to −14 LUFS)

## What's Next
Bitbucket workspace-scoped companion, real-time webhooks, notifications, deeper impact analysis.

---

## Submission checklist for Devpost
- [ ] Upload `demo-video/demo-final.mp4` to YouTube (public, < 5 min) and paste URL above
- [ ] Paste the sections above into Devpost fields (Story / Tech / Challenges / Accomplishments)
- [ ] Add screenshots: use frames in `demo-video/.hyperframes/artifacts/snapshots/`
- [ ] Add repo link + install link (Developer Console app page)
- [ ] Select categories: Apps for Software Teams + Best Rovo Agents / Best Atlassian MCP / Best Teamwork Graph
