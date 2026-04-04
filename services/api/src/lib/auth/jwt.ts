import { jwtVerify } from "jose";

import type { AppConfig } from "../../config";
import { AppError } from "../errors";
import type { AccessTokenClaims } from "./types";

export async function verifyAccessToken(
  token: string,
  config: AppConfig,
): Promise<AccessTokenClaims> {
  const secret = new TextEncoder().encode(config.JWT_SECRET);

  try {
    const result = await jwtVerify(token, secret);
    const claims = result.payload as Partial<AccessTokenClaims>;

    if (
      typeof claims.sub !== "string" ||
      typeof claims.wallet_address !== "string" ||
      typeof claims.challenge_id !== "string" ||
      typeof claims.tier !== "string"
    ) {
      throw new AppError("invalid_token", "Access token payload is incomplete", 401);
    }

    return claims as AccessTokenClaims;
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError("invalid_token", "Access token is invalid or expired", 401);
  }
}
