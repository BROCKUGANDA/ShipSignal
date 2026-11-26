import { sql } from "@forge/sql";

export interface RiskStatusUpdate {
  id: string;
  workspaceId: string;
  releaseId: string;
  status: string;
  reason: string | null;
  actorId: string;
  createdAt: string;
}

export class RiskStatusRepository {
  async record(update: RiskStatusUpdate): Promise<void> {
    await sql
      .prepare(
        `INSERT INTO risk_status_updates (id, workspace_id, release_id, status, reason, actor_id, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      )
      .bindParams(
        update.id,
        update.workspaceId,
        update.releaseId,
        update.status,
        update.reason,
        update.actorId,
        update.createdAt
      )
      .execute();
  }

  async list(workspaceId: string, releaseId: string, limit = 25): Promise<RiskStatusUpdate[]> {
    const result = await sql
      .prepare<{
        id: string;
        workspace_id: string;
        release_id: string;
        status: string;
        reason: string | null;
        actor_id: string;
        created_at: string;
      }>(
        `SELECT id, workspace_id, release_id, status, reason, actor_id, created_at
         FROM risk_status_updates WHERE workspace_id = ? AND release_id = ?
         ORDER BY created_at DESC LIMIT ?`
      )
      .bindParams(workspaceId, releaseId, limit)
      .execute();
    return (result.rows ?? []).map((r) => ({
      id: r.id,
      workspaceId: r.workspace_id,
      releaseId: r.release_id,
      status: r.status,
      reason: r.reason,
      actorId: r.actor_id,
      createdAt: r.created_at,
    }));
  }
}
