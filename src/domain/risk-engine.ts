import type {
  EvidenceReference,
  Release,
  ReleaseBrief,
  ReadinessCheck,
  RiskAssessment,
  RiskFactor,
  Severity,
  SourceCoverage,
} from "./types";

export const RISK_POLICY_VERSION = "2026-11-26.1";

export interface RiskPolicy {
  criticalIssueWeight: number;
  unreviewedChangeWeight: number;
  missingDocsWeight: number;
  staleEvidenceWeight: number;
  coverageWeight: number;
  thresholdAtRisk: number;
  thresholdBlocked: number;
  staleAfterDays: number;
}

export const DEFAULT_RISK_POLICY: RiskPolicy = {
  criticalIssueWeight: 45,
  unreviewedChangeWeight: 25,
  missingDocsWeight: 15,
  staleEvidenceWeight: 10,
  coverageWeight: 10,
  thresholdAtRisk: 30,
  thresholdBlocked: 70,
  staleAfterDays: 7,
};

export interface EvidenceSignals {
  hasUnreviewedChanges: boolean;
  hasMissingDocs: boolean;
  hasCriticalIssues: boolean;
  hasStaleEvidence: boolean;
  hasCoverageGap: boolean;
}

const textOf = (evidence: EvidenceReference) =>
  `${evidence.title} ${evidence.summary ?? ""}`.toLowerCase();

const isPullRequest = (e: EvidenceReference) => e.evidenceType.includes("pull_request");
const isIssue = (e: EvidenceReference) => e.evidenceType.includes("issue");
const isDoc = (e: EvidenceReference) => e.evidenceType.includes("documentation") || e.evidenceType.includes("runbook");

function isStale(e: EvidenceReference, now: Date, staleAfterDays: number): boolean {
  if (e.freshness !== "CURRENT") return true;
  const at = e.sourceUpdatedAt ?? e.retrievedAt;
  if (!at) return true;
  const ms = now.getTime() - new Date(at).getTime();
  return Number.isFinite(ms) && ms > staleAfterDays * 86_400_000;
}

export function deriveEvidenceSignals(
  evidence: EvidenceReference[],
  policy: RiskPolicy = DEFAULT_RISK_POLICY,
  now = new Date()
): EvidenceSignals {
  const pullRequests = evidence.filter(isPullRequest);
  const issues = evidence.filter(isIssue);
  const docs = evidence.filter(isDoc);
  const platforms = new Set(evidence.map((e) => e.sourcePlatform));
  return {
    hasUnreviewedChanges: pullRequests.some((e) =>
      /draft|unreviewed|changes requested|review required|not approved|needs work/.test(textOf(e))
    ),
    hasCriticalIssues: issues.some((e) =>
      /critical|blocker|highest|p0|sev[- ]?1|priority=highest|severity=critical/.test(textOf(e))
    ),
    hasMissingDocs: docs.length === 0,
    hasStaleEvidence: evidence.some((e) => isStale(e, now, policy.staleAfterDays)),
    hasCoverageGap: platforms.size < 2,
  };
}

function matchingEvidence(evidence: EvidenceReference[], predicate: (e: EvidenceReference) => boolean): string[] {
  return evidence.filter(predicate).map((e) => e.id);
}

function pushFactor(
  factors: RiskFactor[],
  release: Release,
  category: string,
  severity: Severity,
  description: string,
  evidenceIds: string[],
  confidence: RiskFactor["confidence"],
  recommendation: string
) {
  factors.push({
    id: `rf-${category.toLowerCase()}-${release.id}`,
    releaseId: release.id,
    category,
    severity,
    description,
    evidenceIds,
    confidence,
    verificationRequired: severity === "CRITICAL" || confidence !== "VERIFIED",
    recommendation,
  });
}

export function assessRelease(
  release: Release,
  evidence: EvidenceReference[],
  options?: Partial<EvidenceSignals>,
  policy: RiskPolicy = DEFAULT_RISK_POLICY,
  now = new Date()
): RiskAssessment {
  const signals = { ...deriveEvidenceSignals(evidence, policy, now), ...options };
  const factors: RiskFactor[] = [];
  let score = 0;

  if (signals.hasCriticalIssues) {
    score += policy.criticalIssueWeight;
    const ids = matchingEvidence(evidence, (e) => isIssue(e) && /critical|blocker|highest|p0|sev[- ]?1/.test(textOf(e)));
    pushFactor(
      factors,
      release,
      "CRITICAL_ISSUES",
      "CRITICAL",
      "Unresolved critical or blocker-priority issues are linked to this release.",
      ids,
      ids.length ? "VERIFIED" : "UNVERIFIED",
      "Resolve the blocking issues or record an explicit, owned exception before release."
    );
  }

  if (signals.hasUnreviewedChanges) {
    score += policy.unreviewedChangeWeight;
    const ids = matchingEvidence(evidence, (e) => isPullRequest(e) && /draft|unreviewed|changes requested|review required|not approved|needs work/.test(textOf(e)));
    pushFactor(
      factors,
      release,
      "UNREVIEWED_CHANGES",
      "HIGH",
      "At least one pull request is draft, unapproved, or has requested changes.",
      ids,
      ids.length ? "VERIFIED" : "PARTIAL",
      "Complete review and approval for every pull request in the release scope."
    );
  }

  if (signals.hasMissingDocs) {
    score += policy.missingDocsWeight;
    pushFactor(
      factors,
      release,
      "MISSING_DOCUMENTATION",
      "MEDIUM",
      "No linked documentation or runbook evidence was found for this release.",
      [],
      "PARTIAL",
      "Link the release runbook, rollback plan, or release notes from Confluence."
    );
  }

  if (signals.hasStaleEvidence) {
    score += policy.staleEvidenceWeight;
    const ids = matchingEvidence(evidence, (e) => isStale(e, now, policy.staleAfterDays));
    pushFactor(
      factors,
      release,
      "STALE_EVIDENCE",
      "MEDIUM",
      `Evidence is older than ${policy.staleAfterDays} days or marked stale/partial.`,
      ids,
      ids.length ? "VERIFIED" : "PARTIAL",
      "Re-run synchronization or verify each stale source before relying on this verdict."
    );
  }

  if (signals.hasCoverageGap) {
    score += policy.coverageWeight;
    pushFactor(
      factors,
      release,
      "INSUFFICIENT_COVERAGE",
      "MEDIUM",
      "Fewer than two source platforms contributed evidence to this assessment.",
      [],
      "UNVERIFIED",
      "Connect the missing source (for example Bitbucket or Compass) and synchronize again."
    );
  }

  const freshness: RiskAssessment["evidenceFreshness"] =
    evidence.length === 0 ? "UNKNOWN" : evidence.every((e) => e.freshness === "CURRENT") ? "CURRENT" : "PARTIAL";

  let status: RiskAssessment["status"] = "READY";
  if (evidence.length === 0) status = "INCOMPLETE";
  else if (factors.some((f) => f.severity === "CRITICAL")) status = "BLOCKED";
  else if (score >= policy.thresholdBlocked) status = "BLOCKED";
  else if (signals.hasCoverageGap) status = "INCOMPLETE";
  else if (score >= policy.thresholdAtRisk) status = "AT_RISK";

  const blockers = factors.filter((f) => f.severity === "CRITICAL" || f.severity === "HIGH");
  const recommendations = factors.map((f) => f.recommendation);
  const warnings: string[] = [];
  if (evidence.length === 0) warnings.push("No evidence available; assessment incomplete.");
  if (signals.hasCoverageGap) warnings.push("Source coverage is insufficient for a confident release decision.");
  if (signals.hasStaleEvidence) warnings.push("Some evidence is stale; re-verify the cited records.");

  return {
    id: `ra-${release.id}-${RISK_POLICY_VERSION}`,
    releaseId: release.id,
    status,
    riskScore: evidence.length === 0 ? null : Math.min(100, score),
    assessedAt: now.toISOString(),
    evidenceFreshness: freshness,
    factors,
    blockers,
    recommendations,
    warnings,
  };
}

export function buildReleaseBrief(
  release: Release,
  evidence: EvidenceReference[],
  assessment: RiskAssessment,
  now = new Date()
): ReleaseBrief {
  const platforms = new Map<string, SourceCoverage>();
  for (const e of evidence) {
    const current = platforms.get(e.sourcePlatform) ?? {
      source: e.sourcePlatform,
      count: 0,
      current: 0,
      stale: 0,
    };
    current.count += 1;
    if (e.freshness === "CURRENT") current.current += 1;
    else current.stale += 1;
    platforms.set(e.sourcePlatform, current);
  }
  const coverage = [...platforms.values()].sort((a, b) => b.count - a.count);
  const total = evidence.length;
  const current = coverage.reduce((n, c) => n + c.current, 0);
  const confidence = total === 0
    ? 0
    : Math.round(
        100 *
          (0.45 * Math.min(1, total / 5) +
            0.3 * (current / total) +
            0.25 * Math.min(1, coverage.length / 3))
      );

  const checks: ReadinessCheck[] = [
    {
      key: "evidence",
      label: "Evidence coverage",
      status: total >= 3 && coverage.length >= 2 ? "PASS" : total > 0 ? "WARN" : "FAIL",
      detail: total === 0 ? "No evidence records." : `${total} records across ${coverage.length} source(s).`,
      evidenceIds: evidence.map((e) => e.id),
    },
    {
      key: "freshness",
      label: "Evidence freshness",
      status: total > 0 && current === total ? "PASS" : total > 0 ? "WARN" : "UNKNOWN",
      detail: total === 0 ? "No evidence to verify." : `${current}/${total} records are current.`,
      evidenceIds: evidence.filter((e) => e.freshness !== "CURRENT").map((e) => e.id),
    },
    {
      key: "review",
      label: "Review readiness",
      status: assessment.factors.some((f) => f.category === "UNREVIEWED_CHANGES") ? "FAIL" : "PASS",
      detail: assessment.factors.some((f) => f.category === "UNREVIEWED_CHANGES")
        ? "Draft or unapproved pull requests are in scope."
        : "No unreviewed pull request evidence found.",
      evidenceIds: assessment.factors.find((f) => f.category === "UNREVIEWED_CHANGES")?.evidenceIds ?? [],
    },
    {
      key: "issues",
      label: "Critical issues",
      status: assessment.factors.some((f) => f.category === "CRITICAL_ISSUES") ? "FAIL" : "PASS",
      detail: assessment.factors.some((f) => f.category === "CRITICAL_ISSUES")
        ? "Critical or blocker-priority issues are linked."
        : "No critical issue evidence found.",
      evidenceIds: assessment.factors.find((f) => f.category === "CRITICAL_ISSUES")?.evidenceIds ?? [],
    },
    {
      key: "docs",
      label: "Runbook and release notes",
      status: assessment.factors.some((f) => f.category === "MISSING_DOCUMENTATION") ? "WARN" : "PASS",
      detail: assessment.factors.some((f) => f.category === "MISSING_DOCUMENTATION")
        ? "No linked documentation evidence."
        : "Documentation evidence is present.",
      evidenceIds: [],
    },
  ];

  const verdict: ReleaseBrief["verdict"] =
    assessment.status === "INCOMPLETE"
      ? "INSUFFICIENT_EVIDENCE"
      : assessment.status === "BLOCKED"
        ? "HOLD"
        : assessment.status === "AT_RISK"
          ? "SHIP_WITH_GUARDRAILS"
          : "SHIP";

  const top = assessment.blockers[0] ?? assessment.factors[0];
  const summary =
    verdict === "INSUFFICIENT_EVIDENCE"
      ? "ShipSignal cannot make a defensible ship decision from the current evidence."
      : verdict === "HOLD"
        ? `Hold the release. ${top?.description ?? "A blocking condition is present."}`
        : verdict === "SHIP_WITH_GUARDRAILS"
          ? `Proceed only with guardrails. ${top?.description ?? "Review the open risk factors."}`
          : `Ship. Evidence is current across ${coverage.length} source(s) and no blocking condition was found.`;

  const evidenceGaps = [
    ...(coverage.length < 2 ? ["Fewer than two source platforms contributed evidence."] : []),
    ...(total === 0 ? ["No evidence records are linked to this release."] : []),
    ...(current < total ? [`${total - current} evidence record(s) need re-verification.`] : []),
  ];

  const nextActions = [
    ...assessment.recommendations,
    ...(verdict === "SHIP" ? ["Record the release decision and proceed."] : []),
  ].slice(0, 5);

  return {
    releaseId: release.id,
    version: release.version,
    title: release.title,
    verdict,
    status: assessment.status,
    riskScore: assessment.riskScore,
    confidence,
    summary,
    checks,
    blockers: assessment.blockers,
    evidenceGaps,
    nextActions,
    coverage,
    policyVersion: RISK_POLICY_VERSION,
    assessedAt: now.toISOString(),
  };
}
