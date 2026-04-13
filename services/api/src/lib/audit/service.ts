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
  private persistState?: () => void;

  setPersistenceHandler(handler: () => void): void {
    this.persistState = handler;
  }

  write(entry: Omit<AuditLogEntry, "id" | "createdAt">): AuditLogEntry {
    const record: AuditLogEntry = {
      ...entry,
      id: randomUUID(),
      createdAt: new Date().toISOString(),
    };
    this.entries.push(record);
    this.persistState?.();
    return record;
  }

  listByTraceId(traceId: string): AuditLogEntry[] {
    return this.entries.filter((entry) => entry.traceId === traceId);
  }

  all(): AuditLogEntry[] {
    return [...this.entries];
  }

  load(entries: AuditLogEntry[]): void {
    this.entries.splice(0, this.entries.length, ...entries);
  }
}
