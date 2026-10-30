# ShipSignal Architecture

## Layers

- Frontend: React + TypeScript Custom UI (Vite)
- Backend: Forge resolvers (TypeScript)
- Domain: types, schemas, risk engine
- Integrations: adapters for Jira, Bitbucket, Confluence, Compass, Teamwork Graph
- Persistence: Forge SQL via @forge/sql repositories
- Security: error normalization, retry/backoff, circuit breaker, idempotency, audit

## Key Principles

- Deterministic risk scoring separated from AI explanations.
- Vendor isolation via anti-corruption layer.
- Partial results when integrations unavailable.
- Server-side authorization and tenant isolation.
EOF