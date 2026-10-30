import { z } from "zod";

export const ReleaseIdSchema = z.string().min(1).max(64);
export const ProjectIdSchema = z.string().min(1).max(64);
export const WorkspaceIdSchema = z.string().min(1).max(64);

export const GetReleaseReadinessRequestSchema = z.object({
  releaseId: ReleaseIdSchema,
  includeEvidence: z.boolean().optional(),
});

export const GetReleaseBlockersRequestSchema = z.object({
  releaseId: ReleaseIdSchema,
});

export const PaginationSchema = z.object({
  limit: z.number().int().min(1).max(100).default(25),
  cursor: z.string().optional(),
});