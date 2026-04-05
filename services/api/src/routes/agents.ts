import { Hono } from "hono";
import { z } from "zod";

import type { AuthenticatedVariables } from "../lib/auth/middleware";
import { AppError, errorPayload } from "../lib/errors";
import type { InMemoryAgentService } from "../lib/agents/service";

const permissionsSchema = z.object({
  trade: z.boolean().optional(),
  createMarkets: z.boolean().optional(),
  proposeResolutions: z.boolean().optional(),
  buyPremiumData: z.boolean().optional(),
});

const strategySchema = z.object({
  categories: z.array(z.string()).optional(),
  regions: z.array(z.string()).optional(),
  model: z.string().optional(),
  confidenceThreshold: z.number().min(0).max(1).optional(),
  aggressiveness: z.enum(["cautious", "balanced", "aggressive"]).optional(),
  stopLossPct: z.number().min(0).max(100).optional(),
});

const riskLimitsSchema = z.object({
  dailyBudgetUsdc: z.number().positive().optional(),
  perMarketBudgetUsdc: z.number().positive().optional(),
  maxOpenPositions: z.number().int().positive().optional(),
});

const createAgentSchema = z.object({
  agent_wallet: z.string().min(1),
  name: z.string().min(1).max(80),
  description: z.string().min(1).max(500),
  agent_type: z.enum(["trader", "market-maker", "resolver", "hybrid"]),
  provider_kind: z.enum(["claude", "openai", "groq", "openai-compatible"]),
  provider_reference: z.string().min(1).optional(),
  status: z.enum(["draft", "active"]).optional(),
  strategy: strategySchema.optional(),
  permissions: permissionsSchema.optional(),
  risk_limits: riskLimitsSchema.optional(),
});

const updateAgentSchema = z.object({
  name: z.string().min(1).max(80).optional(),
  description: z.string().min(1).max(500).optional(),
  provider_kind: z.enum(["claude", "openai", "groq", "openai-compatible"]).optional(),
  provider_reference: z.string().optional(),
  status: z.enum(["draft", "archived"]).optional(),
  strategy: strategySchema.optional(),
  permissions: permissionsSchema.optional(),
  risk_limits: riskLimitsSchema.optional(),
});

export function buildAgentsRouter(agentService: InMemoryAgentService): Hono<{
  Variables: AuthenticatedVariables;
}> {
  const router = new Hono<{
    Variables: AuthenticatedVariables;
  }>();

  router.get("/", (c) =>
    c.json({
      items: agentService.listByOwner(c.get("walletAddress") as string),
    }),
  );

  router.get("/:agentId", (c) => {
    const agent = agentService.get(c.req.param("agentId"));
    if (!agent) {
      return c.json(
        errorPayload(new AppError("agent_not_found", "Agent not found", 404)),
        404,
      );
    }
    if (agent.owner_wallet !== (c.get("walletAddress") as string)) {
      return c.json(
        errorPayload(new AppError("agent_forbidden", "Authenticated wallet does not own this agent", 403)),
        403,
      );
    }
    return c.json(agent);
  });

  router.post("/", async (c) => {
    const body = createAgentSchema.safeParse(await c.req.json());
    if (!body.success) {
      return c.json(
        errorPayload(
          new AppError("invalid_request", "Agent creation body is invalid", 400, {
            issues: body.error.issues,
          }),
        ),
        400,
      );
    }

    try {
      const agent = agentService.create({
        ownerWallet: c.get("walletAddress") as string,
        agentWallet: body.data.agent_wallet,
        name: body.data.name,
        description: body.data.description,
        agentType: body.data.agent_type,
        providerKind: body.data.provider_kind,
        providerReference: body.data.provider_reference,
        status: body.data.status,
        strategy: body.data.strategy,
        permissions: body.data.permissions,
        riskLimits: body.data.risk_limits,
      });
      return c.json(agent, 201);
    } catch (error) {
      if (error instanceof AppError) {
        return c.json(errorPayload(error), error.status as 400 | 403 | 404 | 409);
      }
      throw error;
    }
  });

  router.patch("/:agentId", async (c) => {
    const body = updateAgentSchema.safeParse(await c.req.json());
    if (!body.success) {
      return c.json(
        errorPayload(
          new AppError("invalid_request", "Agent update body is invalid", 400, {
            issues: body.error.issues,
          }),
        ),
        400,
      );
    }

    try {
      return c.json(
        agentService.update(c.req.param("agentId"), c.get("walletAddress") as string, body.data),
      );
    } catch (error) {
      if (error instanceof AppError) {
        return c.json(errorPayload(error), error.status as 400 | 403 | 404 | 409);
      }
      throw error;
    }
  });

  router.post("/:agentId/pause", (c) => {
    try {
      return c.json(agentService.pause(c.req.param("agentId"), c.get("walletAddress") as string));
    } catch (error) {
      if (error instanceof AppError) {
        return c.json(errorPayload(error), error.status as 403 | 404 | 409);
      }
      throw error;
    }
  });

  router.post("/:agentId/activate", (c) => {
    try {
      return c.json(agentService.activate(c.req.param("agentId"), c.get("walletAddress") as string));
    } catch (error) {
      if (error instanceof AppError) {
        return c.json(errorPayload(error), error.status as 400 | 403 | 404 | 409);
      }
      throw error;
    }
  });

  router.get("/:agentId/analytics", (c) => {
    try {
      return c.json(agentService.analytics(c.req.param("agentId"), c.get("walletAddress") as string));
    } catch (error) {
      if (error instanceof AppError) {
        return c.json(errorPayload(error), error.status as 403 | 404);
      }
      throw error;
    }
  });

  return router;
}
