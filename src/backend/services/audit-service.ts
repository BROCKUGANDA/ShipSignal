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

export const AuditService = {
  record(event: AuditEvent): void {
    events.push(event);
  },
  list(workspaceId: string): AuditEvent[] {
    return events.filter((e) => e.workspaceId === workspaceId);
  },
  clear(): void {
    events.length = 0;
  },
};