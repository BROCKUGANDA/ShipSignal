import { sql } from "@forge/sql";
import type { Release } from "../../domain/types";

export interface ReleaseRow {
  id: string;
  workspace_id: string;
  project_id: string;
  version: string;
  title: string;
  status: string;
  target_date: string | null;
  created_at: string;
  updated_at: string;
  version_token: number;
}

export class ReleaseRepository {
  async findById(workspaceId: string, releaseId: string): Promise<Release | null> {
    const result = await sql
      .prepare<ReleaseRow>(
        `SELECT id, workspace_id, project_id, version, title, status, target_date, created_at, updated_at, version_token
         FROM releases WHERE workspace_id = ? AND id = ? LIMIT 1`
      )
      .bindParams(workspaceId, releaseId)
      .execute();
    const rows = result.rows ?? [];
    const row = rows[0];
    if (!row) return null;
    return this.map(row);
  }

  async listByWorkspace(workspaceId: string, limit = 25): Promise<Release[]> {
    const result = await sql
      .prepare<ReleaseRow>(
        `SELECT id, workspace_id, project_id, version, title, status, target_date, created_at, updated_at, version_token
         FROM releases WHERE workspace_id = ? ORDER BY updated_at DESC, id DESC LIMIT ?`
      )
      .bindParams(workspaceId, limit)
      .execute();
    return (result.rows ?? []).map((r) => this.map(r));
  }

  async upsert(release: Release): Promise<void> {
    const now = release.updatedAt;
    await sql
      .prepare(
        `INSERT INTO releases (id, workspace_id, project_id, version, title, status, target_date, created_at, updated_at, version_token)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE version = VALUES(version), title = VALUES(title), status = VALUES(status), target_date = VALUES(target_date), updated_at = VALUES(updated_at), version_token = version_token + 1`
      )
      .bindParams(
        release.id,
        release.workspaceId,
        release.projectId,
        release.version,
        release.title,
        release.status,
        release.targetDate ?? null,
        release.createdAt,
        now,
        release.versionToken
      )
      .execute();
  }

  async updateStatus(workspaceId: string, releaseId: string, status: string): Promise<boolean> {
    const now = new Date().toISOString();
    const result = await sql
      .prepare(
        `UPDATE releases SET status = ?, updated_at = ?, version_token = version_token + 1
         WHERE workspace_id = ? AND id = ?`
      )
      .bindParams(status, now, workspaceId, releaseId)
      .execute();
    // Forge SQL update result shape varies; verify by re-reading.
    const after = await this.findById(workspaceId, releaseId);
    return after !== null && after.status === status;
  }

  private map(row: ReleaseRow): Release {
    return {
      id: row.id,
      workspaceId: row.workspace_id,
      projectId: row.project_id,
      version: row.version,
      title: row.title,
      status: row.status as Release["status"],
      ...(row.target_date ? { targetDate: row.target_date } : {}),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      versionToken: row.version_token,
    };
  }
}