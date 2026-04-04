import { Hono } from "hono";

export function registerHealthRoutes(app: Hono): void {
  app.get("/healthz", (c) =>
    c.json({
      ok: true,
      service: "amazones-api",
      timestamp: new Date().toISOString(),
    }),
  );
}
