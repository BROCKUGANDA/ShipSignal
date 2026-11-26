# ShipSignal Architecture

## Layers

- Frontend: React + TypeScript Custom UI (Vite), hash routing for the Forge iframe.
- Backend entrypoints: UI resolver, Rovo action dispatcher, webtrigger, scheduled trigger.
- Domain: evidence types, Zod schemas, versioned deterministic risk policy, release brief.
- Integrations: adapters for Jira, Bitbucket, Confluence, Compass, Teamwork Graph; each failure is isolated and labelled.
- Persistence: Forge SQL repositories (releases, evidence, risk assessments, audit, risk decisions, idempotency, workspace installations).
- Security: Forge-context tenant resolution, strict input validation, retry/backoff, circuit breaker, confirmation-gated mutations, durable audit.

## Data flow

1. Sync creates releases from Jira versions and structured evidence from Jira issues, Confluence pages, Bitbucket PRs, Compass components, and Teamwork Graph assigned work/pull requests.
2. Teamwork Graph calls use curated GraphQL fields through `api.asUser().requestTeamworkGraph`; no raw Cypher is sent. Results are stored with source `teamwork-graph` and shown in Integrations.
3. Evidence rows carry source platform, source ID, source URL, retrieval/update time, freshness, release linkage, and a content hash for dedupe.
4. The risk engine derives signals only from those records and emits cited factors.
5. The release brief adds verdict, confidence, checks, evidence gaps, and next actions.
6. UI, Rovo agent, and MCP tools read the same assessment service. Mutations are separate, confirmed, and audited.

## Key Principles

- Deterministic scoring separated from AI explanations.
- Vendor isolation via anti-corruption layer.
- Missing evidence produces `INCOMPLETE`/`INSUFFICIENT EVIDENCE`, never a fabricated READY.
- Forge context is authoritative; payload tenant IDs are not trusted.
- Durable audit and risk-decision records, not process-local claims.
