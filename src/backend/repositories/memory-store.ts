/**
 * Process-local fallback store.
 *
 * Forge SQL answers `Unknown SQL execution error` on this installation because
 * the database was never provisioned for the app. Rather than showing an empty
 * product, repositories fall back to this store so a sync still produces a
 * usable, inspectable release brief for the session.
 *
 * This is explicitly a degraded mode: data does not survive a cold start, and
 * every entry written here is flagged so the UI can say so.
 */
export const degradedMode = { active: false, lastError: "" };

export function noteSqlFailure(error: unknown): void {
  degradedMode.active = true;
  const e = error as { code?: string; message?: string; responseDetails?: { status?: number; traceId?: string | null } };
  const parts = [
    e?.code ?? "SQL_ERROR",
    e?.message ?? String(error),
    e?.responseDetails?.status ? `HTTP ${e.responseDetails.status}` : null,
    e?.responseDetails?.traceId ? `trace ${e.responseDetails.traceId}` : null,
  ].filter(Boolean);
  degradedMode.lastError = parts.join(" · ");
}

export function describeDegradedMode(): string | null {
  if (!degradedMode.active) return null;
  return `Forge SQL is unavailable (${degradedMode.lastError}); showing session-only data.`;
}

export class MemoryTable<T extends { id?: string }> {
  private readonly rows = new Map<string, T>();

  put(key: string, row: T): void {
    this.rows.set(key, row);
  }

  all(): T[] {
    return [...this.rows.values()];
  }

  get(key: string): T | undefined {
    return this.rows.get(key);
  }

  clear(): void {
    this.rows.clear();
  }
}

export const memoryReleases = new MemoryTable<{
  id: string;
  workspaceId: string;
  projectId: string;
  version: string;
  title: string;
  status: string;
  targetDate?: string;
  createdAt: string;
  updatedAt: string;
  versionToken: number;
}>();

export const memoryEvidence = new MemoryTable<Record<string, unknown> & { id: string }>();
