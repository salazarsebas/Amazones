import { afterEach, describe, expect, it, vi } from "vitest";
import { Keypair, StrKey } from "stellar-sdk";

import { buildApp } from "../src/app";
import { canonicalOrderPayload } from "../src/lib/orders/order-service";

type BuiltApp = Awaited<ReturnType<typeof buildApp>>;

async function getPremiumPaymentToken(
  app: BuiltApp["app"],
  path: string,
): Promise<string> {
  const response = await app.request(path);
  expect(response.status).toBe(402);
  const payload = await response.json();
  return payload.error.details.payment_required.payment_token as string;
}

async function authenticate(app: BuiltApp["app"], keypair: Keypair, agentName?: string) {
  const challengeResponse = await app.request("/v1/auth/challenge", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      wallet_address: keypair.publicKey(),
      ...(agentName ? { agent_name: agentName } : {}),
    }),
  });
  const challengePayload = await challengeResponse.json();
  const signature = Buffer.from(
    keypair.sign(Buffer.from(challengePayload.challenge_text, "utf8")),
  ).toString("base64");
  const verifyResponse = await app.request("/v1/auth/verify", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      challenge_id: challengePayload.challenge_id,
      wallet_address: keypair.publicKey(),
      signature,
    }),
  });
  const verifyPayload = await verifyResponse.json();
  return verifyPayload.access_token as string;
}

async function submitSignedOrder(
  app: BuiltApp["app"],
  keypair: Keypair,
  accessToken: string,
  order: {
    market_id: string;
    side: "yes" | "no";
    action: "buy" | "sell";
    price: number;
    shares: number;
    expires_at: string;
    nonce: string;
    client_order_id: string;
  },
) {
  const signature = Buffer.from(
    keypair.sign(
      Buffer.from(
        canonicalOrderPayload({
          marketId: order.market_id,
          walletAddress: keypair.publicKey(),
          side: order.side,
          action: order.action,
          price: order.price,
          shares: order.shares,
          expiresAt: order.expires_at,
          nonce: order.nonce,
          clientOrderId: order.client_order_id,
          signature: "",
        }),
        "utf8",
      ),
    ),
  ).toString("base64");

  return app.request("/v1/orders", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      ...order,
      signature,
    }),
  });
}

describe("wallet auth", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("creates and funds a testnet wallet through the auth route", async () => {
    process.env.JWT_SECRET = "12345678901234567890123456789012";
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ hash: "friendbot-tx" }), {
        status: 200,
        headers: {
          "content-type": "application/json",
        },
      }),
    );

    const { app } = await buildApp();
    const response = await app.request("/v1/auth/testnet-wallet", {
      method: "POST",
    });

    expect(response.status).toBe(201);
    const payload = await response.json();
    expect(payload.funding_status).toBe("funded");
    expect(StrKey.isValidEd25519PublicKey(payload.public_key)).toBe(true);
    expect(StrKey.isValidEd25519SecretSeed(payload.secret_seed)).toBe(true);
  });

  it("returns a usable wallet even when testnet funding is pending", async () => {
    process.env.JWT_SECRET = "12345678901234567890123456789012";
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("connect ECONNREFUSED"));

    const { app } = await buildApp();
    const response = await app.request("/v1/auth/testnet-wallet", {
      method: "POST",
    });

    expect(response.status).toBe(202);
    const payload = await response.json();
    expect(payload.funding_status).toBe("pending_manual_funding");
    expect(payload.funding_detail).toContain("ECONNREFUSED");
    expect(StrKey.isValidEd25519PublicKey(payload.public_key)).toBe(true);
    expect(StrKey.isValidEd25519SecretSeed(payload.secret_seed)).toBe(true);
  });

  it("issues a challenge and verifies a valid signature", async () => {
    const keypair = Keypair.random();
    process.env.JWT_SECRET = "12345678901234567890123456789012";
    const { app } = await buildApp();

    const challengeResponse = await app.request("/v1/auth/challenge", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        wallet_address: keypair.publicKey(),
        agent_name: "latam-bot",
      }),
    });

    expect(challengeResponse.status).toBe(200);
    const challengePayload = await challengeResponse.json();
    const signature = Buffer.from(
      keypair.sign(Buffer.from(challengePayload.challenge_text, "utf8")),
    ).toString("base64");

    const verifyResponse = await app.request("/v1/auth/verify", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        challenge_id: challengePayload.challenge_id,
        wallet_address: keypair.publicKey(),
        signature,
      }),
    });

    expect(verifyResponse.status).toBe(200);
    const verifyPayload = await verifyResponse.json();
    expect(verifyPayload.access_token).toBeTypeOf("string");
    expect(verifyPayload.tier).toBe("basic-agent");
  });

  it("rejects an invalid signature", async () => {
    const keypair = Keypair.random();
    process.env.JWT_SECRET = "12345678901234567890123456789012";
    const { app } = await buildApp();

    const challengeResponse = await app.request("/v1/auth/challenge", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        wallet_address: keypair.publicKey(),
      }),
    });

    const challengePayload = await challengeResponse.json();
    const verifyResponse = await app.request("/v1/auth/verify", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        challenge_id: challengePayload.challenge_id,
        wallet_address: keypair.publicKey(),
        signature: Buffer.from("invalid-signature").toString("base64"),
      }),
    });

    expect(verifyResponse.status).toBe(401);
    const verifyPayload = await verifyResponse.json();
    expect(verifyPayload.error.code).toBe("invalid_signature");
  });

  it("accepts a valid signed order for an authenticated wallet", async () => {
    const keypair = Keypair.random();
    process.env.JWT_SECRET = "12345678901234567890123456789012";
    const { app } = await buildApp({ seedMarkets: ["market-0001"] });

    const challengeResponse = await app.request("/v1/auth/challenge", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ wallet_address: keypair.publicKey() }),
    });
    const challengePayload = await challengeResponse.json();
    const authSignature = Buffer.from(
      keypair.sign(Buffer.from(challengePayload.challenge_text, "utf8")),
    ).toString("base64");
    const verifyResponse = await app.request("/v1/auth/verify", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        challenge_id: challengePayload.challenge_id,
        wallet_address: keypair.publicKey(),
        signature: authSignature,
      }),
    });
    const verifyPayload = await verifyResponse.json();

    const order = {
      market_id: "market-0001",
      side: "yes" as const,
      action: "buy" as const,
      price: 0.61,
      shares: 25,
      expires_at: new Date(Date.now() + 60_000).toISOString(),
      nonce: "nonce-1",
      client_order_id: "client-1",
    };

    const orderSignature = Buffer.from(
      keypair.sign(
        Buffer.from(
          canonicalOrderPayload({
            marketId: order.market_id,
            walletAddress: keypair.publicKey(),
            side: order.side,
            action: order.action,
            price: order.price,
            shares: order.shares,
            expiresAt: order.expires_at,
            nonce: order.nonce,
            clientOrderId: order.client_order_id,
            signature: "",
          }),
          "utf8",
        ),
      ),
    ).toString("base64");

    const orderResponse = await app.request("/v1/orders", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${verifyPayload.access_token}`,
      },
      body: JSON.stringify({
        ...order,
        signature: orderSignature,
      }),
    });

    expect(orderResponse.status).toBe(202);
    const orderPayload = await orderResponse.json();
    expect(orderPayload.status).toBe("accepted");
    expect(orderPayload.market_id).toBe("market-0001");
  });

  it("matches crossing orders and exposes depth and portfolio", async () => {
    process.env.JWT_SECRET = "12345678901234567890123456789012";
    const buyer = Keypair.random();
    const seller = Keypair.random();
    const { app } = await buildApp({ seedMarkets: ["market-0001"] });

    const buyerToken = await authenticate(app, buyer);
    const sellerToken = await authenticate(app, seller);
    const expiresAt = new Date(Date.now() + 60_000).toISOString();

    const restingSell = await submitSignedOrder(app, seller, sellerToken, {
      market_id: "market-0001",
      side: "yes",
      action: "sell",
      price: 0.59,
      shares: 10,
      expires_at: expiresAt,
      nonce: "seller-1",
      client_order_id: "seller-client-1",
    });
    expect(restingSell.status).toBe(202);

    const crossingBuy = await submitSignedOrder(app, buyer, buyerToken, {
      market_id: "market-0001",
      side: "yes",
      action: "buy",
      price: 0.61,
      shares: 7,
      expires_at: expiresAt,
      nonce: "buyer-1",
      client_order_id: "buyer-client-1",
    });
    expect(crossingBuy.status).toBe(202);
    const buyPayload = await crossingBuy.json();
    expect(buyPayload.status).toBe("filled");
    expect(buyPayload.fills).toHaveLength(1);
    expect(buyPayload.fills[0].price).toBe(0.59);
    expect(buyPayload.fills[0].shares).toBe(7);

    const depthToken = await getPremiumPaymentToken(app, "/v1/markets/market-0001/depth");
    const depthResponse = await app.request("/v1/markets/market-0001/depth", {
      headers: {
        "x-payment": depthToken,
      },
    });
    expect(depthResponse.status).toBe(200);
    const depthPayload = await depthResponse.json();
    expect(depthPayload.asks).toHaveLength(1);
    expect(depthPayload.asks[0].shares).toBe(3);
    expect(depthPayload.bids).toHaveLength(0);

    const buyerPortfolio = await app.request("/v1/portfolio", {
      headers: { authorization: `Bearer ${buyerToken}` },
    });
    expect(buyerPortfolio.status).toBe(200);
    const buyerPortfolioPayload = await buyerPortfolio.json();
    expect(buyerPortfolioPayload.positions).toHaveLength(1);
    expect(buyerPortfolioPayload.positions[0].yes_shares).toBe(7);
    expect(buyerPortfolioPayload.positions[0].avg_yes_price).toBe(0.59);

    const sellerPortfolio = await app.request("/v1/portfolio", {
      headers: { authorization: `Bearer ${sellerToken}` },
    });
    expect(sellerPortfolio.status).toBe(200);
    const sellerPortfolioPayload = await sellerPortfolio.json();
    expect(sellerPortfolioPayload.positions).toHaveLength(1);
    expect(sellerPortfolioPayload.positions[0].no_shares).toBe(7);
    expect(sellerPortfolioPayload.positions[0].avg_no_price).toBeCloseTo(0.41, 6);
  });

  it("finalizes due resolution proposals through the worker", async () => {
    process.env.JWT_SECRET = "12345678901234567890123456789012";
    const resolver = Keypair.random();
    const { app, resolutionWorker } = await buildApp({ seedMarkets: ["market-0002"] });

    const challengeResponse = await app.request("/v1/auth/challenge", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ wallet_address: resolver.publicKey() }),
    });
    const challengePayload = await challengeResponse.json();
    const signature = Buffer.from(
      resolver.sign(Buffer.from(challengePayload.challenge_text, "utf8")),
    ).toString("base64");
    const verifyResponse = await app.request("/v1/auth/verify", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        challenge_id: challengePayload.challenge_id,
        wallet_address: resolver.publicKey(),
        signature,
      }),
    });
    const verifyPayload = await verifyResponse.json();

    const proposeResponse = await app.request("/v1/resolutions/propose", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${verifyPayload.access_token}`,
      },
      body: JSON.stringify({
        market_id: "market-0002",
        proposed_outcome: "yes",
        evidence_urls: ["https://example.com/evidence"],
        bond_amount_usdc: "100",
      }),
    });
    expect(proposeResponse.status).toBe(201);
    const proposal = await proposeResponse.json();

    resolutionWorker.runOnce(new Date(Date.now() + 49 * 60 * 60 * 1000));

    const marketResponse = await app.request("/v1/markets/market-0002");
    expect(marketResponse.status).toBe(200);
    const marketPayload = await marketResponse.json();
    expect(marketPayload.status).toBe("resolved");
    expect(marketPayload.latest_outcome).toBe("yes");

    const auditResponse = await app.request(`/v1/audit?trace_id=resolution-worker:${proposal.id}`);
    expect(auditResponse.status).toBe(200);
    const auditPayload = await auditResponse.json();
    expect(auditPayload.items).toHaveLength(1);
    expect(auditPayload.items[0].eventType).toBe("resolution.finalized");
  });

  it("creates and activates an agent with encrypted provider configuration", async () => {
    process.env.JWT_SECRET = "12345678901234567890123456789012";
    const owner = Keypair.random();
    const agentWallet = Keypair.random();
    const { app } = await buildApp();
    const ownerToken = await authenticate(app, owner);

    const createResponse = await app.request("/v1/agents", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${ownerToken}`,
      },
      body: JSON.stringify({
        agent_wallet: agentWallet.publicKey(),
        name: "LatAm momentum",
        description: "Trades football and crypto markets with capped exposure.",
        agent_type: "trader",
        provider_kind: "claude",
        provider_reference: "sk-ant-123",
        permissions: {
          trade: true,
          buyPremiumData: true,
        },
        risk_limits: {
          dailyBudgetUsdc: 75,
          perMarketBudgetUsdc: 25,
          maxOpenPositions: 3,
        },
      }),
    });

    expect(createResponse.status).toBe(201);
    const createdAgent = await createResponse.json();
    expect(createdAgent.status).toBe("draft");
    expect(createdAgent.provider_reference_status).toBe("configured");

    const activateResponse = await app.request(`/v1/agents/${createdAgent.id}/activate`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${ownerToken}`,
      },
    });

    expect(activateResponse.status).toBe(200);
    const activatedAgent = await activateResponse.json();
    expect(activatedAgent.status).toBe("active");

    const analyticsResponse = await app.request(`/v1/agents/${createdAgent.id}/analytics`, {
      headers: {
        authorization: `Bearer ${ownerToken}`,
      },
    });

    expect(analyticsResponse.status).toBe(200);
    const analytics = await analyticsResponse.json();
    expect(analytics.provider_reference_status).toBe("configured");
    expect(analytics.permissions.trade).toBe(true);
  });

  it("requires x402 payment for premium market metadata and returns semantic payload after payment", async () => {
    process.env.JWT_SECRET = "12345678901234567890123456789012";
    const { app } = await buildApp({ seedMarkets: ["market-0100"] });

    const unpaid = await app.request("/v1/markets/market-0100/semantic");
    expect(unpaid.status).toBe(402);
    const unpaidPayload = await unpaid.json();
    expect(unpaidPayload.error.code).toBe("x402_payment_required");
    expect(unpaidPayload.error.details.payment_required.scheme).toBe("x402-stellar");

    const paid = await app.request("/v1/markets/market-0100/semantic", {
      headers: {
        "x-payment": unpaidPayload.error.details.payment_required.payment_token,
      },
    });
    expect(paid.status).toBe(200);
    const semanticPayload = await paid.json();
    expect(semanticPayload.market_id).toBe("market-0100");
    expect(semanticPayload.semantic_metadata.marketType).toBe("binary");
  });

  it("serves premium agent analytics with x402 while preserving owner-auth analytics", async () => {
    process.env.JWT_SECRET = "12345678901234567890123456789012";
    const owner = Keypair.random();
    const agentWallet = Keypair.random();
    const { app } = await buildApp();
    const ownerToken = await authenticate(app, owner);

    const createResponse = await app.request("/v1/agents", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${ownerToken}`,
      },
      body: JSON.stringify({
        agent_wallet: agentWallet.publicKey(),
        name: "Premium analytics bot",
        description: "Exposes premium analytics externally.",
        agent_type: "hybrid",
        provider_kind: "claude",
        provider_reference: "sk-ant-premium",
        status: "active",
        permissions: {
          trade: true,
          buyPremiumData: true,
        },
      }),
    });
    expect(createResponse.status).toBe(201);
    const createdAgent = await createResponse.json();

    const ownerAnalytics = await app.request(`/v1/agents/${createdAgent.id}/analytics`, {
      headers: {
        authorization: `Bearer ${ownerToken}`,
      },
    });
    expect(ownerAnalytics.status).toBe(200);

    const premiumToken = await getPremiumPaymentToken(app, `/v1/agents/${createdAgent.id}/analytics`);
    const premiumAnalytics = await app.request(`/v1/agents/${createdAgent.id}/analytics`, {
      headers: {
        "x-payment": premiumToken,
      },
    });
    expect(premiumAnalytics.status).toBe(200);
    const premiumPayload = await premiumAnalytics.json();
    expect(premiumPayload.agent_id).toBe(createdAgent.id);
    expect(premiumPayload.name).toBe("Premium analytics bot");
    expect(premiumPayload.strategy_summary.aggressiveness).toBe("balanced");
  });

  it("serves the LATAM election premium dataset through x402", async () => {
    process.env.JWT_SECRET = "12345678901234567890123456789012";
    const { app } = await buildApp({ seedMarkets: ["market-0200"] });

    const token = await getPremiumPaymentToken(app, "/v1/data/latam-election-pack");
    const response = await app.request("/v1/data/latam-election-pack", {
      headers: {
        "x-payment": token,
      },
    });

    expect(response.status).toBe(200);
    const payload = await response.json();
    expect(payload.dataset_id).toBe("latam-election-pack");
    expect(payload.items).toHaveLength(1);
  });

  it("blocks paused agents from submitting trades", async () => {
    process.env.JWT_SECRET = "12345678901234567890123456789012";
    const owner = Keypair.random();
    const agentWallet = Keypair.random();
    const { app } = await buildApp({ seedMarkets: ["market-0003"] });
    const ownerToken = await authenticate(app, owner);

    const createResponse = await app.request("/v1/agents", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${ownerToken}`,
      },
      body: JSON.stringify({
        agent_wallet: agentWallet.publicKey(),
        name: "Paused agent",
        description: "Should be stopped before submitting orders.",
        agent_type: "trader",
        provider_kind: "openai",
        provider_reference: "sk-openai-123",
        status: "active",
        permissions: {
          trade: true,
        },
        risk_limits: {
          dailyBudgetUsdc: 50,
          perMarketBudgetUsdc: 20,
          maxOpenPositions: 2,
        },
      }),
    });
    const createdAgent = await createResponse.json();

    const pauseResponse = await app.request(`/v1/agents/${createdAgent.id}/pause`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${ownerToken}`,
      },
    });
    expect(pauseResponse.status).toBe(200);

    const agentToken = await authenticate(app, agentWallet, "paused-agent");
    const orderResponse = await submitSignedOrder(app, agentWallet, agentToken, {
      market_id: "market-0003",
      side: "yes",
      action: "buy",
      price: 0.55,
      shares: 5,
      expires_at: new Date(Date.now() + 60_000).toISOString(),
      nonce: "paused-agent-1",
      client_order_id: "paused-agent-client-1",
    });

    expect(orderResponse.status).toBe(409);
    const payload = await orderResponse.json();
    expect(payload.error.code).toBe("agent_inactive");
  });

  it("blocks agents without resolution permission from proposing market outcomes", async () => {
    process.env.JWT_SECRET = "12345678901234567890123456789012";
    const owner = Keypair.random();
    const agentWallet = Keypair.random();
    const { app } = await buildApp({ seedMarkets: ["market-0004"] });
    const ownerToken = await authenticate(app, owner);

    const createResponse = await app.request("/v1/agents", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${ownerToken}`,
      },
      body: JSON.stringify({
        agent_wallet: agentWallet.publicKey(),
        name: "Trade only agent",
        description: "May trade but cannot resolve.",
        agent_type: "trader",
        provider_kind: "groq",
        provider_reference: "groq-key-123",
        status: "active",
        permissions: {
          trade: true,
          proposeResolutions: false,
        },
        risk_limits: {
          dailyBudgetUsdc: 50,
          perMarketBudgetUsdc: 20,
          maxOpenPositions: 2,
        },
      }),
    });

    expect(createResponse.status).toBe(201);
    const agentToken = await authenticate(app, agentWallet, "trade-only-agent");

    const proposeResponse = await app.request("/v1/resolutions/propose", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${agentToken}`,
      },
      body: JSON.stringify({
        market_id: "market-0004",
        proposed_outcome: "yes",
        evidence_urls: ["https://example.com/evidence"],
        bond_amount_usdc: "25",
      }),
    });

    expect(proposeResponse.status).toBe(403);
    const payload = await proposeResponse.json();
    expect(payload.error.code).toBe("agent_resolution_forbidden");
  });

  it("returns actionable validation issues for invalid agent activation config", async () => {
    process.env.JWT_SECRET = "12345678901234567890123456789012";
    const { app } = await buildApp();

    const response = await app.request("/v1/agents/validate", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        provider_kind: "openai",
        provider_reference: "bad-token",
        permissions: {
          trade: true,
        },
        risk_limits: {
          dailyBudgetUsdc: 0.1,
          perMarketBudgetUsdc: 0.1,
          maxOpenPositions: 1,
        },
        strategy: {
          categories: ["crypto"],
          regions: ["latam"],
        },
      }),
    });

    expect(response.status).toBe(200);
    const payload = await response.json();
    expect(payload.valid).toBe(false);
    expect(
      payload.issues.some((issue: { code: string }) => issue.code === "provider_reference_format_unrecognized"),
    ).toBe(true);
  });

  it("creates a sponsored agent wallet even when funding falls back to manual mode", async () => {
    process.env.JWT_SECRET = "12345678901234567890123456789012";
    process.env.STELLAR_FRIENDBOT_URL = "http://127.0.0.1:1";
    const owner = Keypair.random();
    const { app } = await buildApp();
    const accessToken = await authenticate(app, owner);

    const response = await app.request("/v1/agents/sponsored-wallet", {
      method: "POST",
      headers: {
        authorization: `Bearer ${accessToken}`,
      },
    });

    expect([201, 202]).toContain(response.status);
    const payload = await response.json();
    expect(payload.owner_wallet).toBe(owner.publicKey());
    expect(payload.public_key).toMatch(/^G/);
    expect(payload.secret_seed).toMatch(/^S/);
  });
});
