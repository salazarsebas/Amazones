import { randomUUID } from "node:crypto";

export interface AuditLogEntry {
  id: string;
  traceId: string;
  actorType: string;
  actorId: string;
  eventType: string;
  entityType: string;
  entityId: string;
  payload: Record<string, unknown>;
  createdAt: string;
}

export class InMemoryAuditLogService {
  private readonly entries: AuditLogEntry[] = [];

  write(entry: Omit<AuditLogEntry, "id" | "createdAt">): AuditLogEntry {
    const record: AuditLogEntry = {
      ...entry,
      id: randomUUID(),
      createdAt: new Date().toISOString(),
    };
    this.entries.push(record);
    return record;
  }

  listByTraceId(traceId: string): AuditLogEntry[] {
    return this.entries.filter((entry) => entry.traceId === traceId);
  }

  all(): AuditLogEntry[] {
    return [...this.entries];
  }
}
