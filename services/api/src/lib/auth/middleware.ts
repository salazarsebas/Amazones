import type { MiddlewareHandler } from "hono";

import type { AppConfig } from "../../config";
import { AppError, errorPayload } from "../errors";
import { verifyAccessToken } from "./jwt";

export interface AuthenticatedVariables {
  walletAddress: string;
  tier: string;
}

export function requireBearerAuth(config: AppConfig): MiddlewareHandler<{
  Variables: AuthenticatedVariables;
}> {
  return async (c, next) => {
    const header = c.req.header("authorization");
    if (!header?.startsWith("Bearer ")) {
      return c.json(
        errorPayload(
          new AppError("missing_token", "Bearer token is required", 401),
        ),
        401,
      );
    }

    try {
      const claims = await verifyAccessToken(header.slice("Bearer ".length), config);
      c.set("walletAddress", claims.wallet_address);
      c.set("tier", claims.tier);
      await next();
    } catch (error) {
      if (error instanceof AppError) {
        return c.json(errorPayload(error), error.status as 401);
      }
      throw error;
    }
  };
}
