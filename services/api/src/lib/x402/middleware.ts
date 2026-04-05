import type { MiddlewareHandler } from "hono";

import { AppError, errorPayload } from "../errors";
import type { DevelopmentX402Service, X402ChallengeSpec } from "./service";

export function requireX402Payment(
  service: DevelopmentX402Service,
  specFactory: (path: string) => X402ChallengeSpec,
): MiddlewareHandler {
  return async (c, next) => {
    const spec = specFactory(c.req.path);

    try {
      service.verifyPaymentHeader(c.req.header("x-payment"), spec);
      await next();
    } catch (error) {
      if (error instanceof AppError && error.status === 402) {
        return c.json(errorPayload(error), 402);
      }
      throw error;
    }
  };
}
