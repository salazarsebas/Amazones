import { Hono } from "hono";

import { AppError, errorPayload } from "../lib/errors";
import type { InMemoryMarketCatalog } from "../lib/markets/service";
import type { InMemoryOrderService } from "../lib/orders/order-service";

export function buildMarketsRouter(
  marketCatalog: InMemoryMarketCatalog,
  orderService: InMemoryOrderService,
): Hono {
  const router = new Hono();

  router.get("/", (c) =>
    c.json({
      items: marketCatalog.list().map((market) => ({
        id: market.id,
        title: market.title,
        status: market.status,
        resolution_policy: market.resolutionPolicy,
        resolve_time: market.resolveTime,
      })),
      next_cursor: null,
    }),
  );

  router.get("/:marketId", (c) => {
    const market = marketCatalog.get(c.req.param("marketId"));
    if (!market) {
      return c.json(
        errorPayload(new AppError("unknown_market", "Market does not exist", 404)),
        404,
      );
    }
    return c.json({
      id: market.id,
      title: market.title,
      status: market.status,
      resolution_policy: market.resolutionPolicy,
      resolve_time: market.resolveTime,
      latest_outcome: market.latestOutcome ?? null,
    });
  });

  router.get("/:marketId/depth", (c) => {
    try {
      const depth = orderService.getDepth(c.req.param("marketId"));
      return c.json({
        market_id: depth.marketId,
        bids: depth.bids,
        asks: depth.asks,
        updated_at: depth.updatedAt,
      });
    } catch (error) {
      if (error instanceof AppError) {
        return c.json(errorPayload(error), error.status as 404);
      }
      throw error;
    }
  });

  return router;
}
