// Shape validation smoke harness for deployed MCP tools.
// Usage (after deploy): node scripts/validate-shapes.mjs <baseUrl> <token>
// This script documents expected shapes; runtime invocation requires Forge auth.
console.log("ShipSignal MCP smoke harness");
console.log("Expected tools: get_release_readiness, get_release_blockers, get_project_health, get_change_impact, get_service_dependencies, get_risk_evidence, generate_release_report, create_remediation_task, update_risk_status");
console.log("Invoke each via Rovo/MCP and verify response.success === true and data matches documented schema in docs/rovo-mcp.md.");
process.exit(0);