export type OrderSide = "yes" | "no";
export type OrderAction = "buy" | "sell";
export type OrderStatus = "accepted" | "partially_filled" | "filled" | "cancelled" | "rejected";
export type SettlementStatus = "pending" | "settled" | "failed";

export interface OrderSubmissionInput {
  marketId: string;
  walletAddress: string;
  side: OrderSide;
  action: OrderAction;
  price: number;
  shares: number;
  expiresAt: string;
  nonce: string;
  signature: string;
  clientOrderId?: string;
}

export interface StoredOrder extends OrderSubmissionInput {
  id: string;
  status: OrderStatus;
  acceptedAt: string;
  orderHash: string;
  remainingShares: number;
  originalShares: number;
}

export interface MatchedFill {
  id: string;
  marketId: string;
  buyOrderId: string;
  sellOrderId: string;
  buyerWallet: string;
  sellerWallet: string;
  side: OrderSide;
  price: number;
  shares: number;
  settlementId: string;
  settlementStatus: SettlementStatus;
  settlementTxHash: string;
  createdAt: string;
  settledAt: string;
}

export interface DepthLevel {
  price: number;
  shares: number;
}

export interface MarketDepthSnapshot {
  marketId: string;
  bids: DepthLevel[];
  asks: DepthLevel[];
  updatedAt: string;
}

export interface PortfolioPosition {
  marketId: string;
  yesShares: number;
  noShares: number;
  avgYesPrice: number;
  avgNoPrice: number;
}

export interface PortfolioSnapshot {
  walletAddress: string;
  cashBalanceUsdc: string;
  positions: PortfolioPosition[];
  updatedAt: string;
}

export interface OrderSubmissionResult {
  order: StoredOrder;
  fills: MatchedFill[];
}
