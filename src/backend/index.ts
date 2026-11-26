import Resolver from "@forge/resolver";
import api, { route } from "@forge/api";
import { ReleaseService } from "./services/release-service";
import { ReleaseRepository } from "./repositories/release-repository";
import { EvidenceRepository } from "./repositories/evidence-repository";
import { RiskStatusRepository } from "./repositories/risk-status-repository";
import { JiraAdapter } from "./integrations/jira-adapter";
import { BitbucketAdapter } from "./integrations/bitbucket-adapter";
import { ConfluenceAdapter } from "./integrations/confluence-adapter";
import { CompassAdapter } from "./integrations/compass-adapter";
import { TeamworkGraphAdapter } from "./integrations/teamwork-graph-adapter";
import { ensureMigrations } from "./database/migrations";
import { normalizeError, correlationIdFromRequest, resolveWorkspaceId } from "./security/errors";
import { SyncWorker } from "./workers/sync-worker";
import { handleSyncEvent } from "./events/sync-handler";
import { AuditService } from "./services/audit-service";
import { withRetry } from "./security/retry";
import { CircuitBreaker } from "./security/circuit-breaker";
import { assessRelease, buildReleaseBrief, deriveEvidenceSignals } from "../domain/risk-engine";
import type { EvidenceReference } from "../domain/types";
import {
  GetReleaseReadinessRequestSchema,
  GetReleaseBlockersRequestSchema,
  GetChangeImpactRequestSchema,
  GetServiceDependenciesRequestSchema,
  GetRiskEvidenceRequestSchema,
  GenerateReleaseReportRequestSchema,
  CreateRemediationTaskRequestSchema,
  UpdateRiskStatusRequestSchema,
  SyncProjectRequestSchema,
  GetProjectHealthRequestSchema,
} from "../domain/schemas";

const resolver = new Resolver();
type ResolverRequest = { payload?: unknown; context?: unknown };
type ResolverFn = (req: ResolverRequest) => Promise<unknown>;
const handlers = new Map<string, ResolverFn>();

function accountIdFromContext(context: unknown): string | undefined {
  if (!context || typeof context !== "object" || !("accountId" in context)) return undefined;
  const value = context.accountId;
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function cloudIdFromContext(context: unknown): string | undefined {
  if (!context || typeof context !== "object" || !("cloudId" in context)) return undefined;
  const value = context.cloudId;
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function define(key: string, fn: ResolverFn) {
  handlers.set(key, fn);
  resolver.define(key, fn);
}

const releaseService = new ReleaseService();
const releaseRepo = new ReleaseRepository();
const evidenceRepo = new EvidenceRepository();
const riskStatusRepo = new RiskStatusRepository();
const circuitBreakers = new Map<string, CircuitBreaker>();

function breakerFor(dep: string) {
  if (!circuitBreakers.has(dep)) circuitBreakers.set(dep, new CircuitBreaker(5, 30_000));
  return circuitBreakers.get(dep)!;
}

function errorResponse(error: unknown, req: { payload?: unknown }) {
  const cid = correlationIdFromRequest(req);
  const normalized = normalizeError(error, cid);
  console.error("[ShipSignal] resolver error", { correlationId: cid, code: normalized.code, message: normalized.message });
  return { success: false, error: normalized };
}

function notFound(message = "Release not found.") {
  return {
    success: false as const,
    error: { code: "NOT_FOUND" as const, message, retryable: false, correlationId: `missing-${Date.now()}` },
  };
}

async function loadAssessment(workspaceId: string, releaseId: string) {
  await ensureMigrations();
  const release = await releaseRepo.findById(workspaceId, releaseId);
  if (!release) return null;
  const linked = await evidenceRepo.listByRelease(workspaceId, releaseId, 100);
  const workspaceRows = await evidenceRepo.listByWorkspace(workspaceId, 100);
  const contextual = linked.length > 0
    ? workspaceRows.filter((e) => e.evidence_type.includes("documentation") || e.evidence_type.includes("pull_request"))
    : workspaceRows;
  const seen = new Set<string>();
  const rows = [...linked, ...contextual].filter((row) => {
    if (seen.has(row.id)) return false;
    seen.add(row.id);
    return true;
  });
  const evidence: EvidenceReference[] = rows.map((e) => ({
    id: e.id,
    workspaceId: e.workspace_id,
    sourcePlatform: e.source_platform as EvidenceReference["sourcePlatform"],
    sourceId: e.source_id,
    evidenceType: e.evidence_type,
    retrievedAt: e.retrieved_at,
    ...(e.source_updated_at ? { sourceUpdatedAt: e.source_updated_at } : {}),
    ...(e.source_url ? { sourceUrl: e.source_url } : {}),
    freshness: e.freshness as EvidenceReference["freshness"],
    title: e.title,
    summary: e.summary ?? "",
  }));
  const assessment = await releaseService.assessReleaseReadiness(
    workspaceId,
    releaseId,
    evidence,
    deriveEvidenceSignals(evidence)
  );
  if (!assessment) return null;
  if (linked.length === 0 && workspaceRows.length > 0) {
    assessment.warnings.push("No evidence is linked to this release yet; workspace evidence is shown as context.");
  }
  const brief = buildReleaseBrief(release, evidence, assessment);
  return { release, evidence, assessment, brief };
}

define("getReleaseReadiness", async (req) => {
  try {
    const { releaseId, includeEvidence } = GetReleaseReadinessRequestSchema.parse(req.payload ?? {});
    const workspaceId = resolveWorkspaceId(req.context, req.payload);
    if (!workspaceId) return { success: false, error: { code: "AUTHENTICATION_ERROR" as const, message: "Workspace context required.", retryable: false, correlationId: correlationIdFromRequest(req) } };
    const loaded = await loadAssessment(workspaceId, releaseId);
    if (!loaded) return notFound();
    AuditService.record({
      id: `audit-${correlationIdFromRequest(req)}`,
      workspaceId,
      actorId: "system",
      actorType: "SYSTEM",
      operation: "GET_RELEASE_READINESS",
      targetEntity: `release:${releaseId}`,
      result: "SUCCESS",
      timestamp: new Date().toISOString(),
      correlationId: correlationIdFromRequest(req),
    });
    return {
      success: true,
      data: includeEvidence
        ? { ...loaded.assessment, brief: loaded.brief, evidence: loaded.evidence }
        : { ...loaded.assessment, brief: loaded.brief },
    };
  } catch (error) {
    return errorResponse(error, req);
  }
});

define("getReleaseBlockers", async (req) => {
  try {
    const { releaseId } = GetReleaseBlockersRequestSchema.parse(req.payload ?? {});
    const workspaceId = resolveWorkspaceId(req.context, req.payload);
    if (!workspaceId) return { success: false, error: { code: "AUTHENTICATION_ERROR" as const, message: "Workspace context required.", retryable: false, correlationId: correlationIdFromRequest(req) } };
    const loaded = await loadAssessment(workspaceId, releaseId);
    if (!loaded) return notFound();
    return {
      success: true,
      data: {
        releaseId,
        verdict: loaded.brief.verdict,
        blockers: loaded.assessment.blockers,
        evidenceGaps: loaded.brief.evidenceGaps,
        nextActions: loaded.brief.nextActions,
      },
    };
  } catch (error) {
    return errorResponse(error, req);
  }
});

define("getProjectHealth", async (req) => {
  try {
    GetProjectHealthRequestSchema.parse(req.payload ?? {});
    const jira = new JiraAdapter();
    const bb = new BitbucketAdapter();
    const cf = new ConfluenceAdapter();
    const compass = new CompassAdapter();
    const accountId = accountIdFromContext(req.context);
    const twg = new TeamworkGraphAdapter(accountId);
    const [jiraHealth, bbHealth, cfHealth, compassHealth, twgHealth] = await Promise.all([
      breakerFor("jira").execute(() => jira.healthCheck()),
      breakerFor("bitbucket").execute(() => bb.healthCheck()),
      breakerFor("confluence").execute(() => cf.healthCheck()),
      compass.healthCheck(),
      twg.healthCheck(),
    ]);
    const healthEntries = [jiraHealth, bbHealth, cfHealth, compassHealth, twgHealth];
    const healthySources = healthEntries.filter((entry) => entry.healthy).length;
    return {
      success: true,
      data: {
        jira: jiraHealth,
        bitbucket: bbHealth,
        confluence: cfHealth,
        compass: compassHealth,
        teamworkGraph: twgHealth,
        overall: healthySources === healthEntries.length,
        healthySources,
        totalSources: healthEntries.length,
        checkedAt: new Date().toISOString(),
      },
    };
  } catch (error) {
    return errorResponse(error, req);
  }
});

define("getChangeImpact", async (req) => {
  try {
    await ensureMigrations();
    const { changeId } = GetChangeImpactRequestSchema.parse(req.payload ?? {});
    const workspaceId = resolveWorkspaceId(req.context, req.payload);
    const evidence = workspaceId ? await evidenceRepo.listByWorkspace(workspaceId, 50) : [];
    const related = evidence.filter((e) => e.source_id === changeId || e.summary?.includes(changeId)).map((e) => ({
      id: e.id,
      source: e.source_platform,
      title: e.title,
      freshness: e.freshness,
    }));
    return {
      success: true,
      data: {
        changeId,
        workspaceId,
        relatedEvidence: related,
        impact: related.length === 0 ? "UNKNOWN" : related.length > 3 ? "HIGH" : "MEDIUM",
        analyzedAt: new Date().toISOString(),
      },
    };
  } catch (error) {
    return errorResponse(error, req);
  }
});

define("getServiceDependencies", async (req) => {
  try {
    await ensureMigrations();
    const payload = GetServiceDependenciesRequestSchema.parse(req.payload ?? {});
    const workspaceId = resolveWorkspaceId(req.context, req.payload);
    // Compass is optional; if unavailable, return evidence-derived dependencies honestly
    const compass = new CompassAdapter();
    const compassResult = await compass.fetchPage<{ data?: { components?: { nodes?: unknown[] } } }>({ workspaceId });
    const components = compassResult.data?.data?.components?.nodes ?? [];
    const evidenceRows = workspaceId ? await evidenceRepo.listByWorkspace(workspaceId, 50) : [];
    const derived = evidenceRows
      .filter((e) => e.source_platform === "bitbucket" || e.source_platform === "compass")
      .map((e) => ({ id: e.source_id, name: e.title, source: e.source_platform, freshness: e.freshness }));
    return {
      success: true,
      data: {
        releaseId: payload.releaseId ?? null,
        workspaceId,
        compassComponents: components,
        derivedDependencies: derived,
        partial: compassResult.partial,
        warnings: compassResult.warnings,
        retrievedAt: compassResult.retrievedAt,
      },
    };
  } catch (error) {
    return errorResponse(error, req);
  }
});

define("getRiskEvidence", async (req) => {
  try {
    await ensureMigrations();
    const { releaseId, limit } = GetRiskEvidenceRequestSchema.parse(req.payload ?? {});
    const workspaceId = resolveWorkspaceId(req.context, req.payload);
    if (!workspaceId) return { success: false, error: { code: "AUTHENTICATION_ERROR" as const, message: "Workspace context required.", retryable: false, correlationId: correlationIdFromRequest(req) } };
    const rows = releaseId
      ? await evidenceRepo.listByRelease(workspaceId, releaseId, limit)
      : await evidenceRepo.listByWorkspace(workspaceId, limit);
    return {
      success: true,
      data: {
        releaseId: releaseId ?? null,
        evidence: rows.map((r) => ({
          id: r.id,
          sourcePlatform: r.source_platform,
          sourceId: r.source_id,
          sourceUrl: r.source_url,
          evidenceType: r.evidence_type,
          title: r.title,
          summary: r.summary,
          retrievedAt: r.retrieved_at,
          sourceUpdatedAt: r.source_updated_at,
          freshness: r.freshness,
        })),
        count: rows.length,
        retrievedAt: new Date().toISOString(),
      },
    };
  } catch (error) {
    return errorResponse(error, req);
  }
});

define("generateReleaseReport", async (req) => {
  try {
    const { releaseId, format } = GenerateReleaseReportRequestSchema.parse(req.payload ?? {});
    const workspaceId = resolveWorkspaceId(req.context, req.payload);
    if (!workspaceId) return { success: false, error: { code: "AUTHENTICATION_ERROR" as const, message: "Workspace context required.", retryable: false, correlationId: correlationIdFromRequest(req) } };
    const loaded = await loadAssessment(workspaceId, releaseId);
    if (!loaded) return notFound(`Release ${releaseId} not found.`);
    const report = {
      releaseId,
      workspaceId,
      version: loaded.release.version,
      title: loaded.release.title,
      status: loaded.brief.verdict,
      riskScore: loaded.brief.riskScore,
      confidence: loaded.brief.confidence,
      generatedAt: new Date().toISOString(),
      evidenceCount: loaded.evidence.length,
      brief: loaded.brief,
      format,
    };
    if (format === "markdown") {
      const md = [
        `# Release Report: ${loaded.release.version} - ${loaded.release.title}`,
        `Verdict: **${loaded.brief.verdict}**`,
        `Confidence: ${loaded.brief.confidence}% · Risk score: ${loaded.brief.riskScore ?? "not computed"} · Policy: ${loaded.brief.policyVersion}`,
        "",
        loaded.brief.summary,
        "",
        "## Checks",
        ...loaded.brief.checks.map((c) => `- ${c.status} — ${c.label}: ${c.detail}`),
        "",
        "## Blockers",
        ...(loaded.brief.blockers.length ? loaded.brief.blockers.map((b) => `- ${b.severity} — ${b.description}`) : ["- None"]),
        "",
        "## Evidence",
        ...loaded.evidence.map((e) => `- ${e.title} (${e.sourcePlatform}/${e.evidenceType}) — ${e.freshness}${e.sourceUrl ? ` — ${e.sourceUrl}` : ""}`),
      ].join("\n");
      return { success: true, data: { ...report, markdown: md } };
    }
    return { success: true, data: report };
  } catch (error) {
    return errorResponse(error, req);
  }
});

define("createRemediationTask", async (req) => {
  try {
    const { releaseId, summary, description, projectKey, confirm } = CreateRemediationTaskRequestSchema.parse(req.payload ?? {});
    const workspaceId = resolveWorkspaceId(req.context, req.payload);
    if (!workspaceId) return { success: false, error: { code: "AUTHENTICATION_ERROR" as const, message: "Workspace context required.", retryable: false, correlationId: correlationIdFromRequest(req) } };
    if (confirm !== true) {
      return { success: false, error: { code: "AUTHORIZATION_ERROR" as const, message: "Creating a Jira task requires explicit confirmation.", retryable: false, correlationId: correlationIdFromRequest(req) } };
    }
    const loaded = await loadAssessment(workspaceId, releaseId);
    if (!loaded) return notFound();
    const resolvedProject = projectKey ?? (/^[A-Z]+$/.test(loaded.release.projectId) ? loaded.release.projectId : "SHIP");
    const descriptionText = description ?? loaded.brief.nextActions[0] ?? `Remediation for release ${releaseId}`;
    const result = await breakerFor("jira").execute(() =>
      withRetry(
        async () => {
          const res = await api.asApp().requestJira(route`/rest/api/3/issue`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              fields: {
                project: { key: resolvedProject },
                summary,
                description: {
                  type: "doc",
                  version: 1,
                  content: [{ type: "paragraph", content: [{ type: "text", text: descriptionText }] }],
                },
                issuetype: { name: "Task" },
                labels: ["shipsignal", "release-remediation"],
              },
            }),
          });
          if (!res.ok) throw new Error(`Jira create failed ${res.status}`);
          return (await res.json()) as { id: string; key: string };
        },
        { maxAttempts: 2, baseMs: 200, maxMs: 2000 },
        (e: unknown) => {
          const message = e instanceof Error ? e.message : String(e);
          return message.includes("429") || /Jira create failed 5\d\d/.test(message);
        },
      )
    ).catch((e) => e as Error);
    if (result instanceof Error) {
      AuditService.record({
        id: `audit-${correlationIdFromRequest(req)}`,
        workspaceId,
        actorId: accountIdFromContext(req.context) ?? "user",
        actorType: "USER",
        operation: "CREATE_REMEDIATION_TASK",
        targetEntity: `release:${releaseId}`,
        result: "FAILURE",
        timestamp: new Date().toISOString(),
        correlationId: correlationIdFromRequest(req),
      });
      return {
        success: false,
        error: { code: "INTEGRATION_ERROR" as const, message: `Remediation task creation failed: ${result.message}. Use Jira UI as fallback.`, retryable: true, correlationId: correlationIdFromRequest(req) },
      };
    }
    AuditService.record({
      id: `audit-${correlationIdFromRequest(req)}`,
      workspaceId,
      actorId: accountIdFromContext(req.context) ?? "user",
      actorType: "USER",
      operation: "CREATE_REMEDIATION_TASK",
      targetEntity: `release:${releaseId}`,
      result: "SUCCESS",
      timestamp: new Date().toISOString(),
      correlationId: correlationIdFromRequest(req),
    });
    return { success: true, data: { jiraKey: result.key, releaseId, createdAt: new Date().toISOString(), actor: accountIdFromContext(req.context) ?? "user" } };
  } catch (error) {
    return errorResponse(error, req);
  }
});

define("updateRiskStatus", async (req) => {
  try {
    await ensureMigrations();
    const { releaseId, status, reason, confirm } = UpdateRiskStatusRequestSchema.parse(req.payload ?? {});
    const workspaceId = resolveWorkspaceId(req.context, req.payload);
    const release = workspaceId ? await releaseRepo.findById(workspaceId, releaseId) : null;
    if (!release || !workspaceId) return notFound();
    if (confirm !== true) {
      return { success: false, error: { code: "AUTHORIZATION_ERROR" as const, message: "Risk status changes require explicit confirmation.", retryable: false, correlationId: correlationIdFromRequest(req) } };
    }
    await riskStatusRepo.record({
      id: `rsu-${correlationIdFromRequest(req)}`,
      workspaceId,
      releaseId,
      status,
      reason: reason ?? null,
      actorId: accountIdFromContext(req.context) ?? "user",
      createdAt: new Date().toISOString(),
    });
    AuditService.record({
      id: `audit-${correlationIdFromRequest(req)}`,
      workspaceId,
      actorId: accountIdFromContext(req.context) ?? "user",
      actorType: "USER",
      operation: "UPDATE_RISK_STATUS",
      targetEntity: `release:${releaseId}`,
      result: "SUCCESS",
      timestamp: new Date().toISOString(),
      correlationId: correlationIdFromRequest(req),
    });
    return { success: true, data: { releaseId, status, reason: reason ?? null, updatedAt: new Date().toISOString(), persisted: true } };
  } catch (error) {
    return errorResponse(error, req);
  }
});

define("handleSyncEvent", async (req) => {
  try {
    const payload = (req.payload ?? {}) as { eventId?: string; workspaceId?: string };
    const result = await handleSyncEvent(payload);
    return { success: true, data: result };
  } catch (error) {
    return errorResponse(error, req);
  }
});

define("syncProject", async (req) => {
  try {
    SyncProjectRequestSchema.parse(req.payload ?? {});
    const workspaceId = resolveWorkspaceId(req.context, req.payload);
    if (!workspaceId) return { success: false, error: { code: "AUTHENTICATION_ERROR" as const, message: "Workspace context required.", retryable: false, correlationId: correlationIdFromRequest(req) } };
    const worker = new SyncWorker();
    const result = await worker.run(workspaceId);
    return { success: true, data: result };
  } catch (error) {
    return errorResponse(error, req);
  }
});

define("listReleases", async (req) => {
  try {
    await ensureMigrations();
    const workspaceId = resolveWorkspaceId(req.context, req.payload);
    if (!workspaceId) return { success: false, error: { code: "AUTHENTICATION_ERROR" as const, message: "Workspace context required.", retryable: false, correlationId: correlationIdFromRequest(req) } };
    const releases = await releaseRepo.listByWorkspace(workspaceId, 50);
    const enriched: Array<Record<string, unknown>> = [];
    for (const release of releases.slice(0, 25)) {
      const loaded = await loadAssessment(workspaceId, release.id);
      enriched.push(loaded
        ? {
            ...release,
            verdict: loaded.brief.verdict,
            riskScore: loaded.brief.riskScore,
            confidence: loaded.brief.confidence,
            blockerCount: loaded.brief.blockers.length,
          }
        : { ...release, verdict: "INSUFFICIENT_EVIDENCE", riskScore: null, confidence: 0, blockerCount: 0 });
    }
    return { success: true, data: { releases: enriched, count: enriched.length, retrievedAt: new Date().toISOString() } };
  } catch (error) {
    return errorResponse(error, req);
  }
});

define("listAuditEvents", async (req) => {
  try {
    await ensureMigrations();
    const workspaceId = resolveWorkspaceId(req.context, req.payload);
    if (!workspaceId) return { success: false, error: { code: "AUTHENTICATION_ERROR" as const, message: "Workspace context required.", retryable: false, correlationId: correlationIdFromRequest(req) } };
    const events = await AuditService.listDurable(workspaceId, 100);
    return { success: true, data: { events, count: events.length, retrievedAt: new Date().toISOString() } };
  } catch (error) {
    return errorResponse(error, req);
  }
});

const ACTION_TO_RESOLVER: Record<string, string> = {
  "get-release-readiness": "getReleaseReadiness",
  "get-release-blockers": "getReleaseBlockers",
  "get-project-health": "getProjectHealth",
  "get-change-impact": "getChangeImpact",
  "get-service-dependencies": "getServiceDependencies",
  "get-risk-evidence": "getRiskEvidence",
  "generate-release-report": "generateReleaseReport",
  "create-remediation-task": "createRemediationTask",
  "update-risk-status": "updateRiskStatus",
};

function actionRequest(payload: Record<string, unknown>, context: Record<string, unknown>) {
  const payloadContext = (payload.context ?? {}) as Record<string, unknown>;
  const cloudId = (context.cloudId ?? payloadContext.cloudId) as string | undefined;
  return {
    payload: { ...payload, workspaceId: cloudId },
    context: {
      ...context,
      ...(cloudId ? { cloudId } : {}),
      ...(payloadContext.jira ? { jira: payloadContext.jira } : {}),
      ...(payloadContext.confluence ? { confluence: payloadContext.confluence } : {}),
    },
  };
}

function errorEnvelope(code: string, message: string, retryable = false) {
  return { success: false as const, error: { code, message, retryable, correlationId: `action-${Date.now()}` } };
}

export async function actionHandler(payload: Record<string, unknown> = {}, context: Record<string, unknown> = {}) {
  const moduleKey = String((payload.context as Record<string, unknown> | undefined)?.moduleKey ?? context.moduleKey ?? "");
  const resolverKey = ACTION_TO_RESOLVER[moduleKey];
  if (!resolverKey) return errorEnvelope("VALIDATION_ERROR", `Unknown ShipSignal action: ${moduleKey || "missing moduleKey"}`);
  if ((resolverKey === "createRemediationTask" || resolverKey === "updateRiskStatus") && payload.confirm !== true) {
    return errorEnvelope("AUTHORIZATION_ERROR", "This action requires explicit user confirmation.");
  }
  const fn = handlers.get(resolverKey);
  if (!fn) return errorEnvelope("INTERNAL_ERROR", "Action handler is not registered.");
  return fn(actionRequest(payload, context));
}

export async function webtriggerHandler(event: Record<string, unknown> = {}, context: Record<string, unknown> = {}) {
  const eventContext = (event.context ?? {}) as Record<string, unknown>;
  const cloudId = (context.cloudId ?? eventContext.cloudId ?? event.cloudId) as string | undefined;
  const reqContext = cloudId ? { ...context, cloudId } : context;
  const workspaceId = resolveWorkspaceId(reqContext, {});
  if (!workspaceId) {
    return { statusCode: 503, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ success: false, error: "Workspace context required." }) };
  }
  const result = await handlers.get("syncProject")!({ payload: {}, context: reqContext });
  return { statusCode: 200, headers: { "Content-Type": "application/json" }, body: JSON.stringify(result) };
}

export async function scheduledHandler(_event: Record<string, unknown> = {}, context: Record<string, unknown> = {}) {
  const workspaceId = resolveWorkspaceId(context, {});
  if (!workspaceId) return { success: false, error: "Workspace context required." };
  const worker = new SyncWorker();
  return { success: true, data: await worker.run(workspaceId) };
}

export const handler = resolver.getDefinitions();
