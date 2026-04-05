import { Hono } from "hono";

import { AppError, errorPayload } from "../lib/errors";
import type { InMemoryMarketCatalog } from "../lib/markets/service";
import type { InMemoryOrderService } from "../lib/orders/order-service";
import { requireX402Payment } from "../lib/x402/middleware";
import type { DevelopmentX402Service } from "../lib/x402/service";

export function buildMarketsRouter(
  marketCatalog: InMemoryMarketCatalog,
  orderService: InMemoryOrderService,
  x402Service: DevelopmentX402Service,
): Hono {
  const router = new Hono();

  router.get("/", (c) =>
    c.json({
      items: marketCatalog.list().map((market) => ({
        id: market.id,
        title: market.title,
        description: market.description,
        category: market.category,
        status: market.status,
        collateral_asset: market.collateralAsset,
        resolution_policy: market.resolutionPolicy,
        resolve_time: market.resolveTime,
        semantic_metadata: market.semanticMetadata,
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
      description: market.description,
      category: market.category,
      status: market.status,
      collateral_asset: market.collateralAsset,
      resolution_policy: market.resolutionPolicy,
      resolve_time: market.resolveTime,
      latest_outcome: market.latestOutcome ?? null,
      semantic_metadata: market.semanticMetadata,
    });
  });

  router.get(
    "/:marketId/depth",
    requireX402Payment(x402Service, (path) => ({
      productId: "market_depth",
      resource: path,
      method: "GET",
      amountUsdc: "0.05",
      description: "Real-time order-book depth for a single prediction market",
    })),
    (c) => {
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
    },
  );

  router.get(
    "/:marketId/semantic",
    requireX402Payment(x402Service, (path) => ({
      productId: "market_semantic",
      resource: path,
      method: "GET",
      amountUsdc: "0.03",
      description: "Semantic market metadata for LLM and external agent consumption",
    })),
    (c) => {
      const market = marketCatalog.get(c.req.param("marketId"));
      if (!market) {
        return c.json(
          errorPayload(new AppError("unknown_market", "Market does not exist", 404)),
          404,
        );
      }

      return c.json({
        market_id: market.id,
        title: market.title,
        description: market.description,
        category: market.category,
        collateral_asset: market.collateralAsset,
        status: market.status,
        semantic_metadata: market.semanticMetadata,
        resolution_policy: market.resolutionPolicy,
        resolve_time: market.resolveTime,
        latest_outcome: market.latestOutcome ?? null,
      });
    },
  );

  return router;
}
