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

## Deployment (user-run)

1. Create a Developer Space at https://developer.atlassian.com/console/myapps/
2. Register the app:
   ```
   forge register ShipSignal --personal
   # or with a developer space:
   forge register ShipSignal -s <developer-space-id>
   ```
   This populates `app.id` in manifest.yml.
3. Set environment and deploy:
   ```
   forge deploy
   forge install --site shipsignal.atlassian.net --product jira
   forge install --site shipsignal.atlassian.net --product confluence
   ```
4. For local development: `forge tunnel`

## Notes

- Forge SQL is used for persistence.
- Integration adapters isolate vendor-specific APIs.
- Risk scoring is deterministic; AI only explains evidence.
EOF