import { createHash, randomUUID } from "node:crypto";

import { Keypair, StrKey } from "stellar-sdk";

import { AppError } from "../errors";
import type { InMemoryAgentService } from "../agents/service";
import type { InMemoryAuditLogService } from "../audit/service";
import type { InMemoryMarketCatalog } from "../markets/service";
import type { RealtimeEventBus } from "../realtime/event-bus";
import type { SettlementOrchestrator } from "../settlement/types";
import type {
  DepthLevel,
  MarketDepthSnapshot,
  MatchedFill,
  OrderSubmissionInput,
  OrderSubmissionResult,
  PortfolioPosition,
  PortfolioSnapshot,
  StoredOrder,
} from "./types";

function canonicalOrderPayload(input: OrderSubmissionInput): string {
  return [
    "Amazones Order Intent",
    `market_id:${input.marketId}`,
    `wallet_address:${input.walletAddress}`,
    `side:${input.side}`,
    `action:${input.action}`,
    `price:${input.price.toFixed(6)}`,
    `shares:${input.shares.toFixed(6)}`,
    `expires_at:${input.expiresAt}`,
    `nonce:${input.nonce}`,
    `client_order_id:${input.clientOrderId ?? ""}`,
  ].join("\n");
}

function parseSignature(signature: string): Buffer {
  const trimmed = signature.trim();
  if (/^[a-fA-F0-9]+$/.test(trimmed) && trimmed.length % 2 === 0) {
    return Buffer.from(trimmed, "hex");
  }
  return Buffer.from(trimmed, "base64");
}

export class InMemoryOrderService {
  private readonly orders = new Map<string, StoredOrder>();
  private readonly fills: MatchedFill[] = [];

  constructor(
    private readonly markets: InMemoryMarketCatalog,
    private readonly settlementOrchestrator: SettlementOrchestrator,
    private readonly auditLog: InMemoryAuditLogService,
    private readonly eventBus: RealtimeEventBus,
    private readonly agentService?: InMemoryAgentService,
  ) {}

  seedMarket(marketId: string): void {
    if (!this.markets.exists(marketId)) {
      this.markets.seed([
        {
          id: marketId,
          title: marketId,
          status: "open",
          resolveTime: new Date(Date.now() + 86_400_000).toISOString(),
          resolutionPolicy: {
            kind: "optimistic",
            challengePeriodHours: 48,
          },
        },
      ]);
    }
  }

  async submit(input: OrderSubmissionInput): Promise<OrderSubmissionResult> {
    if (!this.markets.exists(input.marketId)) {
      throw new AppError("unknown_market", "Market does not exist", 404, {
        market_id: input.marketId,
      });
    }
    if (!StrKey.isValidEd25519PublicKey(input.walletAddress)) {
      throw new AppError("invalid_wallet_address", "Wallet address is not a valid Stellar public key");
    }
    if (input.price <= 0 || input.price >= 1) {
      throw new AppError("invalid_price", "Price must be greater than 0 and less than 1", 400);
    }
    if (input.shares <= 0) {
      throw new AppError("invalid_shares", "Shares must be positive", 400);
    }

    const expiresAt = new Date(input.expiresAt);
    if (Number.isNaN(expiresAt.getTime())) {
      throw new AppError("invalid_expiry", "expires_at must be a valid ISO timestamp", 400);
    }
    if (expiresAt.getTime() <= Date.now()) {
      throw new AppError("order_expired", "Order expiry must be in the future", 400);
    }

    const payload = canonicalOrderPayload(input);
    const verified = Keypair.fromPublicKey(input.walletAddress).verify(
      Buffer.from(payload, "utf8"),
      parseSignature(input.signature),
    );
    if (!verified) {
      throw new AppError("invalid_signature", "Order signature verification failed", 401);
    }

    const agent = this.agentService?.assertTradeAllowed(
      input.walletAddress,
      input.marketId,
      input.price * input.shares,
      {
        openPositions: this.getPortfolio(input.walletAddress).positions.length,
        totalNotionalTodayUsdc: this.totalNotionalToday(input.walletAddress),
        marketNotionalTodayUsdc: this.marketNotionalToday(input.walletAddress, input.marketId),
      },
    ) ?? null;

    const orderHash = createHash("sha256").update(payload).digest("hex");
    for (const order of this.orders.values()) {
      if (order.orderHash === orderHash) {
        throw new AppError("duplicate_order", "Identical order has already been submitted", 409, {
          existing_order_id: order.id,
        });
      }
      if (
        order.walletAddress === input.walletAddress &&
        order.nonce === input.nonce &&
        order.status !== "cancelled" &&
        order.status !== "rejected"
      ) {
        throw new AppError("duplicate_nonce", "Nonce has already been used", 409);
      }
    }

    const stored: StoredOrder = {
      ...input,
      id: randomUUID(),
      status: "accepted",
      acceptedAt: new Date().toISOString(),
      orderHash,
      remainingShares: input.shares,
      originalShares: input.shares,
    };

    this.orders.set(stored.id, stored);
    const fills = await this.match(stored);
    this.auditLog.write({
      traceId: `order:${stored.id}`,
      actorType: "wallet",
      actorId: stored.walletAddress,
      eventType: "order.accepted",
      entityType: "order",
      entityId: stored.id,
      payload: {
        market_id: stored.marketId,
        status: stored.status,
        fills: fills.length,
      },
    });
    this.eventBus.publish({
      channel: `market:${stored.marketId}:book`,
      type: "order.accepted",
      payload: {
        orderId: stored.id,
        marketId: stored.marketId,
        status: stored.status,
      },
      emittedAt: new Date().toISOString(),
    });
    if (agent) {
      this.agentService?.recordExecution(agent, "agent.trade_submitted", {
        order_id: stored.id,
        market_id: stored.marketId,
        status: stored.status,
      });
    }
    return { order: this.orders.get(stored.id) ?? stored, fills };
  }

  getDepth(marketId: string): MarketDepthSnapshot {
    if (!this.markets.exists(marketId)) {
      throw new AppError("unknown_market", "Market does not exist", 404, {
        market_id: marketId,
      });
    }

    const bids = aggregateDepth(
      [...this.orders.values()].filter(
        (order) =>
          order.marketId === marketId &&
          order.action === "buy" &&
          (order.status === "accepted" || order.status === "partially_filled") &&
          order.remainingShares > 0,
      ),
    );
    const asks = aggregateDepth(
      [...this.orders.values()].filter(
        (order) =>
          order.marketId === marketId &&
          order.action === "sell" &&
          (order.status === "accepted" || order.status === "partially_filled") &&
          order.remainingShares > 0,
      ),
    );

    return {
      marketId,
      bids,
      asks,
      updatedAt: new Date().toISOString(),
    };
  }

  getPortfolio(walletAddress: string): PortfolioSnapshot {
    const fills = this.fills.filter(
      (fill) => fill.buyerWallet === walletAddress || fill.sellerWallet === walletAddress,
    );

    const positions = new Map<string, PortfolioPosition & {
      yesCost: number;
      noCost: number;
      yesCount: number;
      noCount: number;
    }>();

    for (const fill of fills) {
      const position = positions.get(fill.marketId) ?? {
        marketId: fill.marketId,
        yesShares: 0,
        noShares: 0,
        avgYesPrice: 0,
        avgNoPrice: 0,
        yesCost: 0,
        noCost: 0,
        yesCount: 0,
        noCount: 0,
      };

      if (fill.buyerWallet === walletAddress) {
        if (fill.side === "yes") {
          position.yesShares += fill.shares;
          position.yesCost += fill.price * fill.shares;
          position.yesCount += fill.shares;
        } else {
          position.noShares += fill.shares;
          position.noCost += fill.price * fill.shares;
          position.noCount += fill.shares;
        }
      }

      if (fill.sellerWallet === walletAddress) {
        if (fill.side === "yes") {
          position.noShares += fill.shares;
          position.noCost += (1 - fill.price) * fill.shares;
          position.noCount += fill.shares;
        } else {
          position.yesShares += fill.shares;
          position.yesCost += (1 - fill.price) * fill.shares;
          position.yesCount += fill.shares;
        }
      }

      positions.set(fill.marketId, position);
    }

    return {
      walletAddress,
      cashBalanceUsdc: "0",
      positions: [...positions.values()].map((position) => ({
        marketId: position.marketId,
        yesShares: position.yesShares,
        noShares: position.noShares,
        avgYesPrice: position.yesCount > 0 ? position.yesCost / position.yesCount : 0,
        avgNoPrice: position.noCount > 0 ? position.noCost / position.noCount : 0,
      })),
      updatedAt: new Date().toISOString(),
    };
  }

  private async match(incoming: StoredOrder): Promise<MatchedFill[]> {
    const candidates = [...this.orders.values()]
      .filter((order) =>
        order.id !== incoming.id &&
        order.marketId === incoming.marketId &&
        order.side === incoming.side &&
        order.action !== incoming.action &&
        order.remainingShares > 0 &&
        (order.status === "accepted" || order.status === "partially_filled"),
      )
      .sort((a, b) => {
        if (incoming.action === "buy") {
          return a.price - b.price || a.acceptedAt.localeCompare(b.acceptedAt);
        }
        return b.price - a.price || a.acceptedAt.localeCompare(b.acceptedAt);
      });

    const fills: MatchedFill[] = [];

    for (const resting of candidates) {
      if (incoming.remainingShares <= 0) {
        break;
      }

      const crossed =
        incoming.action === "buy"
          ? incoming.price >= resting.price
          : incoming.price <= resting.price;

      if (!crossed) {
        continue;
      }

      const matchedShares = Math.min(incoming.remainingShares, resting.remainingShares);
      if (matchedShares <= 0) {
        continue;
      }

      const executionPrice = resting.price;
      incoming.remainingShares -= matchedShares;
      resting.remainingShares -= matchedShares;
      incoming.status = incoming.remainingShares === 0 ? "filled" : "partially_filled";
      resting.status = resting.remainingShares === 0 ? "filled" : "partially_filled";
      this.orders.set(resting.id, resting);
      this.orders.set(incoming.id, incoming);

      const buyer = incoming.action === "buy" ? incoming : resting;
      const seller = incoming.action === "sell" ? incoming : resting;
      const now = new Date().toISOString();
      const draftFill: MatchedFill = {
        id: randomUUID(),
        marketId: incoming.marketId,
        buyOrderId: buyer.id,
        sellOrderId: seller.id,
        buyerWallet: buyer.walletAddress,
        sellerWallet: seller.walletAddress,
        side: incoming.side,
        price: executionPrice,
        shares: matchedShares,
        settlementId: randomUUID().replaceAll("-", ""),
        settlementStatus: "pending",
        settlementTxHash: "",
        createdAt: now,
        settledAt: now,
      };
      const settlement = await this.settlementOrchestrator.settle(draftFill);
      const fill: MatchedFill = {
        ...draftFill,
        settlementStatus: settlement.settlementStatus,
        settlementTxHash: settlement.settlementTxHash,
      };
      this.fills.push(fill);
      fills.push(fill);
      this.auditLog.write({
        traceId: `fill:${fill.id}`,
        actorType: "engine",
        actorId: "matching-engine",
        eventType: "fill.settled",
        entityType: "fill",
        entityId: fill.id,
        payload: {
          market_id: fill.marketId,
          settlement_tx_hash: fill.settlementTxHash,
          shares: fill.shares,
          price: fill.price,
        },
      });
      this.eventBus.publish({
        channel: `market:${fill.marketId}:trades`,
        type: "fill.settled",
        payload: fill,
        emittedAt: new Date().toISOString(),
      });
      const buyerAgent = this.agentService?.getByWallet(fill.buyerWallet);
      const sellerAgent = this.agentService?.getByWallet(fill.sellerWallet);
      if (buyerAgent) {
        this.agentService?.recordExecution(buyerAgent, "agent.fill_settled", {
          fill_id: fill.id,
          role: "buyer",
          market_id: fill.marketId,
          shares: fill.shares,
          price: fill.price,
        });
      }
      if (sellerAgent) {
        this.agentService?.recordExecution(sellerAgent, "agent.fill_settled", {
          fill_id: fill.id,
          role: "seller",
          market_id: fill.marketId,
          shares: fill.shares,
          price: fill.price,
        });
      }
    }

    if (incoming.remainingShares === incoming.originalShares) {
      incoming.status = "accepted";
      this.orders.set(incoming.id, incoming);
    }

    return fills;
  }

  private totalNotionalToday(walletAddress: string): number {
    const today = new Date().toISOString().slice(0, 10);
    return this.fills
      .filter(
        (fill) =>
          fill.createdAt.startsWith(today) &&
          (fill.buyerWallet === walletAddress || fill.sellerWallet === walletAddress),
      )
      .reduce((sum, fill) => sum + fill.price * fill.shares, 0);
  }

  private marketNotionalToday(walletAddress: string, marketId: string): number {
    const today = new Date().toISOString().slice(0, 10);
    return this.fills
      .filter(
        (fill) =>
          fill.createdAt.startsWith(today) &&
          fill.marketId === marketId &&
          (fill.buyerWallet === walletAddress || fill.sellerWallet === walletAddress),
      )
      .reduce((sum, fill) => sum + fill.price * fill.shares, 0);
  }
}

export { canonicalOrderPayload };

function aggregateDepth(orders: StoredOrder[]): DepthLevel[] {
  const byPrice = new Map<number, number>();

  for (const order of orders) {
    const current = byPrice.get(order.price) ?? 0;
    byPrice.set(order.price, current + order.remainingShares);
  }

  return [...byPrice.entries()]
    .map(([price, shares]) => ({ price, shares }))
    .sort((a, b) => b.price - a.price);
}
