# Codegeist 2026 — Judging Guide

## Install
1. App ID: `ari:cloud:ecosystem::app/6a5e2447-a58d-4cc4-8c56-12c73cb3b5a0`
2. Installed on `shipsignal.atlassian.net` (Jira + Confluence, development environment).

## 3-minute spine (Grand-Prize path — narrate while clicking)

| Time | Screen | Say + show |
|------|--------|-----------|
| 0:00–0:25 | **Overview** | "One question: is this release ready, and how do we know?" Show release verdicts, blockers, confidence, source health. |
| 0:25–1:00 | **Release brief (2.4.0 — Payments settlement)** | Verdict `HOLD` first: confidence, coverage, `policyVersion 2026-11-26.1`, evidence gaps, next actions. Scoring is deterministic rules — AI never changes scores. |
| 1:00–1:30 | **Evidence** | Every risk cites observation + source platform/ID/URL + retrieval time. Filter by source/freshness; open one Jira/Confluence link to prove provenance. |
| 1:30–1:50 | **Risks** | Cited blockers with severity, remediation, and explicit human-verification flags. |
| 1:50–2:20 | **Rovo** | Ask: *"Why is release 2.4.0 at risk?"* → answer cites evidence records. Then MCP: `get-release-readiness { "releaseId": "<id>" }` → assessment + brief with evidence IDs. Mutations (`create-remediation-task`, `update-risk-status`) require `confirm: true` + leave a durable audit row. |
| 2:20–2:45 | **Integrations → Run sync now** | Release-scoped Jira/Confluence/Bitbucket/Compass sync with counts + warnings; partial results allowed, never silent. |
| 2:45–3:00 | **Activity & Audit** | Durable `SYNC_COMPLETED` + decision trail. Closer: "A missing source becomes an evidence gap — never invented data, never READY." |

Full click path (if you have >3 min): Overview → Release (`Brief` verdict) → Checks → Evidence → Risks → Assistant (Rovo prompt above) → Integrations (Run sync) → Activity (Audit). Empty states always route to Sync; `INCOMPLETE` never renders as `READY`.

## Demo flow (under 5 min)
1. Open Jira project page → ShipSignal panel.
2. Start at **Overview**: release verdicts, blockers, confidence, and source health.
3. Open release **2.4.0 — Payments settlement**: show `HOLD`, confidence, source coverage, evidence gaps, and next actions.
4. Open **Checks**: review readiness, critical issues, freshness, coverage, and documentation — each check cites its records.
5. Open **Evidence**: filter by source/freshness, open a Jira/Bitbucket/Confluence source link.
6. Open **Risks** and **Audit**: cited blockers and durable decision records.
7. Run **Integrations → Run sync now**: release-scoped Jira issues, Confluence pages, Bitbucket PRs, and Compass components.
8. Ask Rovo: *"Why is release 2.4.0 at risk?"* Invoke MCP `get-release-readiness`.
9. Show that a missing source becomes an evidence gap, never invented data.

## Bonus prizes targeted
- **Best Rovo Agents:** dedicated `rovo:agent` with evidence-backed read actions; mutations require explicit confirmation.
- **Best Atlassian MCP:** 9 typed tools via `rovo:mcp`.
- **Teamwork Graph:** adapter present; graph scopes are restricted for this app, so it reports an honest unhealthy/partial state. Not claimed as a working bonus integration.

## Verification
- `npm run typecheck`, `npm run build`, `npm run build:backend`, `npm test` (54/54)
- `forge lint`
- No-login preview: `npm run dev:demo`
