import { Hono } from "hono";

import type { ObservabilityService } from "../lib/observability/service";

export function registerHealthRoutes(app: Hono, deps: {
  observability: ObservabilityService;
  state: () => {
    markets: number;
    agents: number;
    orders: number;
    fills: number;
    proposals: number;
    auditEntries: number;
    persistenceAvailable: boolean;
    persistenceMode: string;
    persistenceTarget: string;
    channelCount: number;
  };
}): void {
  app.get("/healthz", (c) =>
    c.json({
      ok: true,
      service: "amazones-api",
      timestamp: new Date().toISOString(),
      ...deps.state(),
    }),
  );

  app.get("/readyz", (c) => {
    const state = deps.state();
    return c.json({
      ok: state.persistenceAvailable || state.markets > 0,
      timestamp: new Date().toISOString(),
      ...state,
    }, state.persistenceAvailable || state.markets > 0 ? 200 : 503);
  });

  app.get("/metrics", (c) => {
    const body = deps.observability.renderPrometheus(deps.state());
    c.header("content-type", "text/plain; version=0.0.4");
    return c.body(body);
  });
}
