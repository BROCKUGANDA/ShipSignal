-- ShipSignal 002: indexes, idempotency, audit_occurred, FK-lite (Forge SQL)

-- indexes for tenant queries
CREATE INDEX IF NOT EXISTS idx_releases_workspace_id ON releases(workspace_id);
CREATE INDEX IF NOT EXISTS idx_releases_project_id ON releases(project_id);
CREATE INDEX IF NOT EXISTS idx_evidence_workspace_id ON evidence_records(workspace_id);
CREATE INDEX IF NOT EXISTS idx_evidence_source ON evidence_records(source_platform, source_id);
CREATE INDEX IF NOT EXISTS idx_risk_release_id ON risk_assessments(release_id);
CREATE INDEX IF NOT EXISTS idx_audit_workspace ON audit_events(workspace_id);
CREATE INDEX IF NOT EXISTS idx_audit_correlation ON audit_events(correlation_id);

CREATE TABLE IF NOT EXISTS workspace_installations (
  id VARCHAR(64) PRIMARY KEY,
  installation_id VARCHAR(128) NOT NULL UNIQUE,
  workspace_id VARCHAR(64) NOT NULL,
  created_at VARCHAR(64) NOT NULL,
  updated_at VARCHAR(64) NOT NULL
);

CREATE TABLE IF NOT EXISTS idempotency_keys (
  id VARCHAR(64) PRIMARY KEY,
  workspace_id VARCHAR(64) NOT NULL,
  operation VARCHAR(128) NOT NULL,
  key VARCHAR(255) NOT NULL,
  status VARCHAR(32) NOT NULL,
  result TEXT,
  created_at VARCHAR(64) NOT NULL,
  expires_at VARCHAR(64),
  UNIQUE(workspace_id, operation, key)
);

CREATE TABLE IF NOT EXISTS risk_status_updates (
  id VARCHAR(64) PRIMARY KEY,
  workspace_id VARCHAR(64) NOT NULL,
  release_id VARCHAR(64) NOT NULL,
  status VARCHAR(16) NOT NULL,
  reason TEXT,
  actor_id VARCHAR(128) NOT NULL,
  correlation_id VARCHAR(64) NOT NULL,
  updated_at VARCHAR(64) NOT NULL
);
