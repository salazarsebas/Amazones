import { Hono } from "hono";
import { logger } from "hono/logger";

import { loadConfig } from "./config";
import { InMemoryAuditLogService } from "./lib/audit/service";
import { attachTraceId } from "./lib/audit/middleware";
import { InMemoryChallengeStore } from "./lib/auth/challenge-store";
import { requireBearerAuth } from "./lib/auth/middleware";
import { WalletAuthService } from "./lib/auth/wallet-auth";
import { InMemoryMarketCatalog } from "./lib/markets/service";
import { InMemoryOrderService } from "./lib/orders/order-service";
import { RealtimeEventBus } from "./lib/realtime/event-bus";
import { InMemoryResolutionService } from "./lib/resolution/service";
import { ResolutionWorker } from "./lib/resolution/worker";
import { ImmediateSettlementOrchestrator } from "./lib/settlement/immediate-orchestrator";
import { StellarCliSettlementOrchestrator } from "./lib/settlement/stellar-cli-orchestrator";
import { buildAuditRouter } from "./routes/audit";
import { registerHealthRoutes } from "./routes/health";
import { buildAuthRouter } from "./routes/auth";
import { buildMarketsRouter } from "./routes/markets";
import { buildOrdersRouter } from "./routes/orders";
import { buildPortfolioRouter } from "./routes/portfolio";
import { buildResolutionRouter } from "./routes/resolutions";

export function buildApp(options?: { seedMarkets?: string[] }) {
  const config = loadConfig();
  const app = new Hono();
  const auditLog = new InMemoryAuditLogService();
  const eventBus = new RealtimeEventBus();
  const challengeStore = new InMemoryChallengeStore();
  const walletAuth = new WalletAuthService(config, challengeStore);
  const marketCatalog = new InMemoryMarketCatalog();
  const settlementOrchestrator =
    config.SETTLEMENT_MODE === "stellar-cli"
      ? new StellarCliSettlementOrchestrator(config)
      : new ImmediateSettlementOrchestrator();
  const orderService = new InMemoryOrderService(
    marketCatalog,
    settlementOrchestrator,
    auditLog,
    eventBus,
  );
  const resolutionService = new InMemoryResolutionService(marketCatalog);
  const resolutionWorker = new ResolutionWorker(resolutionService, auditLog, eventBus);

  for (const marketId of options?.seedMarkets ?? []) {
    marketCatalog.seed([
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

  app.use("*", logger());
  app.use("*", attachTraceId());
  registerHealthRoutes(app);

  app.route("/v1/auth", buildAuthRouter(walletAuth));
  app.route("/v1/markets", buildMarketsRouter(marketCatalog, orderService));
  app.use("/v1/orders/*", requireBearerAuth(config));
  app.route("/v1/orders", buildOrdersRouter(orderService));
  app.use("/v1/portfolio/*", requireBearerAuth(config));
  app.route("/v1/portfolio", buildPortfolioRouter(orderService));
  app.use("/v1/resolutions/*", requireBearerAuth(config));
  app.route("/v1/resolutions", buildResolutionRouter(resolutionService));
  app.route("/v1/audit", buildAuditRouter(auditLog));

  app.notFound((c) =>
    c.json(
      {
        error: {
          code: "not_found",
          message: "Route not found",
        },
      },
      404,
    ),
  );

  return { app, config, eventBus, resolutionWorker };
}
