import { z } from "zod";

const envSchema = z.object({
  PORT: z.coerce.number().int().positive().default(3001),
  WS_PORT: z.coerce.number().int().positive().default(3002),
  API_BASE_URL: z.url().default("http://localhost:3001"),
  JWT_SECRET: z.string().min(32, "JWT_SECRET must be at least 32 characters"),
  AUTH_CHALLENGE_TTL_SECONDS: z.coerce.number().int().positive().default(300),
  ACCESS_TOKEN_TTL_SECONDS: z.coerce.number().int().positive().default(3600),
  RESOLUTION_WORKER_ENABLED: z
    .string()
    .optional()
    .transform((value) => value === "true")
    .default(false),
  RESOLUTION_WORKER_INTERVAL_MS: z.coerce.number().int().positive().default(5000),
  SETTLEMENT_MODE: z.enum(["immediate", "stellar-cli"]).default("immediate"),
  SETTLEMENT_FEE_BPS: z.coerce.number().int().min(0).max(10_000).default(100),
  STELLAR_CLI_BIN: z.string().default("stellar"),
  STELLAR_CONFIG_DIR: z.string().optional(),
  STELLAR_NETWORK: z.string().default("testnet"),
  STELLAR_SOURCE_ACCOUNT: z.string().optional(),
  MARKET_CORE_CONTRACT_IDS_JSON: z.string().default("{}"),
  X402_MODE: z.enum(["disabled", "development"]).default("development"),
  X402_NETWORK: z.string().default("stellar-testnet"),
  X402_ASSET: z.string().default("USDC"),
  X402_PAY_TO: z.string().default("amazones-premium-seller"),
  X402_FACILITATOR_URL: z
    .url()
    .default("https://facilitator.testnet.amazones.local/x402"),
  X402_CHALLENGE_TTL_SECONDS: z.coerce.number().int().positive().default(300),
  X402_HMAC_SECRET: z
    .string()
    .min(32, "X402_HMAC_SECRET must be at least 32 characters")
    .default("amazones-x402-development-secret-change-me"),
  AGENT_PROVIDER_ENCRYPTION_KEY: z
    .string()
    .min(32, "AGENT_PROVIDER_ENCRYPTION_KEY must be at least 32 characters")
    .default("amazones-agent-provider-key-change-me-now"),
});

export type AppConfig = z.infer<typeof envSchema>;

export function loadConfig(env: Record<string, string | undefined> = process.env): AppConfig {
  return envSchema.parse(env);
}
