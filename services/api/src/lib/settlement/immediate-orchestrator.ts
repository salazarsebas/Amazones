import { createHash } from "node:crypto";

import type { SettlementOrchestrator, SettlementResult } from "./types";
import type { MatchedFill } from "../orders/types";

export class ImmediateSettlementOrchestrator implements SettlementOrchestrator {
  async settle(fill: MatchedFill): Promise<SettlementResult> {
    return {
      settlementStatus: "settled",
      settlementTxHash: createHash("sha256")
        .update(
          `${fill.marketId}:${fill.buyOrderId}:${fill.sellOrderId}:${fill.shares}:${fill.price}`,
        )
        .digest("hex"),
    };
  }
}
