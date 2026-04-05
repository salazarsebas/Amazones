import { createHmac, timingSafeEqual } from "node:crypto";

import type { AppConfig } from "../../config";
import { AppError } from "../errors";

export type PremiumProductId =
  | "market_depth"
  | "market_semantic"
  | "agent_analytics"
  | "latam_election_pack";

export interface X402ChallengeSpec {
  productId: PremiumProductId;
  resource: string;
  method: string;
  amountUsdc: string;
  description: string;
}

interface SignedPaymentEnvelope extends X402ChallengeSpec {
  network: string;
  asset: string;
  payTo: string;
  expiresAt: string;
}

export interface VerifiedPremiumPayment {
  productId: PremiumProductId;
  resource: string;
  amountUsdc: string;
  payTo: string;
  network: string;
  verifiedAt: string;
  verificationMode: "development-token";
}

function base64UrlEncode(value: string): string {
  return Buffer.from(value, "utf8").toString("base64url");
}

function base64UrlDecode(value: string): string {
  return Buffer.from(value, "base64url").toString("utf8");
}

function constantTimeEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left, "utf8");
  const rightBuffer = Buffer.from(right, "utf8");
  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }
  return timingSafeEqual(leftBuffer, rightBuffer);
}

export class DevelopmentX402Service {
  constructor(private readonly config: AppConfig) {}

  createChallenge(spec: X402ChallengeSpec) {
    const expiresAt = new Date(
      Date.now() + this.config.X402_CHALLENGE_TTL_SECONDS * 1000,
    ).toISOString();
    const envelope: SignedPaymentEnvelope = {
      ...spec,
      network: this.config.X402_NETWORK,
      asset: this.config.X402_ASSET,
      payTo: this.config.X402_PAY_TO,
      expiresAt,
    };
    const payload = JSON.stringify(envelope);
    const encodedPayload = base64UrlEncode(payload);
    const signature = this.sign(encodedPayload);

    return {
      envelope,
      token: `${encodedPayload}.${signature}`,
      verificationMode: "development-token" as const,
    };
  }

  buildPaymentRequiredPayload(spec: X402ChallengeSpec) {
    const challenge = this.createChallenge(spec);

    return {
      error: {
        code: "x402_payment_required",
        message: "This premium endpoint requires x402 payment",
        details: {
          product_id: spec.productId,
          verification_mode: challenge.verificationMode,
        },
      },
      payment_required: {
        scheme: "x402-stellar",
        verification_mode: challenge.verificationMode,
        network: this.config.X402_NETWORK,
        asset: this.config.X402_ASSET,
        amount_usdc: spec.amountUsdc,
        pay_to: this.config.X402_PAY_TO,
        facilitator_url: this.config.X402_FACILITATOR_URL,
        resource: spec.resource,
        method: spec.method,
        description: spec.description,
        expires_at: challenge.envelope.expiresAt,
        accepts_header: "X-PAYMENT",
        payment_token: challenge.token,
      },
    };
  }

  verifyPaymentHeader(value: string | undefined, spec: X402ChallengeSpec): VerifiedPremiumPayment {
    if (this.config.X402_MODE === "disabled") {
      return {
        productId: spec.productId,
        resource: spec.resource,
        amountUsdc: spec.amountUsdc,
        payTo: this.config.X402_PAY_TO,
        network: this.config.X402_NETWORK,
        verifiedAt: new Date().toISOString(),
        verificationMode: "development-token",
      };
    }

    if (!value) {
      throw new AppError("x402_payment_required", "This premium endpoint requires x402 payment", 402, {
        payment_required: this.buildPaymentRequiredPayload(spec).payment_required,
      });
    }

    const token = value.startsWith("X402 ") ? value.slice("X402 ".length).trim() : value.trim();
    const [encodedPayload, signature] = token.split(".");

    if (!encodedPayload || !signature) {
      throw new AppError("x402_invalid_payment", "X-PAYMENT header is malformed", 402, {
        payment_required: this.buildPaymentRequiredPayload(spec).payment_required,
      });
    }

    if (!constantTimeEqual(this.sign(encodedPayload), signature)) {
      throw new AppError("x402_invalid_payment", "X-PAYMENT signature is invalid", 402, {
        payment_required: this.buildPaymentRequiredPayload(spec).payment_required,
      });
    }

    const payload = JSON.parse(base64UrlDecode(encodedPayload)) as SignedPaymentEnvelope;
    const expiresAt = new Date(payload.expiresAt);
    if (Number.isNaN(expiresAt.getTime()) || expiresAt.getTime() <= Date.now()) {
      throw new AppError("x402_payment_expired", "X-PAYMENT token has expired", 402, {
        payment_required: this.buildPaymentRequiredPayload(spec).payment_required,
      });
    }

    if (
      payload.productId !== spec.productId ||
      payload.resource !== spec.resource ||
      payload.method !== spec.method ||
      payload.amountUsdc !== spec.amountUsdc ||
      payload.asset !== this.config.X402_ASSET ||
      payload.network !== this.config.X402_NETWORK ||
      payload.payTo !== this.config.X402_PAY_TO
    ) {
      throw new AppError("x402_invalid_payment", "X-PAYMENT does not match the requested premium resource", 402, {
        payment_required: this.buildPaymentRequiredPayload(spec).payment_required,
      });
    }

    return {
      productId: payload.productId,
      resource: payload.resource,
      amountUsdc: payload.amountUsdc,
      payTo: payload.payTo,
      network: payload.network,
      verifiedAt: new Date().toISOString(),
      verificationMode: "development-token",
    };
  }

  private sign(encodedPayload: string): string {
    return createHmac("sha256", this.config.X402_HMAC_SECRET)
      .update(encodedPayload)
      .digest("base64url");
  }
}
