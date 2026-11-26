import { sql } from "@forge/sql";

/**
 * Duplicate-key heuristic. @forge/sql does not document a stable error shape
 * for constraint violations, so match on message/code text: only a duplicate
 * means "someone already claimed this key" (return false). Anything else is
 * an infrastructure fault and must propagate so callers can warn loudly
 * instead of misreporting a dropped sync as a "duplicate".
 */
function isDuplicateKey(error: unknown): boolean {
  const code = (error as { code?: unknown })?.code;
  const text = `${error instanceof Error ? error.message : String(error)} ${String(code ?? "")}`;
  return /duplicate|dup_entry|1062|unique|primary key|23000/i.test(text);
}

export class IdempotencyRepository {
  async claim(workspaceId: string, operation: string, key: string): Promise<boolean> {
    const now = new Date().toISOString();
    try {
      await sql.prepare(
        `INSERT INTO idempotency_keys (workspace_id, operation, idempotency_key, status, created_at) VALUES (?, ?, ?, 'CLAIMED', ?)`
      ).bindParams(workspaceId, operation, key, now).execute();
      return true;
    } catch (error) {
      if (isDuplicateKey(error)) return false;
      // Surface the platform's own code/status instead of a generic message so
      // a provisioning failure is distinguishable from a transient fault.
      const e = error as { code?: string; message?: string; responseDetails?: { status?: number; statusText?: string; traceId?: string | null } };
      const detail = [
        e.code ?? "SQL_ERROR",
        e.responseDetails?.status ? `HTTP ${e.responseDetails.status}` : null,
        e.responseDetails?.traceId ? `trace ${e.responseDetails.traceId}` : null,
        e.message ?? "unknown",
      ]
        .filter(Boolean)
        .join(" · ");
      throw new Error(`Idempotency claim failed: ${detail}`);
    }
  }
  async complete(workspaceId: string, operation: string, key: string, resultJson: string): Promise<void> {
    await sql.prepare(
      `UPDATE idempotency_keys SET status='DONE', result_json=? WHERE workspace_id=? AND operation=? AND idempotency_key=?`
    ).bindParams(resultJson, workspaceId, operation, key).execute();
  }
}
