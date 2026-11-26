import { sql } from "@forge/sql";
import { memoryEvidence, noteSqlFailure } from "./memory-store";

export interface EvidenceRow {
  id: string;
  workspace_id: string;
  source_platform: string;
  source_id: string;
  evidence_type: string;
  title: string;
  summary: string | null;
  retrieved_at: string;
  source_updated_at: string | null;
  freshness: string;
  release_id: string | null;
  source_url: string | null;
  content_hash: string | null;
}

export class EvidenceRepository {
  async insert(record: EvidenceRow): Promise<void> {
    // Always mirror into memory so a SQL outage still yields a usable brief.
    memoryEvidence.put(`${record.workspace_id}:${record.id}`, { ...record });
    try {
      await sql
      .prepare(
        `INSERT INTO evidence_records (id, workspace_id, source_platform, source_id, evidence_type, title, summary, retrieved_at, source_updated_at, freshness, release_id, source_url, content_hash)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE title = VALUES(title), summary = VALUES(summary), retrieved_at = VALUES(retrieved_at),
           source_updated_at = VALUES(source_updated_at), freshness = VALUES(freshness), release_id = VALUES(release_id),
           source_url = VALUES(source_url)`
      )
      .bindParams(
        record.id,
        record.workspace_id,
        record.source_platform,
        record.source_id,
        record.evidence_type,
        record.title,
        record.summary,
        record.retrieved_at,
        record.source_updated_at,
        record.freshness,
        record.release_id ?? null,
        record.source_url ?? null,
        record.content_hash ?? null
      )
      .execute();
    } catch (error) {
      noteSqlFailure(error);
    }
  }

  async listByWorkspace(workspaceId: string, limit = 50): Promise<EvidenceRow[]> {
    try {
      const result = await sql
        .prepare<EvidenceRow>(
          `SELECT id, workspace_id, source_platform, source_id, evidence_type, title, summary, retrieved_at, source_updated_at, freshness, release_id, source_url, content_hash
         FROM evidence_records WHERE workspace_id = ? ORDER BY retrieved_at DESC LIMIT ?`
        )
        .bindParams(workspaceId, limit)
        .execute();
      const rows = result.rows ?? [];
      if (rows.length > 0) return rows;
      return this.fromMemory(workspaceId, limit);
    } catch (error) {
      noteSqlFailure(error);
      return this.fromMemory(workspaceId, limit);
    }
  }

  async listByWorkspaceIds(workspaceId: string, releaseIds: string[], limit = 500): Promise<EvidenceRow[]> {
    if (releaseIds.length === 0) return [];
    const inMemory = () =>
      this.fromMemory(workspaceId, limit, (row) => row.release_id !== null && releaseIds.includes(row.release_id));
    try {
      const marks = releaseIds.map(() => "?").join(",");
      const result = await sql
        .prepare<EvidenceRow>(
          `SELECT id, workspace_id, source_platform, source_id, evidence_type, title, summary, retrieved_at, source_updated_at, freshness, release_id, source_url, content_hash
         FROM evidence_records WHERE workspace_id = ? AND release_id IN (${marks}) ORDER BY retrieved_at DESC LIMIT ?`
        )
        .bindParams(workspaceId, ...releaseIds, limit)
        .execute();
      const rows = result.rows ?? [];
      if (rows.length > 0) return rows;
      return inMemory();
    } catch (error) {
      noteSqlFailure(error);
      return inMemory();
    }
  }

  async listByRelease(workspaceId: string, releaseId: string, limit = 100): Promise<EvidenceRow[]> {
    const inMemory = () => this.fromMemory(workspaceId, limit, (row) => row.release_id === releaseId);
    try {
      const result = await sql
        .prepare<EvidenceRow>(
          `SELECT id, workspace_id, source_platform, source_id, evidence_type, title, summary, retrieved_at, source_updated_at, freshness, release_id, source_url, content_hash
         FROM evidence_records WHERE workspace_id = ? AND release_id = ? ORDER BY retrieved_at DESC LIMIT ?`
        )
        .bindParams(workspaceId, releaseId, limit)
        .execute();
      const rows = result.rows ?? [];
      if (rows.length > 0) return rows;
      return inMemory();
    } catch (error) {
      noteSqlFailure(error);
      return inMemory();
    }
  }

  private fromMemory(workspaceId: string, limit: number, filter?: (row: EvidenceRow) => boolean): EvidenceRow[] {
    return memoryEvidence
      .all()
      .map((row) => row as unknown as EvidenceRow)
      .filter((row) => row.workspace_id === workspaceId && (!filter || filter(row)))
      .sort((a, b) => (a.retrieved_at < b.retrieved_at ? 1 : -1))
      .slice(0, limit);
  }
}
