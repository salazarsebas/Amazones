import { Hono } from "hono";
import { z } from "zod";

import type { AuthenticatedVariables } from "../lib/auth/middleware";
import { AppError, errorPayload } from "../lib/errors";
import type { InMemoryResolutionService } from "../lib/resolution/service";

const proposeSchema = z.object({
  market_id: z.string().min(1),
  proposed_outcome: z.enum(["yes", "no", "invalid"]),
  evidence_urls: z.array(z.url()).min(1),
  explanation: z.string().optional(),
  bond_amount_usdc: z.string().min(1),
});

const challengeSchema = z.object({
  challenged_proposal_id: z.string().uuid(),
});

export function buildResolutionRouter(
  resolutionService: InMemoryResolutionService,
): Hono<{
  Variables: AuthenticatedVariables;
}> {
  const router = new Hono<{
    Variables: AuthenticatedVariables;
  }>();

  router.post("/propose", async (c) => {
    const body = proposeSchema.safeParse(await c.req.json());
    if (!body.success) {
      return c.json(
        errorPayload(
          new AppError("invalid_request", "Resolution proposal body is invalid", 400, {
            issues: body.error.issues,
          }),
        ),
        400,
      );
    }
    try {
      const proposal = resolutionService.propose({
        marketId: body.data.market_id,
        proposedOutcome: body.data.proposed_outcome,
        evidenceUrls: body.data.evidence_urls,
        explanation: body.data.explanation,
        bondAmountUsdc: body.data.bond_amount_usdc,
        proposerWallet: c.get("walletAddress") as string,
      });
      return c.json(proposal, 201);
    } catch (error) {
      if (error instanceof AppError) {
        return c.json(errorPayload(error), error.status as 400 | 404);
      }
      throw error;
    }
  });

  router.post("/challenge", async (c) => {
    const body = challengeSchema.safeParse(await c.req.json());
    if (!body.success) {
      return c.json(
        errorPayload(
          new AppError("invalid_request", "Resolution challenge body is invalid", 400, {
            issues: body.error.issues,
          }),
        ),
        400,
      );
    }
    try {
      return c.json(resolutionService.challenge({ proposalId: body.data.challenged_proposal_id }));
    } catch (error) {
      if (error instanceof AppError) {
        return c.json(errorPayload(error), error.status as 404);
      }
      throw error;
    }
  });

  return router;
}
