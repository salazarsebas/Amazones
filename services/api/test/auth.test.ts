import { describe, expect, it } from "vitest";
import { Keypair } from "stellar-sdk";

import { buildApp } from "../src/app";
import { canonicalOrderPayload } from "../src/lib/orders/order-service";

describe("wallet auth", () => {
  it("issues a challenge and verifies a valid signature", async () => {
    const keypair = Keypair.random();
    process.env.JWT_SECRET = "12345678901234567890123456789012";
    const { app } = buildApp();

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
    const { app } = buildApp();

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
    const { app } = buildApp({ seedMarkets: ["market-0001"] });

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
    const { app } = buildApp({ seedMarkets: ["market-0001"] });

    async function authenticate(keypair: Keypair) {
      const challengeResponse = await app.request("/v1/auth/challenge", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ wallet_address: keypair.publicKey() }),
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

    async function submitOrder(
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

    const buyerToken = await authenticate(buyer);
    const sellerToken = await authenticate(seller);
    const expiresAt = new Date(Date.now() + 60_000).toISOString();

    const restingSell = await submitOrder(seller, sellerToken, {
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

    const crossingBuy = await submitOrder(buyer, buyerToken, {
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

    const depthResponse = await app.request("/v1/markets/market-0001/depth");
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
    const { app, resolutionWorker } = buildApp({ seedMarkets: ["market-0002"] });

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
});
