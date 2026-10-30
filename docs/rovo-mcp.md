# Rovo Agent & MCP Validation Guide

## Rovo Agent
Module: `rovo:agent` key `shipsignal-agent`.
Actions:
- `get-release-readiness` -> resolver `getReleaseReadiness`
- `get-release-blockers` -> resolver `getReleaseBlockers`

## MCP Tools
Module: `rovo:mcp` key `shipsignal-mcp`.
Tools:
- `get_release_readiness`
- `get_release_blockers`
- `get_project_health`
- `get_change_impact`
- `get_service_dependencies`
- `get_risk_evidence`
- `generate_release_report`
- `create_remediation_task`
- `update_risk_status`

## Validation steps (after deploy)
1. Open a Jira project page -> ShipSignal panel loads.
2. Ask Rovo agent: "Why is release X at risk?" -> should cite evidence records.
3. Invoke MCP tool `get_release_readiness` with `{ releaseId }` -> returns assessment JSON.
4. Invoke `syncProject` -> returns sources/warnings.
5. Verify audit events recorded.

## Sample expected response (getReleaseReadiness)
```json
{
  "success": true,
  "data": {
    "id": "ra-...",
    "releaseId": "r1",
    "status": "AT_RISK",
    "riskScore": 25,
    "evidenceFreshness": "CURRENT",
    "factors": [...],
    "blockers": [...],
    "recommendations": [...],
    "warnings": []
  }
}
```