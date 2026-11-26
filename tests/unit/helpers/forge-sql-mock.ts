/**
 * Shared in-memory mock for `@forge/sql`, for unit tests that need to drive
 * backend code without a database.
 *
 * Usage in a test file:
 *
 *   vi.mock("@forge/sql", async () => {
 *     const helper = await import("./helpers/forge-sql-mock");
 *     return helper.createForgeSqlMock();
 *   });
 *   import { mockDb, recordedSqlCalls, resetForgeSqlMock } from "./helpers/forge-sql-mock";
 *
 * Seed `mockDb.releases` / `mockDb.evidence` with DB-row-shaped objects
 * (snake_case, as returned by the real repositories' SELECTs).
 */
export interface RecordedSqlCall {
  text: string;
  params: unknown[];
}

export const recordedSqlCalls: RecordedSqlCall[] = [];

export const mockDb: {
  releases: Array<Record<string, unknown>>;
  evidence: Array<Record<string, unknown>>;
} = { releases: [], evidence: [] };

export function resetForgeSqlMock(): void {
  recordedSqlCalls.length = 0;
  mockDb.releases.length = 0;
  mockDb.evidence.length = 0;
}

function resolveRows(text: string, params: unknown[]): Array<Record<string, unknown>> {
  // releases.listByWorkspace
  if (text.includes("FROM releases WHERE workspace_id = ? ORDER BY")) {
    const limit = params[1] as number;
    return mockDb.releases.filter((r) => r.workspace_id === params[0]).slice(0, limit);
  }
  // releases.findById
  if (text.includes("FROM releases WHERE workspace_id = ? AND id = ?")) {
    return mockDb.releases.filter((r) => r.workspace_id === params[0] && r.id === params[1]);
  }
  // evidence.listByWorkspaceIds (batched IN query)
  if (text.includes("release_id IN (")) {
    const ids = params.slice(1, -1) as unknown[];
    const limit = params[params.length - 1] as number;
    return mockDb.evidence
      .filter((e) => e.workspace_id === params[0] && ids.includes(e.release_id))
      .slice(0, limit);
  }
  // evidence.listByRelease (per-release query — must stay unused on batched paths)
  if (text.includes("AND release_id = ?")) {
    const limit = params[2] as number;
    return mockDb.evidence
      .filter((e) => e.workspace_id === params[0] && e.release_id === params[1])
      .slice(0, limit);
  }
  // evidence.listByWorkspace
  if (text.includes("FROM evidence_records WHERE workspace_id = ? ORDER BY")) {
    const limit = params[1] as number;
    return mockDb.evidence.filter((e) => e.workspace_id === params[0]).slice(0, limit);
  }
  return [];
}

export function createForgeSqlMock() {
  return {
    sql: {
      prepare: (text: string) => ({
        bindParams: (...params: unknown[]) => ({
          execute: async () => {
            recordedSqlCalls.push({ text, params });
            return { rows: resolveRows(text, params) };
          },
        }),
      }),
    },
    migrationRunner: {
      initialize: async () => {},
      enqueue: (_name: string, _statement: string) => {},
      run: async () => [] as string[],
    },
  };
}
