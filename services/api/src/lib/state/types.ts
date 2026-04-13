import type { AgentRecord } from "../agents/types";
import type { AuditLogEntry } from "../audit/service";
import type { MarketSnapshot } from "../markets/service";
import type { MatchedFill, StoredOrder } from "../orders/types";
import type { ResolutionProposal } from "../resolution/service";

export interface AppStateSnapshot {
  version: 1;
  savedAt: string;
  markets: MarketSnapshot[];
  agents: AgentRecord[];
  orders: StoredOrder[];
  fills: MatchedFill[];
  proposals: ResolutionProposal[];
  auditEntries: AuditLogEntry[];
}

export interface DurableStateStore {
  exists(): Promise<boolean>;
  load(): Promise<AppStateSnapshot | null>;
  save(snapshot: Omit<AppStateSnapshot, "version" | "savedAt">): Promise<AppStateSnapshot>;
  describe(): string;
}
