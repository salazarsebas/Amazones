import { Hono } from "hono";
import { z } from "zod";

import { AppError, errorPayload } from "../lib/errors";
import type { WalletAuthService } from "../lib/auth/wallet-auth";

const authChallengeRequestSchema = z.object({
  wallet_address: z.string().min(1),
  agent_name: z.string().min(1).max(80).optional(),
});

const authVerifyRequestSchema = z.object({
  challenge_id: z.uuid(),
  wallet_address: z.string().min(1),
  signature: z.string().min(1),
});

export function buildAuthRouter(walletAuth: WalletAuthService): Hono {
  const router = new Hono();

  router.post("/testnet-wallet", async (c) => {
    const wallet = await walletAuth.createTestnetWallet();

    return c.json(
      {
        public_key: wallet.publicKey,
        secret_seed: wallet.secretSeed,
        funding_status: wallet.fundingStatus,
        funding_detail: wallet.fundingDetail,
        seeded_assets: wallet.seededAssets,
      },
      wallet.fundingStatus === "funded" ? 201 : 202,
    );
  });

  router.post("/challenge", async (c) => {
    const body = authChallengeRequestSchema.safeParse(await c.req.json());
    if (!body.success) {
      return c.json(
        errorPayload(
          new AppError("invalid_request", "Challenge request body is invalid", 400, {
            issues: body.error.issues,
          }),
        ),
        400 as const,
      );
    }

    try {
      const challenge = await walletAuth.issueChallenge({
        walletAddress: body.data.wallet_address,
        agentName: body.data.agent_name,
      });

      return c.json({
        challenge_id: challenge.id,
        challenge_text: challenge.challengeText,
        expires_at: challenge.expiresAt.toISOString(),
      });
    } catch (error) {
      if (error instanceof AppError) {
        return c.json(errorPayload(error), error.status as 400 | 401 | 404 | 409);
      }
      throw error;
    }
  });

  router.post("/verify", async (c) => {
    const body = authVerifyRequestSchema.safeParse(await c.req.json());
    if (!body.success) {
      return c.json(
        errorPayload(
          new AppError("invalid_request", "Verify request body is invalid", 400, {
            issues: body.error.issues,
          }),
        ),
        400 as const,
      );
    }

    try {
      const verified = await walletAuth.verifyChallenge({
        challengeId: body.data.challenge_id,
        walletAddress: body.data.wallet_address,
        signature: body.data.signature,
      });

      return c.json({
        access_token: verified.accessToken,
        expires_at: verified.expiresAt.toISOString(),
        tier: verified.tier,
      });
    } catch (error) {
      if (error instanceof AppError) {
        return c.json(errorPayload(error), error.status as 400 | 401 | 404 | 409);
      }
      throw error;
    }
  });

  return router;
}
