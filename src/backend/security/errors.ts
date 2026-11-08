import { randomUUID } from "node:crypto";
import type { AppError } from "../../domain/types";

export function normalizeError(error: unknown, correlationId?: string): AppError {
  const cid = correlationId ?? randomUUID();
  if (error instanceof Error) {
    const msg = error.message.toLowerCase();
    if (msg.includes("rate limit") || msg.includes("429")) {
      return { code: "RATE_LIMITED", message: "Rate limited by upstream provider.", retryable: true, correlationId: cid };
    }
    if (msg.includes("timeout") || msg.includes("timed out")) {
      return { code: "UPSTREAM_TIMEOUT", message: "Upstream request timed out.", retryable: true, correlationId: cid };
    }
    if (msg.includes("unauthorized") || msg.includes("401")) {
      return { code: "AUTHENTICATION_ERROR", message: "Authentication failed.", retryable: false, correlationId: cid };
    }
    if (msg.includes("forbidden") || msg.includes("403")) {
      return { code: "AUTHORIZATION_ERROR", message: "Insufficient permissions.", retryable: false, correlationId: cid };
    }
    if (msg.includes("not found") || msg.includes("404")) {
      return { code: "NOT_FOUND", message: "Resource not found.", retryable: false, correlationId: cid };
    }
    // Do not leak raw internal error messages to client in production
    const isProd = process.env.NODE_ENV === "production";
    return {
      code: "INTERNAL_ERROR",
      message: isProd ? "An internal error occurred." : error.message,
      retryable: false,
      correlationId: cid,
    };
  }
  return { code: "INTERNAL_ERROR", message: "Unknown error.", retryable: false, correlationId: cid };
}

export function toPublicError(err: AppError): AppError {
  const isProd = process.env.NODE_ENV === "production";
  if (isProd && err.code === "INTERNAL_ERROR") {
    return { ...err, message: "An internal error occurred." };
  }
  return { ...err };
}

export function correlationIdFromRequest(req: { payload?: unknown }): string {
  const payload = (req.payload ?? {}) as { correlationId?: string };
  if (payload.correlationId && typeof payload.correlationId === "string" && payload.correlationId.length <= 128) {
    return payload.correlationId;
  }
  return randomUUID();
}

export function resolveWorkspaceId(
  context: unknown,
  payload?: { workspaceId?: string }
): string {
  const ctx = (context ?? {}) as { workspaceId?: string; installationId?: string; tenantId?: string };
  const fromContext = ctx.workspaceId ?? ctx.installationId ?? ctx.tenantId;
  if (fromContext && typeof fromContext === "string" && fromContext.length > 0 && fromContext.length <= 128) {
    // tenant isolation: ignore payload workspaceId if context present and they differ -> log but prefer context
    if (payload?.workspaceId && payload.workspaceId !== fromContext) {
      // eslint-disable-next-line no-console
      console.warn("[ShipSignal] workspaceId mismatch ignored, using context", { fromContext, payloadWorkspace: payload.workspaceId });
    }
    return fromContext;
  }
  if (payload?.workspaceId && typeof payload.workspaceId === "string" && payload.workspaceId.length > 0) {
    return payload.workspaceId;
  }
  // Forge always provides installation context; fallback only for dev with explicit warning, never silent cross-tenant leak
  // In production Forge, context.installationId is authoritative; default workspace is dev-only
  const isDev = process.env.NODE_ENV !== "production";
  if (isDev) {
    // eslint-disable-next-line no-console
    console.warn("[ShipSignal] workspaceId fallback to default (dev only)");
    return "default";
  }
  // No workspace in prod -> return empty to trigger auth error handling upstream; caller must validate
  return "";
}
