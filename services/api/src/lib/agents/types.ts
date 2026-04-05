export type AgentStatus = "draft" | "active" | "paused" | "archived";
export type AgentType = "trader" | "market-maker" | "resolver" | "hybrid";
export type ProviderKind = "claude" | "openai" | "groq" | "openai-compatible";

export interface AgentPermissions {
  trade: boolean;
  createMarkets: boolean;
  proposeResolutions: boolean;
  buyPremiumData: boolean;
}

export interface AgentStrategyConfig {
  categories: string[];
  regions: string[];
  model?: string;
  confidenceThreshold?: number;
  aggressiveness?: "cautious" | "balanced" | "aggressive";
  stopLossPct?: number;
}

export interface AgentRiskLimits {
  dailyBudgetUsdc: number;
  perMarketBudgetUsdc: number;
  maxOpenPositions: number;
}

export interface AgentRecord {
  id: string;
  ownerWallet: string;
  agentWallet: string;
  name: string;
  description: string;
  agentType: AgentType;
  providerKind: ProviderKind;
  encryptedProviderReference: string;
  status: AgentStatus;
  strategy: AgentStrategyConfig;
  permissions: AgentPermissions;
  riskLimits: AgentRiskLimits;
  createdAt: string;
  updatedAt: string;
  activatedAt?: string;
  pausedAt?: string;
}

export interface AgentSummary {
  id: string;
  owner_wallet: string;
  agent_wallet: string;
  name: string;
  description: string;
  agent_type: AgentType;
  provider_kind: ProviderKind;
  provider_reference_status: "configured" | "missing";
  status: AgentStatus;
  strategy: AgentStrategyConfig;
  permissions: AgentPermissions;
  risk_limits: AgentRiskLimits;
  created_at: string;
  updated_at: string;
  activated_at?: string;
  paused_at?: string;
}

export interface AgentTradeMetrics {
  openPositions: number;
  totalNotionalTodayUsdc: number;
  marketNotionalTodayUsdc: number;
}
