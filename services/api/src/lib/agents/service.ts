import { createCipheriv, createHash, randomBytes, randomUUID } from "node:crypto";

import { StrKey } from "stellar-sdk";

import type { AppConfig } from "../../config";
import { AppError } from "../errors";
import type { InMemoryAuditLogService } from "../audit/service";
import type { RealtimeEventBus } from "../realtime/event-bus";
import type {
  AgentPermissions,
  AgentRecord,
  AgentRiskLimits,
  AgentStrategyConfig,
  AgentSummary,
  AgentTradeMetrics,
  AgentType,
  ProviderKind,
} from "./types";

function assertWalletAddress(walletAddress: string, field: string): void {
  if (!StrKey.isValidEd25519PublicKey(walletAddress)) {
    throw new AppError("invalid_wallet_address", `${field} is not a valid Stellar public key`, 400, {
      field,
    });
  }
}

function normalizePermissions(input?: Partial<AgentPermissions>): AgentPermissions {
  return {
    trade: input?.trade ?? true,
    createMarkets: input?.createMarkets ?? false,
    proposeResolutions: input?.proposeResolutions ?? false,
    buyPremiumData: input?.buyPremiumData ?? false,
  };
}

function normalizeStrategy(input?: Partial<AgentStrategyConfig>): AgentStrategyConfig {
  return {
    categories: input?.categories ?? [],
    regions: input?.regions ?? [],
    model: input?.model,
    confidenceThreshold: input?.confidenceThreshold,
    aggressiveness: input?.aggressiveness ?? "balanced",
    stopLossPct: input?.stopLossPct,
  };
}

function normalizeRiskLimits(input?: Partial<AgentRiskLimits>): AgentRiskLimits {
  return {
    dailyBudgetUsdc: input?.dailyBudgetUsdc ?? 50,
    perMarketBudgetUsdc: input?.perMarketBudgetUsdc ?? 20,
    maxOpenPositions: input?.maxOpenPositions ?? 5,
  };
}

function nowIso(): string {
  return new Date().toISOString();
}

export class InMemoryAgentService {
  private readonly agents = new Map<string, AgentRecord>();

  constructor(
    private readonly config: AppConfig,
    private readonly auditLog: InMemoryAuditLogService,
    private readonly eventBus: RealtimeEventBus,
  ) {}

  listByOwner(ownerWallet: string): AgentSummary[] {
    return [...this.agents.values()]
      .filter((agent) => agent.ownerWallet === ownerWallet)
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
      .map((agent) => this.toSummary(agent));
  }

  get(agentId: string): AgentSummary | null {
    const agent = this.agents.get(agentId);
    return agent ? this.toSummary(agent) : null;
  }

  getByWallet(walletAddress: string): AgentRecord | null {
    for (const agent of this.agents.values()) {
      if (agent.agentWallet === walletAddress) {
        return agent;
      }
    }
    return null;
  }

  create(input: {
    ownerWallet: string;
    agentWallet: string;
    name: string;
    description: string;
    agentType: AgentType;
    providerKind: ProviderKind;
    providerReference?: string;
    status?: "draft" | "active";
    strategy?: Partial<AgentStrategyConfig>;
    permissions?: Partial<AgentPermissions>;
    riskLimits?: Partial<AgentRiskLimits>;
  }): AgentSummary {
    assertWalletAddress(input.ownerWallet, "owner_wallet");
    assertWalletAddress(input.agentWallet, "agent_wallet");

    if (input.ownerWallet === input.agentWallet) {
      throw new AppError("agent_wallet_conflict", "Agent wallet must differ from owner wallet", 400);
    }
    if ([...this.agents.values()].some((agent) => agent.agentWallet === input.agentWallet)) {
      throw new AppError("duplicate_agent_wallet", "Agent wallet is already registered", 409);
    }

    const permissions = normalizePermissions(input.permissions);
    const strategy = normalizeStrategy(input.strategy);
    const riskLimits = normalizeRiskLimits(input.riskLimits);
    const createdAt = nowIso();

    const record: AgentRecord = {
      id: randomUUID(),
      ownerWallet: input.ownerWallet,
      agentWallet: input.agentWallet,
      name: input.name,
      description: input.description,
      agentType: input.agentType,
      providerKind: input.providerKind,
      encryptedProviderReference: input.providerReference
        ? this.encryptProviderReference(input.providerReference)
        : "",
      status: input.status ?? "draft",
      strategy,
      permissions,
      riskLimits,
      createdAt,
      updatedAt: createdAt,
      activatedAt: undefined,
      pausedAt: undefined,
    };

    if (record.status === "active") {
      this.assertActivatable(record);
      record.activatedAt = createdAt;
    }

    this.agents.set(record.id, record);
    this.writeLifecycleAudit(record, "agent.created");
    return this.toSummary(record);
  }

  update(
    agentId: string,
    ownerWallet: string,
    input: {
      name?: string;
      description?: string;
      providerKind?: ProviderKind;
      providerReference?: string;
      strategy?: Partial<AgentStrategyConfig>;
      permissions?: Partial<AgentPermissions>;
      riskLimits?: Partial<AgentRiskLimits>;
      status?: "draft" | "archived";
    },
  ): AgentSummary {
    const agent = this.requireOwnedAgent(agentId, ownerWallet);

    if (agent.status === "archived") {
      throw new AppError("agent_archived", "Archived agents cannot be updated", 409);
    }

    if (input.name) {
      agent.name = input.name;
    }
    if (input.description) {
      agent.description = input.description;
    }
    if (input.providerKind) {
      agent.providerKind = input.providerKind;
    }
    if (typeof input.providerReference === "string") {
      agent.encryptedProviderReference = input.providerReference
        ? this.encryptProviderReference(input.providerReference)
        : "";
    }
    if (input.strategy) {
      agent.strategy = normalizeStrategy({
        ...agent.strategy,
        ...input.strategy,
      });
    }
    if (input.permissions) {
      agent.permissions = normalizePermissions({
        ...agent.permissions,
        ...input.permissions,
      });
    }
    if (input.riskLimits) {
      agent.riskLimits = normalizeRiskLimits({
        ...agent.riskLimits,
        ...input.riskLimits,
      });
    }
    if (input.status) {
      agent.status = input.status;
    }

    agent.updatedAt = nowIso();
    this.agents.set(agent.id, agent);
    this.writeLifecycleAudit(agent, "agent.updated");
    return this.toSummary(agent);
  }

  pause(agentId: string, ownerWallet: string): AgentSummary {
    const agent = this.requireOwnedAgent(agentId, ownerWallet);
    if (agent.status === "archived") {
      throw new AppError("agent_archived", "Archived agents cannot be paused", 409);
    }

    agent.status = "paused";
    agent.pausedAt = nowIso();
    agent.updatedAt = agent.pausedAt;
    this.agents.set(agent.id, agent);
    this.writeLifecycleAudit(agent, "agent.paused");
    return this.toSummary(agent);
  }

  activate(agentId: string, ownerWallet: string): AgentSummary {
    const agent = this.requireOwnedAgent(agentId, ownerWallet);
    if (agent.status === "archived") {
      throw new AppError("agent_archived", "Archived agents cannot be activated", 409);
    }

    this.assertActivatable(agent);
    agent.status = "active";
    agent.activatedAt = nowIso();
    agent.updatedAt = agent.activatedAt;
    this.agents.set(agent.id, agent);
    this.writeLifecycleAudit(agent, "agent.activated");
    return this.toSummary(agent);
  }

  assertTradeAllowed(walletAddress: string, marketId: string, orderNotionalUsdc: number, metrics: AgentTradeMetrics): AgentRecord | null {
    const agent = this.getByWallet(walletAddress);
    if (!agent) {
      return null;
    }

    if (agent.status !== "active") {
      throw new AppError("agent_inactive", "Agent must be active to trade", 409, {
        agent_id: agent.id,
        status: agent.status,
      });
    }
    if (!agent.permissions.trade) {
      throw new AppError("agent_trade_forbidden", "Agent is not allowed to trade", 403, {
        agent_id: agent.id,
      });
    }
    if (metrics.openPositions >= agent.riskLimits.maxOpenPositions) {
      throw new AppError("agent_position_limit_exceeded", "Agent reached its max open positions", 409, {
        agent_id: agent.id,
        max_open_positions: agent.riskLimits.maxOpenPositions,
      });
    }
    if (metrics.marketNotionalTodayUsdc + orderNotionalUsdc > agent.riskLimits.perMarketBudgetUsdc) {
      throw new AppError("agent_market_budget_exceeded", "Agent exceeded its per-market budget", 409, {
        agent_id: agent.id,
        per_market_budget_usdc: agent.riskLimits.perMarketBudgetUsdc,
        market_id: marketId,
      });
    }
    if (metrics.totalNotionalTodayUsdc + orderNotionalUsdc > agent.riskLimits.dailyBudgetUsdc) {
      throw new AppError("agent_daily_budget_exceeded", "Agent exceeded its daily budget", 409, {
        agent_id: agent.id,
        daily_budget_usdc: agent.riskLimits.dailyBudgetUsdc,
      });
    }

    return agent;
  }

  assertResolutionAllowed(walletAddress: string): AgentRecord | null {
    const agent = this.getByWallet(walletAddress);
    if (!agent) {
      return null;
    }

    if (agent.status !== "active") {
      throw new AppError("agent_inactive", "Agent must be active to propose resolutions", 409, {
        agent_id: agent.id,
        status: agent.status,
      });
    }
    if (!agent.permissions.proposeResolutions) {
      throw new AppError("agent_resolution_forbidden", "Agent is not allowed to propose resolutions", 403, {
        agent_id: agent.id,
      });
    }

    return agent;
  }

  recordExecution(agent: AgentRecord, eventType: string, payload: Record<string, unknown>) {
    this.auditLog.write({
      traceId: `${eventType}:${agent.id}:${randomUUID()}`,
      actorType: "agent",
      actorId: agent.id,
      eventType,
      entityType: "agent",
      entityId: agent.id,
      payload,
    });
    this.eventBus.publish({
      channel: `agent:${agent.id}:activity`,
      type: eventType,
      payload,
      emittedAt: nowIso(),
    });
  }

  analytics(agentId: string, ownerWallet: string): {
    agent_id: string;
    status: AgentRecord["status"];
    permissions: AgentPermissions;
    risk_limits: AgentRiskLimits;
    provider_reference_status: "configured" | "missing";
  } {
    const agent = this.requireOwnedAgent(agentId, ownerWallet);
    return {
      agent_id: agent.id,
      status: agent.status,
      permissions: agent.permissions,
      risk_limits: agent.riskLimits,
      provider_reference_status: agent.encryptedProviderReference ? "configured" : "missing",
    };
  }

  private assertActivatable(agent: AgentRecord): void {
    if (!agent.encryptedProviderReference) {
      throw new AppError("agent_provider_missing", "Agent provider reference must be configured before activation", 400, {
        agent_id: agent.id,
      });
    }
    if (!Object.values(agent.permissions).some(Boolean)) {
      throw new AppError("agent_permissions_missing", "Agent must have at least one permission before activation", 400, {
        agent_id: agent.id,
      });
    }
    if (agent.permissions.trade) {
      if (agent.riskLimits.dailyBudgetUsdc <= 0 || agent.riskLimits.perMarketBudgetUsdc <= 0) {
        throw new AppError("agent_budget_invalid", "Trading agents need positive budgets", 400, {
          agent_id: agent.id,
        });
      }
      if (agent.riskLimits.maxOpenPositions <= 0) {
        throw new AppError("agent_positions_invalid", "Trading agents need a positive max open positions limit", 400, {
          agent_id: agent.id,
        });
      }
    }
  }

  private requireOwnedAgent(agentId: string, ownerWallet: string): AgentRecord {
    const agent = this.agents.get(agentId);
    if (!agent) {
      throw new AppError("agent_not_found", "Agent not found", 404, { agent_id: agentId });
    }
    if (agent.ownerWallet !== ownerWallet) {
      throw new AppError("agent_forbidden", "Authenticated wallet does not own this agent", 403, {
        agent_id: agentId,
      });
    }
    return agent;
  }

  private encryptProviderReference(secretValue: string): string {
    const key = createHash("sha256").update(this.config.AGENT_PROVIDER_ENCRYPTION_KEY).digest();
    const iv = randomBytes(12);
    const cipher = createCipheriv("aes-256-gcm", key, iv);
    const encrypted = Buffer.concat([cipher.update(secretValue, "utf8"), cipher.final()]);
    const tag = cipher.getAuthTag();
    return `${iv.toString("base64")}.${tag.toString("base64")}.${encrypted.toString("base64")}`;
  }

  private toSummary(agent: AgentRecord): AgentSummary {
    return {
      id: agent.id,
      owner_wallet: agent.ownerWallet,
      agent_wallet: agent.agentWallet,
      name: agent.name,
      description: agent.description,
      agent_type: agent.agentType,
      provider_kind: agent.providerKind,
      provider_reference_status: agent.encryptedProviderReference ? "configured" : "missing",
      status: agent.status,
      strategy: agent.strategy,
      permissions: agent.permissions,
      risk_limits: agent.riskLimits,
      created_at: agent.createdAt,
      updated_at: agent.updatedAt,
      activated_at: agent.activatedAt,
      paused_at: agent.pausedAt,
    };
  }

  private writeLifecycleAudit(agent: AgentRecord, eventType: string) {
    this.auditLog.write({
      traceId: `${eventType}:${agent.id}`,
      actorType: "wallet",
      actorId: agent.ownerWallet,
      eventType,
      entityType: "agent",
      entityId: agent.id,
      payload: {
        agent_wallet: agent.agentWallet,
        status: agent.status,
        provider_kind: agent.providerKind,
      },
    });
  }
}
