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
}

export class EvidenceRepository {
  async insert(record: EvidenceRow): Promise<void> {
    await sql
      .prepare(
        `INSERT INTO evidence_records (id, workspace_id, source_platform, source_id, evidence_type, title, summary, retrieved_at, source_updated_at, freshness, release_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
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
        record.release_id ?? null
      )
      .execute();
  }

  async listByWorkspace(workspaceId: string, limit = 50): Promise<EvidenceRow[]> {
    const result = await sql
      .prepare<EvidenceRow>(
        `SELECT id, workspace_id, source_platform, source_id, evidence_type, title, summary, retrieved_at, source_updated_at, freshness, release_id
         FROM evidence_records WHERE workspace_id = ? ORDER BY retrieved_at DESC LIMIT ?`
      )
      .bindParams(workspaceId, limit)
      .execute();
    return result.rows ?? [];
  }

  async listByRelease(workspaceId: string, releaseId: string, limit = 100): Promise<EvidenceRow[]> {
    const result = await sql
      .prepare<EvidenceRow>(
        `SELECT id, workspace_id, source_platform, source_id, evidence_type, title, summary, retrieved_at, source_updated_at, freshness, release_id
         FROM evidence_records WHERE workspace_id = ? AND release_id = ? ORDER BY retrieved_at DESC LIMIT ?`
      )
      .bindParams(workspaceId, releaseId, limit)
      .execute();
    return result.rows ?? [];
  }
}