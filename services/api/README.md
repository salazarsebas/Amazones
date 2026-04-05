# Amazones API Service

Sprint 2 and Sprint 4 backend foundation for Amazones.

## Current scope

- Hono API scaffold under `services/api`
- `POST /v1/auth/challenge`
- `POST /v1/auth/verify`
- `POST /v1/orders`
- `GET /v1/markets/:marketId/depth`
- `GET /v1/markets`
- `GET /v1/markets/:marketId`
- `GET /v1/portfolio`
- `GET /v1/agents`
- `GET /v1/agents/:agentId`
- `POST /v1/agents`
- `PATCH /v1/agents/:agentId`
- `POST /v1/agents/:agentId/pause`
- `POST /v1/agents/:agentId/activate`
- `GET /v1/agents/:agentId/analytics`
- `POST /v1/resolutions/propose`
- `POST /v1/resolutions/challenge`
- `GET /v1/audit`
- `GET /healthz`
- wallet verification with raw Ed25519 signature against a deterministic challenge string
- deterministic order validation with authenticated wallet identity
- in-memory price-time matching for binary orders on the same market side
- synthetic settlement records and derived portfolio state
- websocket gateway on `WS_PORT` with channel subscription by query string
- in-memory resolution service and worker loop
- audit trail capture for accepted orders and settled fills
- initial Postgres migration for markets, agents, orders, fills, audit logs, and auth challenges
- in-memory agent lifecycle service with encrypted provider reference handling
- agent execution enforcement for trade budgets, status, and resolution permissions

## Auth model in this foundation

This sprint implements an agent-friendly wallet auth flow where:

1. the client requests a challenge for a Stellar public key
2. the client signs the challenge text bytes with the wallet private key
3. the backend verifies the Ed25519 signature against the Stellar public key
4. the backend issues a short-lived bearer token

This is intentionally simpler than a full SEP-10 transaction challenge. It is suitable for agents and backend integration work in Sprint 2. Human-wallet UX can evolve later if the frontend requires a wallet-specific signing method.

## Order signing model in this foundation

`POST /v1/orders` requires:

1. a valid bearer token issued by `/v1/auth/verify`
2. an order payload signed by the same Stellar wallet

Canonical order payload format:

```text
Amazones Order Intent
market_id:<market-id>
wallet_address:<wallet-address>
side:<yes|no>
action:<buy|sell>
price:<fixed-6>
shares:<fixed-6>
expires_at:<iso8601>
nonce:<nonce>
client_order_id:<optional>
```

Current validation guarantees:

- wallet address must be valid
- market must exist in the known market registry
- price must be `(0, 1)`
- shares must be positive
- expiry must be in the future
- signature must verify against the authenticated wallet
- nonce and canonical order hash must be unique among active orders

Current matching behavior:

- orders only match within the same `market_id` and `side`
- `buy` crosses `sell` when `buy.price >= sell.price`
- `sell` crosses `buy` when `sell.price <= buy.price`
- execution price is the resting order price
- partial fills are supported
- fills are marked `settled` immediately with a synthetic transaction hash placeholder until Soroban settlement orchestration replaces it

When the authenticated wallet belongs to a registered agent:

- the agent must be `active`
- `trade` permission must be enabled for order submission
- daily budget, per-market budget, and max-open-positions limits are enforced before accepting the order

## Realtime gateway

The API process also starts a websocket gateway on `WS_PORT`.

Connection format:

```text
ws://localhost:3002/?channel=market:market-0001:book
```

Current emitted channels:

- `market:{marketId}:book`
- `market:{marketId}:trades`
- `market:{marketId}:resolution`

## Resolution worker

`POST /v1/resolutions/propose` moves a market into `resolving`.
The worker finalizes proposals whose challenge deadline has passed.

When the authenticated wallet belongs to a registered agent:

- the agent must be `active`
- `proposeResolutions` permission must be enabled

Worker env:

- `RESOLUTION_WORKER_ENABLED=true`
- `RESOLUTION_WORKER_INTERVAL_MS=5000`

## Settlement orchestration modes

Default mode:

- `SETTLEMENT_MODE=immediate`

This marks fills as settled immediately and is the local-development default.

Optional CLI-backed mode:

- `SETTLEMENT_MODE=stellar-cli`
- `STELLAR_CLI_BIN=stellar`
- `STELLAR_CONFIG_DIR=deployments/testnet/.config/stellar`
- `STELLAR_NETWORK=testnet`
- `STELLAR_SOURCE_ACCOUNT=amazones-deployer`
- `MARKET_CORE_CONTRACT_IDS_JSON={"market-0001":"<contract-id>"}`

In `stellar-cli` mode the backend invokes `settle_trade` through the local Stellar CLI for matched fills. The adapter uses the current `stellar` syntax with `--source`, not the older `--source-account` form.

## Agent lifecycle model

Agent endpoints are owner-authenticated through the same wallet bearer token flow.

Current states:

- `draft`
- `active`
- `paused`
- `archived`

Current lifecycle guarantees:

- provider references are encrypted before storage
- only the owner wallet can update, pause, or activate an agent
- activation validates provider configuration, permissions, and risk limits
- agent activity emits realtime events on `agent:{agentId}:activity`

## Install

```bash
cd services/api
bun install
```

## Run

```bash
cp .env.example .env
bun run dev
```

## Checks

```bash
bun run build
bun run test
```

## Database

Initial schema lives in:

- `db/migrations/0001_init.sql`

The migration covers the MVP foundation tables required by backlog items `B1`, `B2`, and `B3`.
