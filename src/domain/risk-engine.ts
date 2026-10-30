import type { RiskAssessment, RiskFactor, Release, EvidenceReference } from "../domain/types";

export interface RiskPolicy {
  unreviewedChangeWeight: number;
  missingDocsWeight: number;
  criticalIssueWeight: number;
  thresholdAtRisk: number;
  thresholdBlocked: number;
}

export const DEFAULT_RISK_POLICY: RiskPolicy = {
  unreviewedChangeWeight: 25,
  missingDocsWeight: 15,
  criticalIssueWeight: 40,
  thresholdAtRisk: 30,
  thresholdBlocked: 70,
};

export function assessRelease(
  release: Release,
  evidence: EvidenceReference[],
  options: { hasUnreviewedChanges: boolean; hasMissingDocs: boolean; hasCriticalIssues: boolean }
): RiskAssessment {
  const factors: RiskFactor[] = [];
  let score = 0;
  const now = new Date().toISOString();

  if (options.hasUnreviewedChanges) {
    score += DEFAULT_RISK_POLICY.unreviewedChangeWeight;
    factors.push({
      id: `rf-unreviewed-${release.id}`,
      releaseId: release.id,
      category: "UNREVIEWED_CHANGES",
      severity: "HIGH",
      description: "Release contains changes that have not been reviewed.",
      evidenceIds: evidence.map((e) => e.id),
      confidence: evidence.length > 0 ? "VERIFIED" : "UNVERIFIED",
      recommendation: "Complete code review for all pending pull requests before release.",
    });
  }

  if (options.hasMissingDocs) {
    score += DEFAULT_RISK_POLICY.missingDocsWeight;
    factors.push({
      id: `rf-docs-${release.id}`,
      releaseId: release.id,
      category: "MISSING_DOCUMENTATION",
      severity: "MEDIUM",
      description: "Required documentation is missing or outdated.",
      evidenceIds: [],
      confidence: "PARTIAL",
      recommendation: "Update release notes and runbooks.",
    });
  }

  if (options.hasCriticalIssues) {
    score += DEFAULT_RISK_POLICY.criticalIssueWeight;
    factors.push({
      id: `rf-critical-${release.id}`,
      releaseId: release.id,
      category: "CRITICAL_ISSUES",
      severity: "CRITICAL",
      description: "Critical unresolved issues are linked to this release.",
      evidenceIds: [],
      confidence: "VERIFIED",
      recommendation: "Resolve critical issues before proceeding.",
    });
  }

  const freshness: RiskAssessment["evidenceFreshness"] =
    evidence.length === 0 ? "UNKNOWN" : evidence.every((e) => e.freshness === "CURRENT") ? "CURRENT" : "PARTIAL";

  let status: RiskAssessment["status"] = "READY";
  if (evidence.length === 0) status = "INCOMPLETE";
  else if (factors.some((f) => f.severity === "CRITICAL")) status = "BLOCKED";
  else if (score >= DEFAULT_RISK_POLICY.thresholdBlocked) status = "BLOCKED";
  else if (score >= DEFAULT_RISK_POLICY.thresholdAtRisk) status = "AT_RISK";

  return {
    id: `ra-${release.id}-${Date.now()}`,
    releaseId: release.id,
    status,
    riskScore: evidence.length === 0 ? null : score,
    assessedAt: now,
    evidenceFreshness: freshness,
    factors,
    blockers: factors.filter((f) => f.severity === "CRITICAL" || f.severity === "HIGH"),
    recommendations: factors.map((f) => f.recommendation),
    warnings: evidence.length === 0 ? ["No evidence available; assessment incomplete."] : [],
  };
}