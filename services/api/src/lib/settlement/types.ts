import type { MatchedFill } from "../orders/types";

export interface SettlementResult {
  settlementStatus: "settled" | "failed";
  settlementTxHash: string;
}

export interface SettlementOrchestrator {
  settle(fill: MatchedFill): Promise<SettlementResult>;
}
