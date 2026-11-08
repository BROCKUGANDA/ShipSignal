import { z } from "zod";

export const ReleaseIdSchema = z
  .string()
  .min(1, "releaseId is required")
  .max(128)
  .regex(/^[a-zA-Z0-9-_]+$/, "releaseId must be alphanumeric, dash or underscore");

export const ProjectIdSchema = z.string().min(1).max(128);
export const WorkspaceIdSchema = z.string().min(1).max(128);

const Strict = (schema: z.ZodTypeAny) => schema;

export const GetReleaseReadinessRequestSchema = z
  .object({
    releaseId: ReleaseIdSchema,
    includeEvidence: z.boolean().optional().default(false),
  })
  .strict();

export const GetReleaseBlockersRequestSchema = z
  .object({
    releaseId: ReleaseIdSchema,
  })
  .strict();

export const PaginationSchema = z
  .object({
    limit: z.number().int().min(1).max(100).default(25),
    cursor: z.string().max(512).optional(),
  })
  .strict();

export const GetChangeImpactRequestSchema = z
  .object({
    changeId: z.string().min(1).max(128),
    workspaceId: WorkspaceIdSchema.optional(),
  })
  .strict();

export const GetServiceDependenciesRequestSchema = z
  .object({
    releaseId: ReleaseIdSchema.optional(),
    workspaceId: WorkspaceIdSchema.optional(),
  })
  .strict();

export const GetRiskEvidenceRequestSchema = z
  .object({
    releaseId: ReleaseIdSchema.optional(),
    workspaceId: WorkspaceIdSchema.optional(),
    limit: z.number().int().min(1).max(100).default(50),
  })
  .strict();

export const GenerateReleaseReportRequestSchema = z
  .object({
    releaseId: ReleaseIdSchema,
    format: z.enum(["summary", "markdown", "json"]).default("markdown"),
  })
  .strict();

export const CreateRemediationTaskRequestSchema = z
  .object({
    releaseId: ReleaseIdSchema,
    summary: z.string().min(1).max(256),
    description: z.string().max(4096).optional(),
    projectKey: z.string().min(1).max(32).regex(/^[A-Z]+$/).optional(),
  })
  .strict();

export const UpdateRiskStatusRequestSchema = z
  .object({
    releaseId: ReleaseIdSchema,
    status: z.enum(["READY", "AT_RISK", "BLOCKED", "INCOMPLETE"]),
    reason: z.string().max(1024).optional(),
  })
  .strict();

export const SyncProjectRequestSchema = z
  .object({
    workspaceId: WorkspaceIdSchema.optional(),
  })
  .strict();

export const GetProjectHealthRequestSchema = z
  .object({
    workspaceId: WorkspaceIdSchema.optional(),
  })
  .strict();

export { Strict };
