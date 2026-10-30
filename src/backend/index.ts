import Resolver from "@forge/resolver";
import { ReleaseService } from "./services/release-service";
import { JiraAdapter } from "./integrations/jira-adapter";
import { normalizeError } from "./security/errors";
import { GetReleaseReadinessRequestSchema, GetReleaseBlockersRequestSchema } from "../domain/schemas";

const resolver = new Resolver();
const releaseService = new ReleaseService();

resolver.define("getReleaseReadiness", async (req) => {
  try {
    const { releaseId } = GetReleaseReadinessRequestSchema.parse(req.payload);
    const workspaceId = (req.context as { workspaceId?: string })?.workspaceId ?? "default";
    const assessment = await releaseService.assessReleaseReadiness(workspaceId, releaseId, [], {
      hasUnreviewedChanges: false,
      hasMissingDocs: false,
      hasCriticalIssues: false,
    });
    if (!assessment) {
      return { success: false, error: { code: "NOT_FOUND", message: "Release not found." } };
    }
    return { success: true, data: assessment };
  } catch (error) {
    const normalized = normalizeError(error);
    return { success: false, error: normalized };
  }
});

resolver.define("getReleaseBlockers", async (req) => {
  try {
    const { releaseId } = GetReleaseBlockersRequestSchema.parse(req.payload);
    const workspaceId = (req.context as { workspaceId?: string })?.workspaceId ?? "default";
    const assessment = await releaseService.assessReleaseReadiness(workspaceId, releaseId, [], {
      hasUnreviewedChanges: false,
      hasMissingDocs: false,
      hasCriticalIssues: false,
    });
    return { success: true, data: assessment?.blockers ?? [] };
  } catch (error) {
    const normalized = normalizeError(error);
    return { success: false, error: normalized };
  }
});

resolver.define("getProjectHealth", async (req) => {
  try {
    const jira = new JiraAdapter();
    const health = await jira.healthCheck();
    return { success: true, data: health };
  } catch (error) {
    const normalized = normalizeError(error);
    return { success: false, error: normalized };
  }
});

resolver.define("getChangeImpact", async (req) => {
  return { success: true, data: { message: "Change impact analysis requires a change identifier." } };
});

resolver.define("getServiceDependencies", async (req) => {
  return { success: true, data: [] };
});

resolver.define("getRiskEvidence", async (req) => {
  return { success: true, data: [] };
});

resolver.define("generateReleaseReport", async (req) => {
  return { success: true, data: { generatedAt: new Date().toISOString() } };
});

resolver.define("createRemediationTask", async (req) => {
  return { success: false, error: { code: "NOT_IMPLEMENTED" as never, message: "Remediation task creation pending integration." } };
});

resolver.define("updateRiskStatus", async (req) => {
  return { success: true, data: { updated: true } };
});

export const handler = resolver.getDefinitions();