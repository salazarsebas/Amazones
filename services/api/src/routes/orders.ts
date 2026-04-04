import { Hono } from "hono";
import { z } from "zod";

import { AppError, errorPayload } from "../lib/errors";
import type { InMemoryOrderService } from "../lib/orders/order-service";
import type { AuthenticatedVariables } from "../lib/auth/middleware";

const orderRequestSchema = z.object({
  market_id: z.string().min(1),
  side: z.enum(["yes", "no"]),
  action: z.enum(["buy", "sell"]),
  price: z.number().gt(0).lt(1),
  shares: z.number().positive(),
  expires_at: z.iso.datetime(),
  nonce: z.string().min(1),
  signature: z.string().min(1),
  client_order_id: z.string().min(1).optional(),
});

export function buildOrdersRouter(orderService: InMemoryOrderService): Hono<{
  Variables: AuthenticatedVariables;
}> {
  const router = new Hono<{
    Variables: AuthenticatedVariables;
  }>();

  router.post("/", async (c) => {
    const body = orderRequestSchema.safeParse(await c.req.json());
    if (!body.success) {
      return c.json(
        errorPayload(
          new AppError("invalid_request", "Order request body is invalid", 400, {
            issues: body.error.issues,
          }),
        ),
        400,
      );
    }

    try {
      const { order, fills } = await orderService.submit({
        marketId: body.data.market_id,
        walletAddress: c.get("walletAddress") as string,
        side: body.data.side,
        action: body.data.action,
        price: body.data.price,
        shares: body.data.shares,
        expiresAt: body.data.expires_at,
        nonce: body.data.nonce,
        signature: body.data.signature,
        clientOrderId: body.data.client_order_id,
      });

      return c.json({
        order_id: order.id,
        market_id: order.marketId,
        status: order.status,
        accepted_at: order.acceptedAt,
        fills: fills.map((fill: {
          id: string;
          price: number;
          shares: number;
          settlementStatus: string;
          settlementTxHash: string;
        }) => ({
          fill_id: fill.id,
          price: fill.price,
          shares: fill.shares,
          settlement_status: fill.settlementStatus,
          settlement_tx_hash: fill.settlementTxHash,
        })),
      }, 202);
    } catch (error) {
      if (error instanceof AppError) {
        return c.json(
          errorPayload(error),
          error.status as 400 | 401 | 404 | 409,
        );
      }
      throw error;
    }
  });

  return router;
}
