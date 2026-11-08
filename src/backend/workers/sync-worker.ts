import { JiraAdapter } from "../integrations/jira-adapter";
import { BitbucketAdapter } from "../integrations/bitbucket-adapter";
import { ConfluenceAdapter } from "../integrations/confluence-adapter";
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

export class SyncWorker {
  private jira = new JiraAdapter();
  private bitbucket = new BitbucketAdapter();
  private confluence = new ConfluenceAdapter();
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
    } catch {
      warnings.push("Database migrations could not be applied; sync may fail on first install.");
    }

    const jiraHealth = await this.jira.healthCheck();
    if (jiraHealth.healthy) {
      sources.push("jira");
      const page = await this.jira.fetchPage<unknown>({ workspaceId, limit: 25 });
      const count = Array.isArray((page.data as { issues?: unknown[] })?.issues)
        ? ((page.data as { issues: unknown[] }).issues.length)
        : 0;
      evidenceCount += count;
      warnings.push(...page.warnings);
      try {
        await this.evidenceRepo.insert({
          id: `ev-jira-${workspaceId}-${Date.now()}`,
          workspace_id: workspaceId,
          source_platform: "jira",
          source_id: "search",
          evidence_type: "issue_snapshot",
          title: "Jira issues snapshot",
          summary: `Retrieved ${count} issues`,
          retrieved_at: now,
          source_updated_at: null,
          freshness: "CURRENT",
          release_id: null,
        });
      } catch {
        warnings.push("Jira evidence write failed (database may not be provisioned yet).");
      }

      // Populate releases from real Jira project versions so the app is not empty.
      try {
        const projects = await this.jira.fetchProjects(10);
        for (const project of projects) {
          const versions = await this.jira.fetchVersions(project.id);
          for (const v of versions.slice(0, 10)) {
            const releaseId = `rel-${project.key}-${v.id}`;
            await this.releaseRepo.upsert({
              id: releaseId,
              workspaceId,
              projectId: project.key,
              version: v.name,
              title: v.description ?? `${project.name} ${v.name}`,
              status: v.released ? "RELEASED" : "ACTIVE",
              ...(v.releaseDate ? { targetDate: v.releaseDate } : {}),
              createdAt: now,
              updatedAt: now,
              versionToken: 1,
            });
            releasesUpserted += 1;
            await this.evidenceRepo.insert({
              id: `ev-ver-${releaseId}-${Date.now()}`,
              workspace_id: workspaceId,
              source_platform: "jira",
              source_id: v.id,
              evidence_type: "release_version",
              title: `${project.key} ${v.name}`,
              summary: v.released ? "Released version" : "Unreleased version",
              retrieved_at: now,
              source_updated_at: null,
              freshness: "CURRENT",
              release_id: releaseId,
            });
            evidenceCount += 1;
          }
        }
        if (projects.length === 0) warnings.push("No Jira projects found; no releases created.");
      } catch (e) {
        warnings.push(`Release sync failed: ${(e as Error).message}`);
      }
    } else {
      warnings.push(`Jira unavailable: ${jiraHealth.message ?? "unknown"}`);
    }

    const bbHealth = await this.bitbucket.healthCheck();
    if (bbHealth.healthy) {
      sources.push("bitbucket");
      const page = await this.bitbucket.fetchPage<unknown>({ workspaceId, limit: 25 });
      warnings.push(...page.warnings);
      try {
        await this.evidenceRepo.insert({
          id: `ev-bitbucket-${workspaceId}-${Date.now()}`,
          workspace_id: workspaceId,
          source_platform: "bitbucket",
          source_id: "repositories",
          evidence_type: "pull_request_snapshot",
          title: "Bitbucket snapshot",
          summary: "Retrieved repository data",
          retrieved_at: now,
          source_updated_at: null,
          freshness: "CURRENT",
          release_id: null,
        });
      } catch {
        warnings.push("Bitbucket evidence write failed.");
      }
    } else {
      warnings.push(`Bitbucket unavailable: ${bbHealth.message ?? "unknown"}`);
    }

    const cfHealth = await this.confluence.healthCheck();
    if (cfHealth.healthy) {
      sources.push("confluence");
      const page = await this.confluence.fetchPage<unknown>({ workspaceId, limit: 25 });
      warnings.push(...page.warnings);
      try {
        await this.evidenceRepo.insert({
          id: `ev-confluence-${workspaceId}-${Date.now()}`,
          workspace_id: workspaceId,
          source_platform: "confluence",
          source_id: "content",
          evidence_type: "documentation_snapshot",
          title: "Confluence snapshot",
          summary: "Retrieved content data",
          retrieved_at: now,
          source_updated_at: null,
          freshness: "CURRENT",
          release_id: null,
        });
      } catch {
        warnings.push("Confluence evidence write failed.");
      }
    } else {
      warnings.push(`Confluence unavailable: ${cfHealth.message ?? "unknown"}`);
    }

    await handleSyncEvent({ eventId: `sync-${workspaceId}-${Date.now()}`, workspaceId });

    return {
      workspaceId,
      sources,
      evidenceCount,
      releasesUpserted,
      warnings,
      syncedAt: new Date().toISOString(),
    };
  }
}