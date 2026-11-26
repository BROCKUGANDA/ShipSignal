# ShipSignal — Devpost Submission (Atlassian Codegeist 2026)

**Project URL:** https://youtu.be/mXgh5iUUsQ0  
**Live site:** https://shipsignal.atlassian.net  
**App ID:** `ari:cloud:ecosystem::app/6a5e2447-a58d-4cc4-8c56-12c73cb3b5a0`  
**Demo video:** 3:04, 1920×1080, narrated (see `demo-video/demo-final.mp4`)  
**Install link for judges:** From Developer Console → ShipSignal → *Start sharing your app* → copy the share link here before submitting (Devpost requires this).

> ⏳ **INSTALL LINK PLACEHOLDER — PASTE BEFORE SUBMITTING:**
> `[paste the Developer Console → Start sharing your app → share link here]`
> Until pasted, judges can reproduce on the live install: `https://shipsignal.atlassian.net` (Jira project page → ShipSignal panel; Confluence space page → ShipSignal `/shipsignal`).

---

## Tagline
Evidence-driven release intelligence for Atlassian teams. It doesn't guess — it shows its work.

## The Problem
Engineering teams fail releases because information is fragmented. Jira says "ready", Bitbucket PRs are unreviewed, Confluence runbooks are stale, and Compass services are already degraded. No single surface answers: *Is this release ready, and how do we know?*

## The Solution — ShipSignal
ShipSignal is a real, deployed Atlassian Forge application (not a mockup) that consolidates release signals from Jira, Confluence, Compass and Teamwork Graph into an explainable readiness assessment.

**Every risk cites:** observation, source platform + ID + URL, retrieval timestamp, why it matters, severity, remediation, and whether human verification is required. **Deterministic scoring, explainable AI:** the risk engine applies versioned rules; AI only summarises evidence — it never invents records or changes scores. Missing evidence → status **INCOMPLETE**, never READY.

### Key features
- Workspace overview: release verdicts, blockers, confidence, source health
- Release brief with deterministic verdict (`SHIP`, `SHIP WITH GUARDRAILS`, `HOLD`, `INSUFFICIENT EVIDENCE`), confidence, checks, evidence gaps, and next actions
- Evidence explorer with source ID, source URL, retrieval/update time, freshness, and filters
- Risk register with factor confidence and explicit human-verification flags
- Rovo Agent: evidence-grounded Q&A ("Why is 2.4.0 at risk?")
- MCP server: 9 typed tools; mutations require explicit confirmation
- Sync worker: release-scoped Jira issues, Confluence pages, Bitbucket PRs, Compass components; content-hash dedupe; partial results; durable audit

### Bonus prizes targeted
- **Best Rovo Agents:** dedicated `rovo:agent` (`shipsignal-agent`) + evidence-backed actions; read-only actions are exposed to the agent, mutations require confirmation.
- **Best Atlassian MCP:** `rovo:mcp` (`shipsignal-mcp`) with `get-release-readiness`, `get-release-blockers`, `get-project-health`, `get-change-impact`, `get-service-dependencies`, `get-risk-evidence`, `generate-release-report`, `create-remediation-task`, `update-risk-status`.
- **Teamwork Graph:** adapter included with honest fallback when graph scopes are unavailable; not claimed as a working bonus integration for this listing.
- **Runs on Atlassian:** ShipSignal runs entirely on Atlassian infrastructure — Forge compute (`nodejs24.x`) + Forge SQL persistence. No external servers, no data leaving the Atlassian cloud; when a source is unreachable the brief records an evidence gap instead of inventing data.

## Testing instructions for judges (clean-site reproduce)
Prerequisites: a Jira project and a Confluence space on the install site.
1. Install via the share link above (accept least-privilege scopes — no new scopes added; see `manifest.yml`).
2. Open the Jira project page → ShipSignal panel; open the Confluence space page → ShipSignal (`/shipsignal`).
3. Go to **Integrations → Run sync now** — expect release-scoped Jira issues, Confluence pages, Bitbucket PRs, and Compass components with counts and warnings (partial results allowed; failures surface as warnings, never silent).
4. Open **Overview** → pick release **2.4.0 — Payments settlement**: expect verdict `HOLD`, confidence, source coverage, evidence gaps, next actions.
5. Open **Evidence**: each record shows source platform + ID + URL + retrieval time + freshness; open one source link to verify it resolves.
6. Ask the Rovo agent: *"Why is release 2.4.0 at risk?"* — expect an answer citing evidence records (observation + source + why it matters), never invented facts.
7. Invoke MCP tool `get-release-readiness` with `{ "releaseId": "<id>" }` — expect assessment + brief with `verdict`, `confidence`, `policyVersion: "2026-11-26.1"`.
8. Open **Activity & Audit** — expect a durable `SYNC_COMPLETED` row plus decision records for any mutation (mutations require `confirm: true`).
9. Negative check: revoke or remove one source → the brief must show an evidence gap / `INCOMPLETE`, never `READY`.

## How this meets the Forge requirement
ShipSignal is a deployed Forge app (`nodejs24.x`) with Jira project-page and Confluence space-page Custom UI, a UI resolver, a Rovo agent, a Rovo MCP server, scheduled reconciliation, a webtrigger, Forge SQL persistence, and least-privilege Atlassian scopes. It uses Jira, Confluence, Compass, and Bitbucket context; when a source is unavailable, the readiness brief records an evidence gap rather than inventing the missing fact.

## Tech Stack
Atlassian Forge (nodejs24.x) · TypeScript strict · React 18 Custom UI + Atlaskit · Forge SQL · `@forge/api` / `@forge/resolver` / `@forge/bridge` · Zod · Vitest · Vite

## Architecture
Modular: `src/frontend` (UI) · `src/backend` (resolvers, actions, triggers, services, repositories, integrations, workers, security) · `src/domain` (types, schemas, deterministic risk engine). Vendor isolation via adapter anti-corruption layer. Security: authoritative Forge tenant context, strict Zod inputs, parameterised SQL, content-hash evidence dedupe, exponential backoff + jitter, per-provider circuit breakers. Tests: 54 passing across 18 files (risk policy, evidence brief, retry, circuit breaker, validation, tenancy, contracts, manifest coverage, flagship UI, batch evidence, promotion stamp).

## How to Try It
1. Open https://shipsignal.atlassian.net → Jira project page → ShipSignal panel; Confluence space page → ShipSignal (`/shipsignal`).
2. Ask the Rovo agent: *"Why is release 2.4.0 at risk?"*
3. Invoke MCP tool `get_release_readiness` with a release ID.
4. Check Activity & Audit for the trail.

## Challenges
- Forge scope model: workspace vs site scopes can't mix (Bitbucket `read:repository:bitbucket` removed to lint-clean; adapter retained for a future workspace-scoped companion). Developer Space creation requires the web console. Forge SQL has no FK cascades — explicit cleanup.

## Accomplishments
- ✅ `forge lint` clean, deployed v3.0.0 with Forge SQL, installed + upgraded in Jira & Confluence
- ✅ 54/54 tests, typecheck + frontend/backend builds green
- ✅ Release brief with cited evidence, confidence, evidence gaps, and next actions
- ✅ Durable audit, risk-decision records, and confirmation-gated mutations
- ✅ 3:04 narrated demo video (HyperFrames + Kokoro TTS at natural pace, ffmpeg loudness-normalised to −14 LUFS) — https://youtu.be/mXgh5iUUsQ0

## What's Next
Bitbucket workspace-scoped companion, real-time webhooks, notifications, deeper impact analysis.

---

## Submission checklist for Devpost
- [x] Upload `demo-video/demo-final.mp4` to YouTube (public, < 5 min) — https://youtu.be/mXgh5iUUsQ0
- [ ] Paste the sections above into Devpost fields (Story / Tech / Challenges / Accomplishments)
- [ ] Add screenshots: use frames in `demo-video/.hyperframes/artifacts/snapshots/`
- [ ] Add the *Start sharing your app* install link from Developer Console (see top of this file)
- [ ] Select category: **Apps for Software Teams**; bonus prizes: **Best Rovo Agents**, **Best Atlassian MCP**, **Best Teamwork Graph** (do NOT select Marketplace — not published)
- [ ] Run sync once on the live site (Integrations → Run sync now) so releases populate before judging
