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
    return { code: "INTERNAL_ERROR", message: error.message, retryable: false, correlationId: cid };
  }
  return { code: "INTERNAL_ERROR", message: "Unknown error.", retryable: false, correlationId: cid };
}

export function toPublicError(err: AppError): AppError {
  return { ...err, message: err.message };
}