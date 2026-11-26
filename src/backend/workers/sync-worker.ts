import { createHash } from "node:crypto";
import { JiraAdapter } from "../integrations/jira-adapter";
import { BitbucketAdapter } from "../integrations/bitbucket-adapter";
import { ConfluenceAdapter } from "../integrations/confluence-adapter";
import { CompassAdapter } from "../integrations/compass-adapter";
import { EvidenceRepository } from "../repositories/evidence-repository";
import { ReleaseRepository } from "../repositories/release-repository";
import { ensureMigrations } from "../database/migrations";
import { handleSyncEvent } from "../events/sync-handler";

export interface SyncResult {
  workspaceId: string;
  sources: string[];
  evidenceCount: number;
  releasesUpserted: number;
  warnings: string[];
  syncedAt: string;
}

const hash = (value: string) => createHash("sha256").update(value).digest("hex");
const stableId = (prefix: string, value: string) => `${prefix}-${hash(value).slice(0, 24)}`;
const freshnessFor = (updatedAt?: string): "CURRENT" | "STALE" | "UNKNOWN" => {
  if (!updatedAt) return "UNKNOWN";
  const ms = Date.now() - new Date(updatedAt).getTime();
  if (!Number.isFinite(ms)) return "UNKNOWN";
  return ms > 7 * 86_400_000 ? "STALE" : "CURRENT";
};

export class SyncWorker {
  private jira = new JiraAdapter();
  private bitbucket = new BitbucketAdapter();
  private confluence = new ConfluenceAdapter();
  private compass = new CompassAdapter();
  private evidenceRepo = new EvidenceRepository();
  private releaseRepo = new ReleaseRepository();

  async run(workspaceId: string): Promise<SyncResult> {
    const warnings: string[] = [];
    const sources: string[] = [];
    let evidenceCount = 0;
    let releasesUpserted = 0;
    const now = new Date().toISOString();

    try {
      await ensureMigrations();
    } catch (error) {
      warnings.push(`Database migrations failed: ${(error as Error).message}`);
    }

    const jiraHealth = await this.jira.healthCheck();
    if (jiraHealth.healthy) {
      sources.push("jira");
      try {
        const projects = await this.jira.fetchProjects(10);
        for (const project of projects) {
          const versions = await this.jira.fetchVersions(project.id);
          for (const version of versions.slice(0, 10)) {
            const releaseId = stableId("rel", `${workspaceId}:${project.key}:${version.id}`);
            await this.releaseRepo.upsert({
              id: releaseId,
              workspaceId,
              projectId: project.key,
              version: version.name,
              title: version.description || `${project.name} ${version.name}`,
              status: version.released ? "RELEASED" : "ACTIVE",
              ...(version.releaseDate ? { targetDate: version.releaseDate } : {}),
              createdAt: now,
              updatedAt: now,
              versionToken: 1,
            });
            releasesUpserted += 1;

            const versionEvidence = {
              id: stableId("ev-jira-version", `${workspaceId}:${project.key}:${version.id}`),
              workspace_id: workspaceId,
              source_platform: "jira",
              source_id: version.id,
              evidence_type: "release_version",
              title: `${project.key} ${version.name}`,
              summary: `project=${project.key}; released=${Boolean(version.released)}; targetDate=${version.releaseDate ?? "none"}`,
              retrieved_at: now,
              source_updated_at: version.releaseDate ?? null,
              freshness: freshnessFor(version.releaseDate),
              release_id: releaseId,
              source_url: version.self ?? null,
              content_hash: hash(`${workspaceId}:jira:version:${version.id}:${version.name}:${version.released}`),
            };
            await this.evidenceRepo.insert(versionEvidence);
            evidenceCount += 1;

            const issues = await this.jira.fetchIssuesForVersion(version.name, 50);
            for (const issue of issues) {
              const status = issue.fields?.status?.name ?? "unknown";
              const priority = issue.fields?.priority?.name ?? "none";
              const type = issue.fields?.issuetype?.name ?? "issue";
              await this.evidenceRepo.insert({
                id: stableId("ev-jira-issue", `${workspaceId}:${issue.id}:${issue.fields?.updated ?? ""}`),
                workspace_id: workspaceId,
                source_platform: "jira",
                source_id: issue.key,
                evidence_type: "issue_snapshot",
                title: `${issue.key}: ${issue.fields?.summary ?? "Untitled issue"}`,
                summary: `status=${status}; priority=${priority}; type=${type}; updated=${issue.fields?.updated ?? "unknown"}`,
                retrieved_at: now,
                source_updated_at: issue.fields?.updated ?? null,
                freshness: freshnessFor(issue.fields?.updated),
                release_id: releaseId,
                source_url: issue.self ? issue.self.replace("/rest/api/3/issue/", "/browse/") : null,
                content_hash: hash(`${workspaceId}:jira:issue:${issue.id}:${status}:${priority}:${issue.fields?.updated ?? ""}`),
              });
              evidenceCount += 1;
            }
          }
        }
        if (projects.length === 0) warnings.push("No Jira projects were returned; no releases were created.");
      } catch (error) {
        warnings.push(`Jira sync failed after partial writes: ${(error as Error).message}`);
      }
    } else {
      warnings.push(`Jira unavailable: ${jiraHealth.message ?? "unknown"}`);
    }

    const bitbucketHealth = await this.bitbucket.healthCheck();
    if (bitbucketHealth.healthy) {
      sources.push("bitbucket");
      try {
        const repositories = await this.bitbucket.fetchRepositories(5);
        for (const repo of repositories) {
          const pullRequests = await this.bitbucket.fetchPullRequests(repo.full_name, 25);
          for (const pr of pullRequests) {
            const approved = pr.reviewers?.filter((reviewer) => reviewer.approved).length ?? 0;
            const reviewers = pr.reviewers?.length ?? 0;
            const reviewState = pr.draft
              ? "draft"
              : approved > 0
                ? "approved"
                : reviewers > 0
                  ? "changes requested"
                  : "unreviewed";
            await this.evidenceRepo.insert({
              id: stableId("ev-bitbucket-pr", `${workspaceId}:${repo.uuid}:${pr.id}:${pr.updated_on ?? ""}`),
              workspace_id: workspaceId,
              source_platform: "bitbucket",
              source_id: `${repo.full_name}#${pr.id}`,
              evidence_type: "pull_request_snapshot",
              title: `${repo.name} #${pr.id}: ${pr.title}`,
              summary: `state=${pr.state}; review=${reviewState}; draft=${Boolean(pr.draft)}; approvals=${approved}/${reviewers}; updated=${pr.updated_on ?? "unknown"}`,
              retrieved_at: now,
              source_updated_at: pr.updated_on ?? null,
              freshness: freshnessFor(pr.updated_on),
              release_id: null,
              source_url: pr.links?.html?.href ?? null,
              content_hash: hash(`${workspaceId}:bitbucket:pr:${repo.uuid}:${pr.id}:${reviewState}:${pr.updated_on ?? ""}`),
            });
            evidenceCount += 1;
          }
        }
      } catch (error) {
        warnings.push(`Bitbucket sync failed after partial writes: ${(error as Error).message}`);
      }
    } else {
      warnings.push(`Bitbucket unavailable: ${bitbucketHealth.message ?? "unknown"}`);
    }

    const confluenceHealth = await this.confluence.healthCheck();
    if (confluenceHealth.healthy) {
      sources.push("confluence");
      try {
        const pages = await this.confluence.fetchPages(25);
        for (const page of pages) {
          const updatedAt = page.version?.when;
          const webui = page._links?.webui;
          const base = page._links?.base;
          await this.evidenceRepo.insert({
            id: stableId("ev-confluence-page", `${workspaceId}:${page.id}:${updatedAt ?? ""}`),
            workspace_id: workspaceId,
            source_platform: "confluence",
            source_id: page.id,
            evidence_type: "documentation_snapshot",
            title: `Confluence: ${page.title}`,
            summary: `page=${page.title}; version=${page.version?.number ?? "unknown"}; updated=${updatedAt ?? "unknown"}`,
            retrieved_at: now,
            source_updated_at: updatedAt ?? null,
            freshness: freshnessFor(updatedAt),
            release_id: null,
            source_url: webui && base ? `${base}${webui}` : null,
            content_hash: hash(`${workspaceId}:confluence:page:${page.id}:${updatedAt ?? ""}`),
          });
          evidenceCount += 1;
        }
      } catch (error) {
        warnings.push(`Confluence sync failed after partial writes: ${(error as Error).message}`);
      }
    } else {
      warnings.push(`Confluence unavailable: ${confluenceHealth.message ?? "unknown"}`);
    }

    const compassHealth = await this.compass.healthCheck();
    if (compassHealth.healthy) {
      sources.push("compass");
      try {
        const result = await this.compass.fetchPage<{ data?: { components?: { nodes?: Array<{ id: string; name: string }> } } }>({ workspaceId, limit: 25 });
        for (const component of result.data?.data?.components?.nodes ?? []) {
          await this.evidenceRepo.insert({
            id: stableId("ev-compass-component", `${workspaceId}:${component.id}`),
            workspace_id: workspaceId,
            source_platform: "compass",
            source_id: component.id,
            evidence_type: "service_snapshot",
            title: `Compass: ${component.name}`,
            summary: `component=${component.name}`,
            retrieved_at: now,
            source_updated_at: null,
            freshness: "CURRENT",
            release_id: null,
            source_url: null,
            content_hash: hash(`${workspaceId}:compass:component:${component.id}:${component.name}`),
          });
          evidenceCount += 1;
        }
      } catch (error) {
        warnings.push(`Compass sync failed after partial writes: ${(error as Error).message}`);
      }
    } else {
      warnings.push(`Compass unavailable: ${compassHealth.message ?? "unknown"}`);
    }

    await handleSyncEvent({ eventId: `sync-${workspaceId}-${now}`, workspaceId });

    return {
      workspaceId,
      sources,
      evidenceCount,
      releasesUpserted,
      warnings,
      syncedAt: now,
    };
  }
}
