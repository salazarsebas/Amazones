export type OrderSide = "yes" | "no";
export type OrderAction = "buy" | "sell";

export type OrderIntentInput = {
  marketId: string;
  walletAddress: string;
  side: OrderSide;
  action: OrderAction;
  price: number;
  shares: number;
  expiresAt: string;
  nonce: string;
  clientOrderId?: string;
};

export function canonicalOrderPayload(input: OrderIntentInput): string {
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
