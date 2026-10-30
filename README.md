# ShipSignal

Evidence-Driven Release Intelligence & Operational Risk Platform for Atlassian Forge.

## Overview

ShipSignal consolidates release-related information from Jira, Bitbucket, Confluence and Compass into an explainable readiness assessment.

## Structure

- `manifest.yml` - Forge app manifest
- `src/frontend` - Custom UI (React + TypeScript)
- `src/backend` - Forge resolvers, services, repositories, integrations
- `src/domain` - Domain types, risk engine, schemas
- `src/database` - SQL migrations
- `tests` - Unit and integration tests

## Development

```bash
npm install
npm run typecheck
npm run build
npm run build:backend
npm test
```

## Deployment

Requires Atlassian Forge CLI and a valid Atlassian account.

```bash
forge login
forge deploy
forge install
```

## Notes

- Forge SQL is used for persistence.
- Integration adapters isolate vendor-specific APIs.
- Risk scoring is deterministic; AI only explains evidence.
EOF