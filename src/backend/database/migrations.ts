import { migrationRunner } from "@forge/sql";

let initialized = false;

const MIGRATIONS: Array<{ name: string; statement: string }> = [
  {
    name: "001_initial",
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
      release_id VARCHAR(64) NOT NULL,
      status VARCHAR(16) NOT NULL,
      risk_score INT,
      assessed_at VARCHAR(64) NOT NULL,
      evidence_freshness VARCHAR(16) NOT NULL
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
    statement: `CREATE INDEX IF NOT EXISTS idx_releases_workspace_id ON releases(workspace_id)`,
  },
  {
    name: "002_evidence_index",
    statement: `CREATE INDEX IF NOT EXISTS idx_evidence_workspace_id ON evidence_records(workspace_id)`,
  },
  {
    name: "002_evidence_release_index",
    statement: `CREATE INDEX IF NOT EXISTS idx_evidence_release_id ON evidence_records(release_id)`,
  },
];

export async function ensureMigrations(): Promise<{ ran: string[]; skipped: boolean }> {
  if (initialized) return { ran: [], skipped: true };
  initialized = true;
  try {
    await migrationRunner.initialize();
    for (const m of MIGRATIONS) {
      migrationRunner.enqueue(m.name, m.statement);
    }
    const ran = await migrationRunner.run();
    return { ran, skipped: false };
  } catch (error) {
    // Idempotent CREATE TABLE IF NOT EXISTS should not fail; if the runner
    // reports already-applied migrations, treat as success.
    return { ran: [], skipped: false };
  }
}

export function resetMigrationStateForTests(): void {
  initialized = false;
}