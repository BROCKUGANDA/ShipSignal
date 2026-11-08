import Resolver from "@forge/resolver";
import api, { route } from "@forge/api";
import { ReleaseService } from "./services/release-service";
import { ReleaseRepository } from "./repositories/release-repository";
import { EvidenceRepository } from "./repositories/evidence-repository";
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
const releaseService = new ReleaseService();
const releaseRepo = new ReleaseRepository();
const evidenceRepo = new EvidenceRepository();
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

resolver.define("getReleaseReadiness", async (req) => {
  try {
    const { releaseId, includeEvidence } = GetReleaseReadinessRequestSchema.parse(req.payload ?? {});
    const workspaceId = resolveWorkspaceId(req.context, req.payload);
    if (!workspaceId) return { success: false, error: { code: "AUTHENTICATION_ERROR" as const, message: "Workspace context required.", retryable: false, correlationId: correlationIdFromRequest(req) } };
    const release = await releaseRepo.findById(workspaceId, releaseId);
    if (!release) return notFound();
    const linked = await evidenceRepo.listByRelease(workspaceId, releaseId, 100);
    const workspaceEvidence = linked.length ? [] : await evidenceRepo.listByWorkspace(workspaceId, 100);
    const evidenceRows = linked.length ? linked : workspaceEvidence;
    const evidence = evidenceRows
      .map((e) => ({
        id: e.id,
        workspaceId: e.workspace_id,
        sourcePlatform: e.source_platform as "jira" | "bitbucket" | "confluence" | "compass" | "teamwork-graph",
        sourceId: e.source_id,
        evidenceType: e.evidence_type,
        retrievedAt: e.retrieved_at,
        ...(e.source_updated_at ? { sourceUpdatedAt: e.source_updated_at } : {}),
        freshness: e.freshness as "CURRENT" | "STALE" | "PARTIAL" | "UNKNOWN",
        title: e.title,
        summary: e.summary ?? "",
      }));
    // Derive flags from evidence types
    const hasUnreviewed = evidence.some((e) => e.evidenceType.includes("pull_request") && e.title.toLowerCase().includes("draft"));
    const hasMissingDocs = !evidence.some((e) => e.evidenceType === "documentation_snapshot");
    const hasCritical = evidence.some((e) => e.summary.toLowerCase().includes("critical") || e.title.toLowerCase().includes("critical"));
    const assessment = await releaseService.assessReleaseReadiness(workspaceId, releaseId, evidence, {
      hasUnreviewedChanges: hasUnreviewed,
      hasMissingDocs,
      hasCriticalIssues: hasCritical,
    });
    if (!assessment) return notFound();
    if (linked.length === 0 && workspaceEvidence.length > 0) {
      assessment.warnings.push("No evidence linked to this release yet; workspace evidence used for context.");
    }
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
    return { success: true, data: includeEvidence ? { ...assessment, evidence } : assessment };
  } catch (error) {
    return errorResponse(error, req);
  }
});

resolver.define("getReleaseBlockers", async (req) => {
  try {
    const { releaseId } = GetReleaseBlockersRequestSchema.parse(req.payload ?? {});
    const workspaceId = resolveWorkspaceId(req.context, req.payload);
    if (!workspaceId) return { success: false, error: { code: "AUTHENTICATION_ERROR" as const, message: "Workspace context required.", retryable: false, correlationId: correlationIdFromRequest(req) } };
    const evidenceRows = await evidenceRepo.listByWorkspace(workspaceId, 100);
    const evidence = evidenceRows.map((e) => ({
      id: e.id,
      workspaceId: e.workspace_id,
      sourcePlatform: e.source_platform as "jira" | "bitbucket" | "confluence" | "compass" | "teamwork-graph",
      sourceId: e.source_id,
      evidenceType: e.evidence_type,
      retrievedAt: e.retrieved_at,
      ...(e.source_updated_at ? { sourceUpdatedAt: e.source_updated_at } : {}),
      freshness: e.freshness as "CURRENT" | "STALE" | "PARTIAL" | "UNKNOWN",
      title: e.title,
      summary: e.summary ?? "",
    }));
    const assessment = await releaseService.assessReleaseReadiness(workspaceId, releaseId, evidence, {
      hasUnreviewedChanges: false,
      hasMissingDocs: false,
      hasCriticalIssues: false,
    });
    if (!assessment) return notFound();
    return { success: true, data: assessment.blockers };
  } catch (error) {
    return errorResponse(error, req);
  }
});

resolver.define("getProjectHealth", async (req) => {
  try {
    GetProjectHealthRequestSchema.parse(req.payload ?? {});
    const jira = new JiraAdapter();
    const bb = new BitbucketAdapter();
    const cf = new ConfluenceAdapter();
    const compass = new CompassAdapter();
    const accountId = (req.context as { accountId?: string })?.accountId;
    const twg = new TeamworkGraphAdapter(accountId);
    const [jiraHealth, bbHealth, cfHealth, compassHealth, twgHealth] = await Promise.all([
      breakerFor("jira").execute(() => jira.healthCheck()),
      breakerFor("bitbucket").execute(() => bb.healthCheck()),
      breakerFor("confluence").execute(() => cf.healthCheck()),
      compass.healthCheck(),
      twg.healthCheck(),
    ]);
    return {
      success: true,
      data: {
        jira: jiraHealth,
        bitbucket: bbHealth,
        confluence: cfHealth,
        compass: compassHealth,
        teamworkGraph: twgHealth,
        overall: jiraHealth.healthy || bbHealth.healthy || cfHealth.healthy,
        checkedAt: new Date().toISOString(),
      },
    };
  } catch (error) {
    return errorResponse(error, req);
  }
});

resolver.define("getChangeImpact", async (req) => {
  try {
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

resolver.define("getServiceDependencies", async (req) => {
  try {
    const payload = GetServiceDependenciesRequestSchema.parse(req.payload ?? {});
    const workspaceId = resolveWorkspaceId(req.context, req.payload);
    // Compass is optional; if unavailable, return evidence-derived dependencies honestly
    const compass = new CompassAdapter();
    const compassResult = await compass.fetchPage<{ components?: unknown[] }>({ workspaceId });
    const components = (compassResult.data as { components?: unknown[] })?.components ?? [];
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

resolver.define("getRiskEvidence", async (req) => {
  try {
    const { limit } = GetRiskEvidenceRequestSchema.parse(req.payload ?? {});
    const workspaceId = resolveWorkspaceId(req.context, req.payload);
    if (!workspaceId) return { success: false, error: { code: "AUTHENTICATION_ERROR" as const, message: "Workspace context required.", retryable: false, correlationId: correlationIdFromRequest(req) } };
    const rows = await evidenceRepo.listByWorkspace(workspaceId, limit);
    return {
      success: true,
      data: {
        evidence: rows.map((r) => ({
          id: r.id,
          sourcePlatform: r.source_platform,
          sourceId: r.source_id,
          evidenceType: r.evidence_type,
          title: r.title,
          summary: r.summary,
          retrievedAt: r.retrieved_at,
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

resolver.define("generateReleaseReport", async (req) => {
  try {
    const { releaseId, format } = GenerateReleaseReportRequestSchema.parse(req.payload ?? {});
    const workspaceId = resolveWorkspaceId(req.context, req.payload);
    const release = workspaceId ? await releaseRepo.findById(workspaceId, releaseId) : null;
    if (!release) return notFound(`Release ${releaseId} not found.`);
    const evidenceRows = await evidenceRepo.listByWorkspace(workspaceId, 100);
    const report = {
      releaseId,
      workspaceId,
      version: release.version,
      title: release.title,
      status: release.status,
      generatedAt: new Date().toISOString(),
      evidenceCount: evidenceRows.length,
      format,
    };
    if (format === "markdown") {
      const md = `# Release Report: ${release.version} - ${release.title}\n\nStatus: ${release.status}\nGenerated: ${report.generatedAt}\nEvidence records: ${evidenceRows.length}\n\n## Evidence\n${evidenceRows.map((e) => `- ${e.title} (${e.source_platform}/${e.evidence_type}) - ${e.freshness}`).join("\n")}`;
      return { success: true, data: { ...report, markdown: md } };
    }
    return { success: true, data: report };
  } catch (error) {
    return errorResponse(error, req);
  }
});

resolver.define("createRemediationTask", async (req) => {
  try {
    const { releaseId, summary, description, projectKey } = CreateRemediationTaskRequestSchema.parse(req.payload ?? {});
    const result = await breakerFor("jira").execute(() =>
      withRetry(
        async () => {
          const res = await api.asApp().requestJira(route`/rest/api/3/issue`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              fields: {
                project: { key: projectKey ?? "SHIP" },
                summary,
                description: description ?? `Remediation for release ${releaseId}`,
                issuetype: { name: "Task" },
              },
            }),
          });
          if (!res.ok) throw new Error(`Jira create failed ${res.status}`);
          return (await res.json()) as { id: string; key: string };
        },
        { maxAttempts: 2, baseMs: 200, maxMs: 2000 },
        (e) => (e as Error).message.includes("429") || (e as Error).message.includes("5"),
      )
    ).catch((e) => e as Error);
    if (result instanceof Error) {
      return {
        success: false,
        error: { code: "INTEGRATION_ERROR" as const, message: `Remediation task creation failed: ${result.message}. Use Jira UI as fallback.`, retryable: true, correlationId: correlationIdFromRequest(req) },
      };
    }
    return { success: true, data: { jiraKey: result.key, releaseId, createdAt: new Date().toISOString() } };
  } catch (error) {
    return errorResponse(error, req);
  }
});

resolver.define("updateRiskStatus", async (req) => {
  try {
    const { releaseId, status, reason } = UpdateRiskStatusRequestSchema.parse(req.payload ?? {});
    const workspaceId = resolveWorkspaceId(req.context, req.payload);
    const release = workspaceId ? await releaseRepo.findById(workspaceId, releaseId) : null;
    if (!release || !workspaceId) return notFound();
    const persisted = await releaseRepo.updateStatus(workspaceId, releaseId, status);
    if (!persisted) {
      return { success: false, error: { code: "DATABASE_ERROR" as const, message: "Release status update could not be persisted.", retryable: true, correlationId: correlationIdFromRequest(req) } };
    }
    AuditService.record({
      id: `audit-${correlationIdFromRequest(req)}`,
      workspaceId,
      actorId: "user",
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

resolver.define("handleSyncEvent", async (req) => {
  try {
    const payload = (req.payload ?? {}) as { eventId?: string; workspaceId?: string };
    const result = await handleSyncEvent(payload);
    return { success: true, data: result };
  } catch (error) {
    return errorResponse(error, req);
  }
});

resolver.define("syncProject", async (req) => {
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

resolver.define("listReleases", async (req) => {
  try {
    await ensureMigrations();
    const workspaceId = resolveWorkspaceId(req.context, req.payload);
    if (!workspaceId) return { success: false, error: { code: "AUTHENTICATION_ERROR" as const, message: "Workspace context required.", retryable: false, correlationId: correlationIdFromRequest(req) } };
    const releases = await releaseRepo.listByWorkspace(workspaceId, 50);
    return { success: true, data: { releases, count: releases.length, retrievedAt: new Date().toISOString() } };
  } catch (error) {
    return errorResponse(error, req);
  }
});

export const handler = resolver.getDefinitions();
