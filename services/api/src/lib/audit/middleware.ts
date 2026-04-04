import { randomUUID } from "node:crypto";

import type { MiddlewareHandler } from "hono";

export interface TraceVariables {
  traceId: string;
}

export function attachTraceId(): MiddlewareHandler<{
  Variables: TraceVariables;
}> {
  return async (c, next) => {
    const traceId = c.req.header("x-trace-id") ?? randomUUID();
    c.set("traceId", traceId);
    c.header("x-trace-id", traceId);
    await next();
  };
}
