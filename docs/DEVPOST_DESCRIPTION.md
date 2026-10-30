# ShipSignal — Devpost Description

## Tagline
Evidence-driven release intelligence for Atlassian teams.

## The problem
Engineering teams make release decisions using fragmented information across Jira, Bitbucket, Confluence, and Compass. A release can look complete in Jira while PRs are unreviewed, dependencies unresolved, or services degraded.

## The solution
ShipSignal consolidates release-related signals into an explainable, continuously updated readiness assessment. Every risk cites the underlying evidence, its source, and a recommended remediation. AI explains; it never invents evidence or changes scores.

## Key features
- Release readiness assessment with deterministic risk scoring.
- Evidence explorer with provenance and freshness.
- Dependency graph visualization.
- Risk register with severity and ownership.
- Rovo agent for Q&A over releases.
- MCP tools for programmatic access.
- Sync worker reconciling Jira/Confluence/Compass.

## Tech stack
Atlassian Forge, TypeScript, React, Forge SQL, @forge/api, @forge/resolver, Zod, Vitest.

## How it works
1. Install in Jira + Confluence.
2. Sync pulls issues, PRs, docs, service context.
3. Risk engine scores each release deterministically.
4. Rovo agent and MCP tools expose insights.

## Challenges
- Forge runtime limits; isolated vendor adapters.
- Tenant isolation and idempotent sync.
- Mixing workspace and site scopes (resolved by scoping).

## Accomplishments
- Deployed and installed on a live Atlassian site.
- 16 passing tests covering risk engine, retry, circuit breaker, validation, contracts.
- Explainable, evidence-backed assessments.

## What's next
- Bitbucket integration as workspace-scoped companion.
- Real-time webhooks and notifications.
- Advanced dependency impact analysis.