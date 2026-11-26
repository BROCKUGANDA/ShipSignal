import { sql } from "@forge/sql";

export interface AuditEvent {
  id: string;
  workspaceId: string;
  actorId: string;
  actorType: "USER" | "SYSTEM" | "AGENT";
  operation: string;
  targetEntity: string;
  result: "SUCCESS" | "FAILURE";
  timestamp: string;
  correlationId: string;
}

const events: AuditEvent[] = [];

async function persist(event: AuditEvent): Promise<void> {
  await sql
    .prepare(
      `INSERT INTO audit_events (id, workspace_id, actor_id, actor_type, operation, target_entity, result, timestamp, correlation_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE result = VALUES(result)`
    )
    .bindParams(
      event.id,
      event.workspaceId,
      event.actorId,
      event.actorType,
      event.operation,
      event.targetEntity,
      event.result,
      event.timestamp,
      event.correlationId
    )
    .execute();
}

export const AuditService = {
  record(event: AuditEvent): void {
    events.push(event);
    void persist(event).catch((error) => {
      console.error("[ShipSignal] audit persistence failed", {
        correlationId: event.correlationId,
        operation: event.operation,
        message: (error as Error).message,
      });
    });
  },
  list(workspaceId: string): AuditEvent[] {
    return events.filter((e) => e.workspaceId === workspaceId);
  },
  async listDurable(workspaceId: string, limit = 50): Promise<AuditEvent[]> {
    const result = await sql
      .prepare<{
        id: string;
        workspace_id: string;
        actor_id: string;
        actor_type: string;
        operation: string;
        target_entity: string;
        result: string;
        timestamp: string;
        correlation_id: string;
      }>(
        `SELECT id, workspace_id, actor_id, actor_type, operation, target_entity, result, timestamp, correlation_id
         FROM audit_events WHERE workspace_id = ? ORDER BY timestamp DESC LIMIT ?`
      )
      .bindParams(workspaceId, limit)
      .execute();
    return (result.rows ?? []).map((r) => ({
      id: r.id,
      workspaceId: r.workspace_id,
      actorId: r.actor_id,
      actorType: r.actor_type as AuditEvent["actorType"],
      operation: r.operation,
      targetEntity: r.target_entity,
      result: r.result as AuditEvent["result"],
      timestamp: r.timestamp,
      correlationId: r.correlation_id,
    }));
  },
  clear(): void {
    events.length = 0;
  },
};
