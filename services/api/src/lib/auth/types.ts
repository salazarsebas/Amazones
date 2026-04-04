export interface AuthChallengeRecord {
  id: string;
  walletAddress: string;
  challengeText: string;
  expiresAt: Date;
  agentName?: string;
  consumedAt?: Date;
}

export interface AccessTokenClaims {
  sub: string;
  wallet_address: string;
  tier: "public" | "basic-agent" | "pro-agent" | "resolver";
  challenge_id: string;
}
