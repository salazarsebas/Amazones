import { Hono } from "hono";

import type { InMemoryAuditLogService } from "../lib/audit/service";

export function buildAuditRouter(auditLog: InMemoryAuditLogService): Hono {
  const router = new Hono();

  router.get("/", (c) => {
    const traceId = c.req.query("trace_id");
    const entityId = c.req.query("entity_id");
    const entityType = c.req.query("entity_type");
    const actorId = c.req.query("actor_id");
    const limit = Number(c.req.query("limit") ?? "100");
    const filtered = auditLog
      .all()
      .filter((entry) => (traceId ? entry.traceId === traceId : true))
      .filter((entry) => (entityId ? entry.entityId === entityId : true))
      .filter((entry) => (entityType ? entry.entityType === entityType : true))
      .filter((entry) => (actorId ? entry.actorId === actorId : true))
      .slice(-Math.max(1, Math.min(limit, 500)))
      .reverse();
    return c.json({
      items: filtered,
    });
  });

  return router;
}
