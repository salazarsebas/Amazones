import { Hono } from "hono";

import type { InMemoryAuditLogService } from "../lib/audit/service";

export function buildAuditRouter(auditLog: InMemoryAuditLogService): Hono {
  const router = new Hono();

  router.get("/", (c) => {
    const traceId = c.req.query("trace_id");
    return c.json({
      items: traceId ? auditLog.listByTraceId(traceId) : auditLog.all(),
    });
  });

  return router;
}
