import { migrationRunner, sql } from "@forge/sql";

let initialized = false;
let inFlight: Promise<{ ran: string[]; skipped: boolean }> | null = null;

const MIGRATIONS: Array<{ name: string; statement: string }> = [
  {
    name: "001_workspaces",
    statement: `CREATE TABLE IF NOT EXISTS workspaces (
      id VARCHAR(64) PRIMARY KEY,
      installation_id VARCHAR(128) NOT NULL,
      name VARCHAR(255) NOT NULL,
      created_at VARCHAR(64) NOT NULL,
      updated_at VARCHAR(64) NOT NULL
    )`,
  },
  {
    name: "001_releases",
    statement: `CREATE TABLE IF NOT EXISTS releases (
      id VARCHAR(64) PRIMARY KEY,
      workspace_id VARCHAR(64) NOT NULL,
      project_id VARCHAR(64) NOT NULL,
      version VARCHAR(64) NOT NULL,
      title VARCHAR(255) NOT NULL,
      status VARCHAR(32) NOT NULL,
      target_date VARCHAR(64),
      created_at VARCHAR(64) NOT NULL,
      updated_at VARCHAR(64) NOT NULL,
      version_token INT NOT NULL
    )`,
  },
  {
    name: "001_evidence",
    statement: `CREATE TABLE IF NOT EXISTS evidence_records (
      id VARCHAR(64) PRIMARY KEY,
      workspace_id VARCHAR(64) NOT NULL,
      source_platform VARCHAR(32) NOT NULL,
      source_id VARCHAR(128) NOT NULL,
      evidence_type VARCHAR(64) NOT NULL,
      title VARCHAR(255) NOT NULL,
      summary TEXT,
      retrieved_at VARCHAR(64) NOT NULL,
      source_updated_at VARCHAR(64),
      freshness VARCHAR(16) NOT NULL,
      release_id VARCHAR(64)
    )`,
  },
  {
    name: "001_risk",
    statement: `CREATE TABLE IF NOT EXISTS risk_assessments (
      id VARCHAR(64) PRIMARY KEY,
      workspace_id VARCHAR(64) NOT NULL,
      release_id VARCHAR(64) NOT NULL,
      status VARCHAR(16) NOT NULL,
      risk_score INT,
      assessed_at VARCHAR(64) NOT NULL,
      evidence_freshness VARCHAR(16) NOT NULL,
      policy_version VARCHAR(16) NOT NULL,
      evidence_ids TEXT NOT NULL
    )`,
  },
  {
    name: "001_audit",
    statement: `CREATE TABLE IF NOT EXISTS audit_events (
      id VARCHAR(64) PRIMARY KEY,
      workspace_id VARCHAR(64) NOT NULL,
      actor_id VARCHAR(128) NOT NULL,
      actor_type VARCHAR(32) NOT NULL,
      operation VARCHAR(128) NOT NULL,
      target_entity VARCHAR(128) NOT NULL,
      result VARCHAR(32) NOT NULL,
      timestamp VARCHAR(64) NOT NULL,
      correlation_id VARCHAR(64) NOT NULL
    )`,
  },
  {
    name: "002_indexes",
    statement: `CREATE INDEX idx_releases_workspace_id ON releases(workspace_id)`,
  },
  {
    name: "002_evidence_index",
    statement: `CREATE INDEX idx_evidence_workspace_id ON evidence_records(workspace_id)`,
  },
  {
    name: "002_evidence_release_index",
    statement: `CREATE INDEX idx_evidence_release_id ON evidence_records(release_id)`,
  },
  {
    name: "002_evidence_source_index",
    statement: `CREATE INDEX idx_evidence_source ON evidence_records(workspace_id, source_platform, source_id)`,
  },
  {
    name: "003_evidence_provenance",
    statement: `ALTER TABLE evidence_records ADD COLUMN source_url VARCHAR(1024) NULL`,
  },
  {
    name: "003_evidence_hash",
    statement: `ALTER TABLE evidence_records ADD COLUMN content_hash VARCHAR(64) NULL`,
  },
  {
    name: "003_evidence_unique",
    statement: `CREATE UNIQUE INDEX idx_evidence_content_hash ON evidence_records(workspace_id, content_hash)`,
  },
  {
    name: "003_idempotency",
    statement: `CREATE TABLE IF NOT EXISTS idempotency_keys (
      workspace_id VARCHAR(64) NOT NULL,
      operation VARCHAR(128) NOT NULL,
      idempotency_key VARCHAR(128) NOT NULL,
      status VARCHAR(32) NOT NULL,
      result_json TEXT,
      created_at VARCHAR(64) NOT NULL,
      PRIMARY KEY (workspace_id, operation, idempotency_key)
    )`,
  },
  {
    name: "003_risk_status_updates",
    statement: `CREATE TABLE IF NOT EXISTS risk_status_updates (
      id VARCHAR(64) PRIMARY KEY,
      workspace_id VARCHAR(64) NOT NULL,
      release_id VARCHAR(64) NOT NULL,
      status VARCHAR(16) NOT NULL,
      reason TEXT,
      actor_id VARCHAR(128) NOT NULL,
      created_at VARCHAR(64) NOT NULL
    )`,
  },
  {
    name: "003_workspace_installations",
    statement: `CREATE TABLE IF NOT EXISTS workspace_installations (
      cloud_id VARCHAR(128) PRIMARY KEY,
      installation_id VARCHAR(128) NOT NULL,
      created_at VARCHAR(64) NOT NULL,
      updated_at VARCHAR(64) NOT NULL
    )`,
  },
];

export async function ensureMigrations(): Promise<{ ran: string[]; skipped: boolean }> {
  if (initialized) return { ran: [], skipped: true };
  if (inFlight) return inFlight;
  inFlight = (async () => {
    await migrationRunner.initialize();
    const ran: string[] = [];
    for (const m of MIGRATIONS) {
      migrationRunner.enqueue(m.name, m.statement);
    }
    try {
      ran.push(...(await migrationRunner.run()));
    } catch (error) {
      // A single non-idempotent statement (e.g. CREATE INDEX on an index that
      // already exists) used to abort the whole batch, leaving later tables
      // missing and every resolver throwing INTERNAL_ERROR. Apply statements
      // individually and tolerate "already exists" style failures.
      console.error("[ShipSignal] migration batch failed, retrying statements individually", {
        message: (error as Error).message,
      });
      for (const m of MIGRATIONS) {
        try {
          await sql.executeDDL(m.statement);
          ran.push(m.name);
        } catch (statementError) {
          const msg = (statementError as Error).message ?? "";
          if (/already exists|duplicate|1060|1061|1050/i.test(msg)) continue;
          console.error("[ShipSignal] migration statement failed", { name: m.name, message: msg });
        }
      }
    }
    initialized = true;
    return { ran, skipped: false };
  })();
  try {
    return await inFlight;
  } catch (error) {
    initialized = false;
    throw error;
  } finally {
    inFlight = null;
  }
}

export function resetMigrationStateForTests(): void {
  initialized = false;
  inFlight = null;
}
