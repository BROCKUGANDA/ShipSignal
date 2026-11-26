const now = "2026-11-26T09:00:00.000Z";

const evidence = [
  {
    id: "ev-jira-SHIP-412",
    sourcePlatform: "jira",
    sourceId: "SHIP-412",
    sourceUrl: "https://shipsignal.atlassian.net/browse/SHIP-412",
    evidenceType: "issue_snapshot",
    title: "SHIP-412: Settlement retry can double-release funds",
    summary: "status=In Progress; priority=Highest; type=Bug; updated=2026-11-26T08:12:00.000Z",
    retrievedAt: now,
    sourceUpdatedAt: "2026-11-26T08:12:00.000Z",
    freshness: "CURRENT",
  },
  {
    id: "ev-bb-42",
    sourcePlatform: "bitbucket",
    sourceId: "payments-api#42",
    sourceUrl: "https://bitbucket.org/shipsignal/payments-api/pull-requests/42",
    evidenceType: "pull_request_snapshot",
    title: "payments-api #42: Harden settlement retry path",
    summary: "state=OPEN; review=draft; draft=true; approvals=0/2; updated=2026-11-26T07:40:00.000Z",
    retrievedAt: now,
    sourceUpdatedAt: "2026-11-26T07:40:00.000Z",
    freshness: "CURRENT",
  },
  {
    id: "ev-cf-884",
    sourcePlatform: "confluence",
    sourceId: "884211",
    sourceUrl: "https://shipsignal.atlassian.net/wiki/spaces/SHIP/pages/884211/Payments+runbook",
    evidenceType: "documentation_snapshot",
    title: "Confluence: Payments release runbook",
    summary: "page=Payments release runbook; version=12; updated=2026-11-19T15:20:00.000Z",
    retrievedAt: now,
    sourceUpdatedAt: "2026-11-19T15:20:00.000Z",
    freshness: "STALE",
  },
  {
    id: "ev-compass-payments",
    sourcePlatform: "compass",
    sourceId: "component-payments-api",
    sourceUrl: "https://shipsignal.atlassian.net/compass/component/component-payments-api",
    evidenceType: "service_snapshot",
    title: "Compass: payments-api",
    summary: "component=payments-api",
    retrievedAt: now,
    sourceUpdatedAt: "2026-11-25T18:00:00.000Z",
    freshness: "CURRENT",
  },
];

const factors = [
  {
    id: "rf-critical-issues-rel-payments-2-4-0",
    releaseId: "rel-payments-2-4-0",
    category: "CRITICAL_ISSUES",
    severity: "CRITICAL",
    description: "Unresolved critical or blocker-priority issues are linked to this release.",
    evidenceIds: ["ev-jira-SHIP-412"],
    confidence: "VERIFIED",
    recommendation: "Resolve SHIP-412 or record an owned, explicit exception before release.",
  },
  {
    id: "rf-unreviewed-changes-rel-payments-2-4-0",
    releaseId: "rel-payments-2-4-0",
    category: "UNREVIEWED_CHANGES",
    severity: "HIGH",
    description: "At least one pull request is draft, unapproved, or has requested changes.",
    evidenceIds: ["ev-bb-42"],
    confidence: "VERIFIED",
    recommendation: "Move PR #42 out of draft and complete two approvals.",
  },
  {
    id: "rf-stale-evidence-rel-payments-2-4-0",
    releaseId: "rel-payments-2-4-0",
    category: "STALE_EVIDENCE",
    severity: "MEDIUM",
    description: "The linked runbook is older than 7 days.",
    evidenceIds: ["ev-cf-884"],
    confidence: "VERIFIED",
    recommendation: "Verify the rollback steps and re-publish the runbook.",
  },
];

const readiness = {
  id: "ra-rel-payments-2-4-0-2026-11-26.1",
  releaseId: "rel-payments-2-4-0",
  status: "BLOCKED",
  riskScore: 80,
  assessedAt: now,
  evidenceFreshness: "PARTIAL",
  factors,
  blockers: factors.slice(0, 2),
  recommendations: factors.map((factor) => factor.recommendation),
  warnings: ["Some evidence is stale; re-verify the cited records."],
  evidence,
  brief: {
    releaseId: "rel-payments-2-4-0",
    version: "2.4.0",
    title: "Payments settlement",
    verdict: "HOLD",
    status: "BLOCKED",
    riskScore: 80,
    confidence: 64,
    summary: "Hold the release. A highest-priority settlement bug is open while the fix is still a draft pull request.",
    checks: [
      { key: "evidence", label: "Evidence coverage", status: "PASS", detail: "4 records across 4 sources.", evidenceIds: evidence.map((item) => item.id) },
      { key: "freshness", label: "Evidence freshness", status: "WARN", detail: "3/4 records are current.", evidenceIds: ["ev-cf-884"] },
      { key: "review", label: "Review readiness", status: "FAIL", detail: "PR #42 is still a draft with zero approvals.", evidenceIds: ["ev-bb-42"] },
      { key: "issues", label: "Critical issues", status: "FAIL", detail: "SHIP-412 is Highest priority and unresolved.", evidenceIds: ["ev-jira-SHIP-412"] },
      { key: "docs", label: "Runbook and release notes", status: "PASS", detail: "A runbook exists but needs re-verification.", evidenceIds: ["ev-cf-884"] },
    ],
    blockers: factors.slice(0, 2),
    evidenceGaps: ["1 evidence record needs re-verification."],
    nextActions: [
      "Resolve SHIP-412 or record an owned exception.",
      "Move PR #42 out of draft and complete two approvals.",
      "Re-verify the payments runbook before the release window.",
    ],
    coverage: [
      { source: "jira", count: 1, current: 1, stale: 0 },
      { source: "bitbucket", count: 1, current: 1, stale: 0 },
      { source: "confluence", count: 1, current: 0, stale: 1 },
      { source: "compass", count: 1, current: 1, stale: 0 },
    ],
    policyVersion: "2026-11-26.1",
    assessedAt: now,
  },
};

const releases = [
  { id: "rel-payments-2-4-0", version: "2.4.0", title: "Payments settlement", status: "ACTIVE", targetDate: "2026-11-28", verdict: "HOLD", riskScore: 80, confidence: 64, blockerCount: 2 },
  { id: "rel-identity-1-9-2", version: "1.9.2", title: "SSO hardening", status: "ACTIVE", targetDate: "2026-12-02", verdict: "SHIP_WITH_GUARDRAILS", riskScore: 35, confidence: 78, blockerCount: 1 },
  { id: "rel-console-3-1-0", version: "3.1.0", title: "Console accessibility", status: "ACTIVE", targetDate: "2026-12-04", verdict: "SHIP", riskScore: 0, confidence: 91, blockerCount: 0 },
];

const health = {
  jira: { healthy: true, message: "OK", checkedAt: now },
  bitbucket: { healthy: true, message: "OK", checkedAt: now },
  confluence: { healthy: true, message: "OK", checkedAt: now },
  compass: { healthy: false, message: "Compass API preview unavailable; service evidence is partial.", checkedAt: now },
  teamworkGraph: {
    healthy: true,
    message: "Connected as current user; 2 assigned work item(s), 1 pull request(s) returned.",
    checkedAt: now,
    workItemCount: 2,
    pullRequestCount: 1,
    assignedWork: [
      { id: "ari:cloud:jira::issue/1", key: "PAY-412", summary: "Retry ledger reconciliation on timeout", dueAt: "2026-11-29", webUrl: "https://example.atlassian.net/browse/PAY-412", issueType: "Bug" },
      { id: "ari:cloud:jira::issue/2", key: "PAY-419", summary: "Add settlement audit trail", webUrl: "https://example.atlassian.net/browse/PAY-419", issueType: "Story" },
    ],
    pullRequests: [
      { id: "ari:cloud:bitbucket::pr/1", displayId: "184", title: "PAY-412 retry reconciliation", status: "OPEN", url: "https://bitbucket.org/example/payments/pull-requests/184" },
    ],
  },
  overall: false,
  healthySources: 4,
  totalSources: 5,
  checkedAt: now,
};

const audit = {
  events: [
    { id: "audit-1", actorId: "712020:demo", actorType: "USER", operation: "GET_RELEASE_READINESS", targetEntity: "release:rel-payments-2-4-0", result: "SUCCESS", timestamp: now, correlationId: "cid-demo-1" },
    { id: "audit-2", actorId: "system", actorType: "SYSTEM", operation: "SYNC_RECONCILIATION", targetEntity: "workspace", result: "SUCCESS", timestamp: "2026-11-26T08:45:00.000Z", correlationId: "sync-demo-1" },
  ],
};

export async function invoke(key: string, payload?: Record<string, unknown>) {
  switch (key) {
    case "listReleases":
      return { success: true, data: { releases, count: releases.length, retrievedAt: now } };
    case "getProjectHealth":
      return { success: true, data: health };
    case "getReleaseReadiness":
      return { success: true, data: readiness };
    case "getRiskEvidence":
      return { success: true, data: { evidence, count: evidence.length, retrievedAt: now, releaseId: payload?.releaseId ?? null } };
    case "listAuditEvents":
      return { success: true, data: audit };
    case "syncProject":
      return { success: true, data: { workspaceId: "demo", sources: ["jira", "bitbucket", "confluence", "teamwork-graph"], evidenceCount: 7, releasesUpserted: 3, warnings: ["Compass is unavailable in this preview."], syncedAt: now } };
    default:
      return { success: false, error: { message: `Preview has no handler for ${key}` } };
  }
}
