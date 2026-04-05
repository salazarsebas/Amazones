import { Hono } from "hono";

import type { InMemoryMarketCatalog } from "../lib/markets/service";
import { requireX402Payment } from "../lib/x402/middleware";
import type { DevelopmentX402Service } from "../lib/x402/service";

export function buildDataRouter(
  marketCatalog: InMemoryMarketCatalog,
  x402Service: DevelopmentX402Service,
): Hono {
  const router = new Hono();

  router.get(
    "/latam-election-pack",
    requireX402Payment(x402Service, (path) => ({
      productId: "latam_election_pack",
      resource: path,
      method: "GET",
      amountUsdc: "0.25",
      description: "Curated LATAM election market pack for agent ingestion and backtesting",
    })),
    (c) => {
      const items = marketCatalog.list().map((market) => ({
        market_id: market.id,
        title: market.title,
        category: market.category,
        status: market.status,
        resolve_time: market.resolveTime,
        semantic_metadata: market.semanticMetadata,
      }));

      return c.json({
        dataset_id: "latam-election-pack",
        title: "LATAM Election Pack",
        description: "Curated semantic market dataset for election-focused agents in Amazones.",
        version: "2026-04-05",
        item_count: items.length,
        items,
      });
    },
  );

  return router;
}
