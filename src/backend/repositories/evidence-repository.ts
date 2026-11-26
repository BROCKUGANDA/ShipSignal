import { sql } from "@forge/sql";

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
  }

  async listByWorkspace(workspaceId: string, limit = 50): Promise<EvidenceRow[]> {
    const result = await sql
      .prepare<EvidenceRow>(
        `SELECT id, workspace_id, source_platform, source_id, evidence_type, title, summary, retrieved_at, source_updated_at, freshness, release_id, source_url, content_hash
         FROM evidence_records WHERE workspace_id = ? ORDER BY retrieved_at DESC LIMIT ?`
      )
      .bindParams(workspaceId, limit)
      .execute();
    return result.rows ?? [];
  }

  async listByRelease(workspaceId: string, releaseId: string, limit = 100): Promise<EvidenceRow[]> {
    const result = await sql
      .prepare<EvidenceRow>(
        `SELECT id, workspace_id, source_platform, source_id, evidence_type, title, summary, retrieved_at, source_updated_at, freshness, release_id, source_url, content_hash
         FROM evidence_records WHERE workspace_id = ? AND release_id = ? ORDER BY retrieved_at DESC LIMIT ?`
      )
      .bindParams(workspaceId, releaseId, limit)
      .execute();
    return result.rows ?? [];
  }
}
