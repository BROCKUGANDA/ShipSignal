import { JiraAdapter } from "../integrations/jira-adapter";
import { BitbucketAdapter } from "../integrations/bitbucket-adapter";
import { ConfluenceAdapter } from "../integrations/confluence-adapter";
import { handleSyncEvent } from "../events/sync-handler";
import type { EvidenceReference } from "../../domain/types";

export interface SyncResult {
  workspaceId: string;
  sources: string[];
  evidenceCount: number;
  warnings: string[];
  syncedAt: string;
}

export class SyncWorker {
  private jira = new JiraAdapter();
  private bitbucket = new BitbucketAdapter();
  private confluence = new ConfluenceAdapter();

  async run(workspaceId: string): Promise<SyncResult> {
    const warnings: string[] = [];
    const sources: string[] = [];
    let evidenceCount = 0;

    const jiraHealth = await this.jira.healthCheck();
    if (jiraHealth.healthy) {
      sources.push("jira");
      const page = await this.jira.fetchPage<unknown>({ workspaceId, limit: 25 });
      evidenceCount += Array.isArray((page.data as { issues?: unknown[] })?.issues)
        ? ((page.data as { issues: unknown[] }).issues.length)
        : 0;
      warnings.push(...page.warnings);
    } else {
      warnings.push(`Jira unavailable: ${jiraHealth.message ?? "unknown"}`);
    }

    const bbHealth = await this.bitbucket.healthCheck();
    if (bbHealth.healthy) {
      sources.push("bitbucket");
      const page = await this.bitbucket.fetchPage<unknown>({ workspaceId, limit: 25 });
      warnings.push(...page.warnings);
    } else {
      warnings.push(`Bitbucket unavailable: ${bbHealth.message ?? "unknown"}`);
    }

    const cfHealth = await this.confluence.healthCheck();
    if (cfHealth.healthy) {
      sources.push("confluence");
      const page = await this.confluence.fetchPage<unknown>({ workspaceId, limit: 25 });
      warnings.push(...page.warnings);
    } else {
      warnings.push(`Confluence unavailable: ${cfHealth.message ?? "unknown"}`);
    }

    await handleSyncEvent({ eventId: `sync-${workspaceId}-${Date.now()}`, workspaceId });

    return {
      workspaceId,
      sources,
      evidenceCount,
      warnings,
      syncedAt: new Date().toISOString(),
    };
  }
}