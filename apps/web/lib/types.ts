export type MarketStatus =
  | "draft"
  | "open"
  | "closed"
  | "resolving"
  | "resolved"
  | "invalid";

export type ResolutionPolicy = {
  kind: "optimistic" | "reflector_numeric" | "band_numeric";
  source_urls: string[];
  resolution_time: string;
  challenge_period_hours: number;
  resolver_bond_usdc?: string;
  challenger_bond_usdc?: string;
};

export type Market = {
  id: string;
  title: string;
  description?: string;
  category: string;
  status: MarketStatus;
  yes_price: number;
  no_price: number;
  collateral_asset: string;
  close_time?: string;
  created_at?: string;
  volume_24h?: string;
  liquidity?: string;
  latest_outcome?: "yes" | "no" | "invalid" | null;
  resolution_policy: ResolutionPolicy;
  semantic_metadata?: {
    canonical_question?: string;
    tags?: string[];
    locale?: string;
    market_type?: string;
  };
};

export type AgentStatus = "draft" | "active" | "paused" | "archived";
export type AgentType = "trader" | "market-maker" | "resolver" | "hybrid";
export type ProviderKind = "claude" | "openai" | "groq" | "openai-compatible";

export type AgentPermissions = {
  trade: boolean;
  createMarkets: boolean;
  proposeResolutions: boolean;
  buyPremiumData: boolean;
};

export type AgentStrategy = {
  categories: string[];
  regions: string[];
  model?: string;
  confidenceThreshold?: number;
  aggressiveness?: "cautious" | "balanced" | "aggressive";
  stopLossPct?: number;
};

export type AgentRiskLimits = {
  dailyBudgetUsdc: number;
  perMarketBudgetUsdc: number;
  maxOpenPositions: number;
};

export type Agent = {
  id: string;
  owner_wallet: string;
  agent_wallet: string;
  name: string;
  description: string;
  agent_type: AgentType;
  provider_kind: ProviderKind;
  provider_reference_status: "configured" | "missing";
  status: AgentStatus;
  strategy: AgentStrategy;
  permissions: AgentPermissions;
  risk_limits: AgentRiskLimits;
  created_at: string;
  updated_at: string;
  activated_at?: string;
  paused_at?: string;
};
