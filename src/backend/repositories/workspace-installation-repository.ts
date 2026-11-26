import { sql } from "@forge/sql";

/**
 * Scheduled triggers have no cloudId in their event context, so a sync fired by
 * the hourly trigger would otherwise write into a different workspace partition
 * than the UI (which resolves cloudId). This repository persists the
 * cloudId <-> installationId mapping captured from real user invocations so the
 * scheduled path can resolve the same workspace.
 */
export class WorkspaceInstallationRepository {
  async remember(cloudId: string, installationId: string): Promise<void> {
    if (!cloudId || !installationId) return;
    const now = new Date().toISOString();
    await sql
      .prepare(
        `INSERT INTO workspace_installations (cloud_id, installation_id, created_at, updated_at)
         VALUES (?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE installation_id = VALUES(installation_id), updated_at = VALUES(updated_at)`
      )
      .bindParams(cloudId, installationId, now, now)
      .execute();
  }

  async findCloudIdByInstallation(installationId: string): Promise<string | null> {
    if (!installationId) return null;
    const result = await sql
      .prepare<{ cloud_id: string }>(
        `SELECT cloud_id FROM workspace_installations WHERE installation_id = ? ORDER BY updated_at DESC LIMIT 1`
      )
      .bindParams(installationId)
      .execute();
    const row = result.rows?.[0];
    return row?.cloud_id ?? null;
  }

  async listCloudIds(limit = 25): Promise<string[]> {
    const result = await sql
      .prepare<{ cloud_id: string }>(
        `SELECT cloud_id FROM workspace_installations ORDER BY updated_at DESC LIMIT ?`
      )
      .bindParams(limit)
      .execute();
    return (result.rows ?? []).map((r) => r.cloud_id);
  }
}
