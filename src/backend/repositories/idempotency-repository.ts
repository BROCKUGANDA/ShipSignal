import { sql } from "@forge/sql";
export class IdempotencyRepository {
  async claim(workspaceId: string, operation: string, key: string): Promise<boolean> {
    const now = new Date().toISOString();
    try {
      await sql.prepare(
        `INSERT INTO idempotency_keys (workspace_id, operation, idempotency_key, status, created_at) VALUES (?, ?, ?, 'CLAIMED', ?)`
      ).bindParams(workspaceId, operation, key, now).execute();
      return true;
    } catch {
      return false;
    }
  }
  async complete(workspaceId: string, operation: string, key: string, resultJson: string): Promise<void> {
    await sql.prepare(
      `UPDATE idempotency_keys SET status='DONE', result_json=? WHERE workspace_id=? AND operation=? AND idempotency_key=?`
    ).bindParams(resultJson, workspaceId, operation, key).execute();
  }
}
