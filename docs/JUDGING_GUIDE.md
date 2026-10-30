# Codegeist 2026 — Judging Guide

## Install
1. App ID: `ari:cloud:ecosystem::app/6a5e2447-a58d-4cc4-8c56-12c73cb3b5a0`
2. Installed on `shipsignal.atlassian.net` (Jira + Confluence, development environment).

## Demo flow (under 5 min)
1. Open Jira project page → ShipSignal panel.
2. Show release list and a release detail with tabs.
3. Open dependency graph.
4. Open risk register.
5. Ask Rovo agent: "Why is release X at risk?"
6. Invoke MCP tool `get_release_readiness`.
7. Show audit trail.

## Bonus prizes targeted
- Best Rovo Agents: dedicated agent with evidence-backed actions.
- Best Atlassian MCP: 9 typed MCP tools.
- Best Teamwork Graph: adapter implemented (resilient fallback).

## Verification
- `npm run typecheck`, `npm run build`, `npm run build:backend`, `npm test` (16/16).