import { execFile } from "node:child_process";
import { promisify } from "node:util";

import type { AppConfig } from "../../config";
import type { MatchedFill } from "../orders/types";
import type { SettlementOrchestrator, SettlementResult } from "./types";

const execFileAsync = promisify(execFile);

function buildSettlementId(fill: MatchedFill): string {
  return fill.settlementId.padEnd(64, "0").slice(0, 64);
}

function marketContractMap(config: AppConfig): Record<string, string> {
  try {
    return JSON.parse(config.MARKET_CORE_CONTRACT_IDS_JSON) as Record<string, string>;
  } catch {
    return {};
  }
}

function extractTxHash(output: string): string {
  const match = output.match(/explorer\/testnet\/tx\/([a-f0-9]{64})/i);
  return match?.[1] ?? "";
}

export class StellarCliSettlementOrchestrator implements SettlementOrchestrator {
  constructor(private readonly config: AppConfig) {}

  async settle(fill: MatchedFill): Promise<SettlementResult> {
    const contracts = marketContractMap(this.config);
    const contractId = contracts[fill.marketId];
    if (!contractId || !this.config.STELLAR_SOURCE_ACCOUNT) {
      return {
        settlementStatus: "failed",
        settlementTxHash: "",
      };
    }

    const request = JSON.stringify({
      buyer: fill.buyerWallet,
      seller: fill.sellerWallet,
      side: fill.side,
      price_bps: Math.round(fill.price * 10_000),
      shares: String(Math.round(fill.shares)),
      fee_bps: this.config.SETTLEMENT_FEE_BPS,
      settlement_id: buildSettlementId(fill),
    });

    const args = [
      "contract",
      "invoke",
      "--id",
      contractId,
      "--network",
      this.config.STELLAR_NETWORK,
      "--source",
      this.config.STELLAR_SOURCE_ACCOUNT,
    ];

    if (this.config.STELLAR_CONFIG_DIR) {
      args.push("--config-dir", this.config.STELLAR_CONFIG_DIR);
    }

    args.push("--", "settle_trade", "--request", request);

    try {
      const result = await execFileAsync(this.config.STELLAR_CLI_BIN, args, {
        cwd: process.cwd(),
      });
      const output = `${result.stdout}\n${result.stderr}`;
      return {
        settlementStatus: "settled",
        settlementTxHash: extractTxHash(output),
      };
    } catch (error) {
      return {
        settlementStatus: "failed",
        settlementTxHash: "",
      };
    }
  }
}
