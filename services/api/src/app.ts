import { Hono } from "hono";
import { Pool } from "pg";

import { loadConfig } from "./config";
import { InMemoryAuditLogService } from "./lib/audit/service";
import { InMemoryAgentService } from "./lib/agents/service";
import { attachTraceId } from "./lib/audit/middleware";
import { InMemoryChallengeStore } from "./lib/auth/challenge-store";
import { PostgresChallengeStore } from "./lib/auth/postgres-challenge-store";
import { requireBearerAuth } from "./lib/auth/middleware";
import { WalletAuthService } from "./lib/auth/wallet-auth";
import { InMemoryMarketCatalog } from "./lib/markets/service";
import { InMemoryOrderService } from "./lib/orders/order-service";
import { RealtimeEventBus } from "./lib/realtime/event-bus";
import { ObservabilityService } from "./lib/observability/service";
import { InMemoryResolutionService } from "./lib/resolution/service";
import { ResolutionWorker } from "./lib/resolution/worker";
import { PostgresSnapshotStore } from "./lib/state/postgres-store";
import { JsonSnapshotStore } from "./lib/state/snapshot-store";
import type { DurableStateStore } from "./lib/state/types";
import { ImmediateSettlementOrchestrator } from "./lib/settlement/immediate-orchestrator";
import { StellarCliSettlementOrchestrator } from "./lib/settlement/stellar-cli-orchestrator";
import { DevelopmentX402Service } from "./lib/x402/service";
import { buildAuditRouter } from "./routes/audit";
import { registerHealthRoutes } from "./routes/health";
import { buildAuthRouter } from "./routes/auth";
import { buildAgentsRouter } from "./routes/agents";
import { buildDataRouter } from "./routes/data";
import { buildMarketsRouter } from "./routes/markets";
import { buildOrdersRouter } from "./routes/orders";
import { buildPortfolioRouter } from "./routes/portfolio";
import { buildResolutionRouter } from "./routes/resolutions";

export async function buildApp(options?: { seedMarkets?: string[]; enableSnapshots?: boolean }) {
  const config = loadConfig();
  const app = new Hono();
  const observability = new ObservabilityService();
  const allowedOrigins = new Set([
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:3100",
    "http://127.0.0.1:3100",
  ]);
  const snapshotPersistenceEnabled = options?.enableSnapshots ?? process.env.NODE_ENV !== "test";
  const pool =
    config.PERSISTENCE_MODE === "postgres"
      ? new Pool({
          connectionString: config.DATABASE_URL,
        })
      : null;
  const stateStore: DurableStateStore | null =
    config.PERSISTENCE_MODE === "postgres" && pool
      ? new PostgresSnapshotStore(pool)
      : config.PERSISTENCE_MODE === "snapshot" && snapshotPersistenceEnabled
        ? new JsonSnapshotStore(config.STATE_SNAPSHOT_PATH)
        : null;
  const auditLog = new InMemoryAuditLogService();
  const eventBus = new RealtimeEventBus();
  const agentService = new InMemoryAgentService(config, auditLog, eventBus);
  const challengeStore =
    config.PERSISTENCE_MODE === "postgres" && pool
      ? new PostgresChallengeStore(pool)
      : new InMemoryChallengeStore();
  const walletAuth = new WalletAuthService(config, challengeStore);
  const marketCatalog = new InMemoryMarketCatalog();
  const x402Service = new DevelopmentX402Service(config);
  const settlementOrchestrator =
    config.SETTLEMENT_MODE === "stellar-cli"
      ? new StellarCliSettlementOrchestrator(config)
      : new ImmediateSettlementOrchestrator();
  const orderService = new InMemoryOrderService(
    marketCatalog,
    settlementOrchestrator,
    auditLog,
    eventBus,
    agentService,
  );
  const resolutionService = new InMemoryResolutionService(marketCatalog, agentService);
  const resolutionWorker = new ResolutionWorker(resolutionService, auditLog, eventBus);
  let persistenceAvailable = stateStore ? await stateStore.exists() : false;
  const persistState = () => {
    if (!stateStore) {
      return;
    }
    const orderSnapshot = orderService.snapshot();
    void stateStore
      .save({
        markets: marketCatalog.list(),
        agents: agentService.snapshot(),
        orders: orderSnapshot.orders,
        fills: orderSnapshot.fills,
        proposals: resolutionService.list(),
        auditEntries: auditLog.all(),
      })
      .then(() => {
        persistenceAvailable = true;
      });
  };

  auditLog.setPersistenceHandler(persistState);
  marketCatalog.setPersistenceHandler(persistState);
  agentService.setPersistenceHandler(persistState);
  orderService.setPersistenceHandler(persistState);
  resolutionService.setPersistenceHandler(persistState);

  const snapshot = stateStore ? await stateStore.load() : null;
  if (snapshot) {
    marketCatalog.load(snapshot.markets);
    agentService.load(snapshot.agents);
    orderService.load({ orders: snapshot.orders, fills: snapshot.fills });
    resolutionService.load(snapshot.proposals);
    auditLog.load(snapshot.auditEntries);
  }

  for (const marketId of options?.seedMarkets ?? []) {
    orderService.seedMarket(marketId);
  }

  app.use("*", attachTraceId());
  app.use("*", async (c, next) => {
    const origin = c.req.header("origin");
    const allowOrigin = origin && allowedOrigins.has(origin) ? origin : null;

    if (allowOrigin) {
      c.header("Access-Control-Allow-Origin", allowOrigin);
      c.header("Vary", "Origin");
    }
    c.header("Access-Control-Allow-Methods", "GET,POST,PATCH,OPTIONS");
    c.header("Access-Control-Allow-Headers", "Content-Type, Authorization, X-PAYMENT");
    c.header("Access-Control-Max-Age", "86400");

    if (c.req.method === "OPTIONS") {
      return c.body(null, 204);
    }

    await next();
  });
  app.use("*", async (c, next) => {
    const startedAt = performance.now();
    await next();
    const durationMs = performance.now() - startedAt;
    observability.recordHttp(c.req.method, c.req.path, c.res.status, durationMs);
    console.log(JSON.stringify({
      trace_id: c.res.headers.get("x-trace-id"),
      method: c.req.method,
      path: c.req.path,
      status: c.res.status,
      duration_ms: Number(durationMs.toFixed(2)),
      emitted_at: new Date().toISOString(),
    }));
  });
  registerHealthRoutes(app, {
    observability,
    state: () => {
      const orderCounts = orderService.counts();
      return {
        markets: marketCatalog.list().length,
        agents: agentService.counts().agents,
        orders: orderCounts.orders,
        fills: orderCounts.fills,
        proposals: resolutionService.list().length,
        auditEntries: auditLog.all().length,
        persistenceAvailable,
        persistenceMode: config.PERSISTENCE_MODE ?? "memory",
        persistenceTarget: stateStore?.describe() ?? "memory",
        channelCount: eventBus.channelCount(),
      };
    },
  });

  app.route("/v1/auth", buildAuthRouter(walletAuth));
  app.route("/v1/markets", buildMarketsRouter(marketCatalog, orderService, x402Service));
  app.route("/v1/data", buildDataRouter(marketCatalog, x402Service));
  app.route("/v1/agents", buildAgentsRouter(agentService, config, x402Service));
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

  return { app, config, eventBus, resolutionWorker, observability };
}
