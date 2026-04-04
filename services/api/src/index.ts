import { buildApp } from "./app";
import { serve } from "@hono/node-server";
import { startRealtimeServer } from "./lib/realtime/ws-server";

const { app, config, eventBus, resolutionWorker } = buildApp({ seedMarkets: ["market-0001"] });

serve(
  {
    fetch: app.fetch,
    port: config.PORT,
  },
  (info) => {
    console.log(`Amazones API listening on http://localhost:${info.port}`);
  },
);

startRealtimeServer(config, eventBus);
console.log(`Amazones realtime gateway listening on ws://localhost:${config.WS_PORT}`);

if (config.RESOLUTION_WORKER_ENABLED) {
  resolutionWorker.start(config.RESOLUTION_WORKER_INTERVAL_MS);
  console.log(`Amazones resolution worker enabled with interval ${config.RESOLUTION_WORKER_INTERVAL_MS}ms`);
}
