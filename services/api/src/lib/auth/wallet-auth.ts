import { randomUUID } from "node:crypto";

import { SignJWT } from "jose";
import { Keypair, StrKey } from "stellar-sdk";

import { AppError } from "../errors";
import type { AppConfig } from "../../config";
import type { ChallengeStore } from "./challenge-store";
import type { AccessTokenClaims, AuthChallengeRecord } from "./types";
import type { TestnetSeededAssetResult } from "../stellar/assets";
import { seedTestnetAssetForWallet } from "../stellar/assets";
import { fundTestnetAccount } from "../stellar/friendbot";

function toUint8Array(input: string): Uint8Array {
  return new TextEncoder().encode(input);
}

function parseSignature(signature: string): Buffer {
  const trimmed = signature.trim();
  if (/^[a-fA-F0-9]+$/.test(trimmed) && trimmed.length % 2 === 0) {
    return Buffer.from(trimmed, "hex");
  }
  return Buffer.from(trimmed, "base64");
}

function assertWalletAddress(walletAddress: string): void {
  if (!StrKey.isValidEd25519PublicKey(walletAddress)) {
    throw new AppError("invalid_wallet_address", "Wallet address is not a valid Stellar public key");
  }
}

type TestnetWalletFundingResult = {
  publicKey: string;
  secretSeed: string;
  fundingStatus: "funded" | "pending_manual_funding";
  fundingDetail?: string;
  seededAssets: TestnetSeededAssetResult[];
};

export class WalletAuthService {
  constructor(
    private readonly config: AppConfig,
    private readonly store: ChallengeStore,
  ) {}

  async issueChallenge(input: {
    walletAddress: string;
    agentName?: string;
  }): Promise<AuthChallengeRecord> {
    assertWalletAddress(input.walletAddress);

    const id = randomUUID();
    const issuedAt = new Date();
    const expiresAt = new Date(issuedAt.getTime() + this.config.AUTH_CHALLENGE_TTL_SECONDS * 1000);

    const lines = [
      "Amazones Authentication Challenge",
      `wallet:${input.walletAddress}`,
      `challenge_id:${id}`,
      `issued_at:${issuedAt.toISOString()}`,
      `expires_at:${expiresAt.toISOString()}`,
      `uri:${this.config.API_BASE_URL}/v1/auth/verify`,
    ];

    if (input.agentName) {
      lines.push(`agent_name:${input.agentName}`);
    }

    const record: AuthChallengeRecord = {
      id,
      walletAddress: input.walletAddress,
      challengeText: lines.join("\n"),
      expiresAt,
      agentName: input.agentName,
    };

    await this.store.create(record);
    return record;
  }

  async createTestnetWallet(): Promise<TestnetWalletFundingResult> {
    const keypair = Keypair.random();
    const publicKey = keypair.publicKey();
    const funding = await fundTestnetAccount(this.config.STELLAR_FRIENDBOT_URL, publicKey);
    const seededAsset =
      funding.status === "funded"
        ? await seedTestnetAssetForWallet(this.config, keypair.secret())
        : null;

    return {
      publicKey,
      secretSeed: keypair.secret(),
      fundingStatus: funding.status,
      fundingDetail: funding.detail,
      seededAssets: seededAsset ? [seededAsset] : [],
    };
  }

  async verifyChallenge(input: {
    challengeId: string;
    walletAddress: string;
    signature: string;
  }): Promise<{ accessToken: string; expiresAt: Date; tier: AccessTokenClaims["tier"] }> {
    assertWalletAddress(input.walletAddress);
    const record = await this.store.get(input.challengeId);

    if (!record) {
      throw new AppError("challenge_not_found", "Auth challenge not found or expired", 404);
    }
    if (record.consumedAt) {
      throw new AppError("challenge_already_used", "Auth challenge has already been used", 409);
    }
    if (record.walletAddress !== input.walletAddress) {
      throw new AppError("wallet_mismatch", "Challenge wallet does not match verification wallet", 400);
    }

    const signature = parseSignature(input.signature);
    const publicKey = StrKey.decodeEd25519PublicKey(input.walletAddress);
    const verified = Keypair.fromPublicKey(input.walletAddress).verify(
      Buffer.from(toUint8Array(record.challengeText)),
      signature,
    );

    if (!verified || publicKey.length !== 32) {
      throw new AppError("invalid_signature", "Wallet signature verification failed", 401);
    }

    await this.store.consume(record.id);

    const expiresAt = new Date(Date.now() + this.config.ACCESS_TOKEN_TTL_SECONDS * 1000);
    const secret = new TextEncoder().encode(this.config.JWT_SECRET);
    const token = await new SignJWT({
      wallet_address: input.walletAddress,
      tier: record.agentName ? "basic-agent" : "public",
      challenge_id: record.id,
    } satisfies Omit<AccessTokenClaims, "sub">)
      .setProtectedHeader({ alg: "HS256" })
      .setSubject(input.walletAddress)
      .setIssuedAt()
      .setExpirationTime(Math.floor(expiresAt.getTime() / 1000))
      .sign(secret);

    return {
      accessToken: token,
      expiresAt,
      tier: record.agentName ? "basic-agent" : "public",
    };
  }
}
