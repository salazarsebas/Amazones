import { Hono } from "hono";

import type { InMemoryOrderService } from "../lib/orders/order-service";
import type { AuthenticatedVariables } from "../lib/auth/middleware";

export function buildPortfolioRouter(orderService: InMemoryOrderService): Hono<{
  Variables: AuthenticatedVariables;
}> {
  const router = new Hono<{
    Variables: AuthenticatedVariables;
  }>();

  router.get("/", (c) => {
    const portfolio = orderService.getPortfolio(c.get("walletAddress") as string);
    return c.json({
      wallet_address: portfolio.walletAddress,
      cash_balance_usdc: portfolio.cashBalanceUsdc,
      positions: portfolio.positions.map((position) => ({
        market_id: position.marketId,
        yes_shares: position.yesShares,
        no_shares: position.noShares,
        avg_yes_price: position.avgYesPrice,
        avg_no_price: position.avgNoPrice,
      })),
      updated_at: portfolio.updatedAt,
    });
  });

  return router;
}
