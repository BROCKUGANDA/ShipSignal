# Codegeist 2026 — Judging Guide

## Install
1. App ID: `ari:cloud:ecosystem::app/6a5e2447-a58d-4cc4-8c56-12c73cb3b5a0`
2. Installed on `shipsignal.atlassian.net` (Jira + Confluence, development environment).

## Demo flow (under 5 min)
1. Open Jira project page → ShipSignal panel.
2. Start at **Overview**: release verdicts, blockers, confidence, and source health.
3. Open release **2.4.0 — Payments settlement**: show `HOLD`, confidence, source coverage, evidence gaps, and next actions.
4. Open **Checks**: review readiness, critical issues, freshness, coverage, and documentation — each check cites its records.
5. Open **Evidence**: filter by source/freshness, open a Jira/Bitbucket/Confluence source link.
6. Open **Risks** and **Audit**: cited blockers and durable decision records.
7. Run **Integrations → Run sync now**: release-scoped Jira issues, Confluence pages, Bitbucket PRs, Compass components, and Teamwork Graph assigned work/PRs. The Teamwork Graph panel shows the live curated-query result.
8. Ask Rovo: *"Why is release 2.4.0 at risk?"* Invoke MCP `get-release-readiness`.
9. Show that a missing source becomes an evidence gap, never invented data.

## Bonus prizes targeted
- **Best Rovo Agents:** dedicated `rovo:agent` with evidence-backed read actions; mutations require explicit confirmation.
- **Best Atlassian MCP:** 9 typed tools via `rovo:mcp`.
- **Teamwork Graph:** consumes the supported curated GraphQL queries for the current user's assigned Jira work and pull requests, stores that context as cited evidence, and renders it in Integrations. Scopes are per object type and require organization-admin consent.

## Verification
- `npm run typecheck`, `npm run build`, `npm run build:backend`, `npm test` (41/41)
- `forge lint`
- No-login preview: `npm run dev:demo`
