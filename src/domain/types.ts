export type Severity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
export type RiskStatus = "READY" | "AT_RISK" | "BLOCKED" | "INCOMPLETE";

export interface Workspace {
  id: string;
  installationId: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface Project {
  id: string;
  workspaceId: string;
  externalId: string;
  source: "jira" | "bitbucket" | "confluence" | "compass";
  name: string;
  key?: string;
  status: "ACTIVE" | "ARCHIVED";
  createdAt: string;
  updatedAt: string;
}

export interface Release {
  id: string;
  workspaceId: string;
  projectId: string;
  version: string;
  title: string;
  status: "PLANNED" | "ACTIVE" | "RELEASED" | "ARCHIVED";
  targetDate?: string;
  createdAt: string;
  updatedAt: string;
  versionToken: number;
}

export interface EvidenceReference {
  id: string;
  workspaceId: string;
  sourcePlatform: "jira" | "bitbucket" | "confluence" | "compass" | "teamwork-graph";
  sourceId: string;
  sourceUrl?: string;
  evidenceType: string;
  retrievedAt: string;
  sourceUpdatedAt?: string;
  freshness: "CURRENT" | "STALE" | "PARTIAL" | "UNKNOWN";
  title: string;
  summary: string;
}

export interface RiskFactor {
  id: string;
  releaseId: string;
  category: string;
  severity: Severity;
  description: string;
  evidenceIds: string[];
  confidence: "VERIFIED" | "PARTIAL" | "UNVERIFIED";
  sourceUpdatedAt?: string;
  recommendation: string;
}

export interface RiskAssessment {
  id: string;
  releaseId: string;
  status: RiskStatus;
  riskScore: number | null;
  assessedAt: string;
  evidenceFreshness: "CURRENT" | "STALE" | "PARTIAL" | "UNKNOWN";
  factors: RiskFactor[];
  blockers: RiskFactor[];
  recommendations: string[];
  warnings: string[];
}

export interface AppError {
  code:
    | "VALIDATION_ERROR"
    | "AUTHENTICATION_ERROR"
    | "AUTHORIZATION_ERROR"
    | "NOT_FOUND"
    | "CONFLICT"
    | "RATE_LIMITED"
    | "UPSTREAM_UNAVAILABLE"
    | "UPSTREAM_TIMEOUT"
    | "NETWORK_ERROR"
    | "DATABASE_ERROR"
    | "INTEGRATION_ERROR"
    | "INVALID_RESPONSE"
    | "INTERNAL_ERROR";
  message: string;
  retryable: boolean;
  correlationId: string;
}

export interface Result<T> {
  success: boolean;
  data?: T;
  error?: AppError;
}