# Rovo Agent & MCP Validation Guide

## Rovo Agent
Module: `rovo:agent` key `shipsignal-agent`.
Actions are referenced by their manifest keys:
- `get-release-readiness` -> action dispatcher -> `getReleaseReadiness`
- `get-release-blockers` -> `getReleaseBlockers`
- `get-project-health` -> `getProjectHealth`
- `get-change-impact` -> `getChangeImpact`
- `get-service-dependencies` -> `getServiceDependencies`
- `get-risk-evidence` -> `getRiskEvidence`
- `generate-release-report` -> `generateReleaseReport`

Actions execute through the dedicated `actions` Forge function. The UI resolver, actions, webtrigger, and scheduled trigger are separate entrypoints; they do not share the resolver `call.functionKey` contract.

## MCP Tools
Module: `rovo:mcp` key `shipsignal-mcp`.
Tools (manifest keys):
- `get-release-readiness`
- `get-release-blockers`
- `get-project-health`
- `get-change-impact`
- `get-service-dependencies`
- `get-risk-evidence`
- `generate-release-report`
- `create-remediation-task` (requires `confirm: true`)
- `update-risk-status` (requires `confirm: true` and a reason)

## Validation steps (after deploy)
1. Open a Jira project page -> ShipSignal panel loads.
2. Start at Overview; open a release.
3. Ask Rovo agent: "Why is release X at risk?" -> should cite evidence records.
4. Invoke MCP tool `get-release-readiness` with `{ releaseId }` -> returns assessment + brief.
5. Run `Integrations -> Run sync now` -> returns releases/evidence counts and warnings.
6. Open Audit -> durable audit rows.

## Sample expected response (getReleaseReadiness)
```json
{
  "success": true,
  "data": {
    "status": "BLOCKED",
    "riskScore": 80,
    "evidenceFreshness": "PARTIAL",
    "brief": {
      "verdict": "HOLD",
      "confidence": 64,
      "summary": "Hold the release. A highest-priority issue is unresolved.",
      "checks": [...],
      "evidenceGaps": ["1 evidence record needs re-verification."],
      "nextActions": [...],
      "coverage": [
        { "source": "jira", "count": 1, "current": 1, "stale": 0 }
      ],
      "policyVersion": "2026-11-26.1"
    },
    "factors": [...],
    "blockers": [...],
    "evidence": [...]
  }
}
```
