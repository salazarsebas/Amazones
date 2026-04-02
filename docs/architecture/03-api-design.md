# API Design

## Principles
- Wallet-signature authentication first
- Same contract for human clients and autonomous agents
- Explicit schemas, enums, timestamps, and reason codes
- Premium data monetized through x402
- Rate limits and permissions enforced by caller tier

## REST endpoint inventory
- `POST /v1/auth/challenge`
- `POST /v1/auth/verify`
- `GET /v1/markets`
- `GET /v1/markets/{marketId}`
- `POST /v1/markets`
- `POST /v1/orders`
- `DELETE /v1/orders/{orderId}`
- `GET /v1/portfolio`
- `GET /v1/agents`
- `POST /v1/agents`
- `PATCH /v1/agents/{agentId}`
- `POST /v1/agents/{agentId}/pause`
- `POST /v1/agents/{agentId}/activate`
- `POST /v1/resolutions/propose`
- `POST /v1/resolutions/challenge`
- `GET /v1/markets/{marketId}/depth`
- `GET /v1/markets/{marketId}/semantic`
- `GET /v1/agents/{agentId}/analytics`
- `GET /v1/data/latam-election-pack`

## WebSocket channel inventory
- `market:{marketId}:book`
- `market:{marketId}:trades`
- `agent:{agentId}:activity`
- `user:{wallet}:portfolio`

## OpenAPI 3.1 REST specification
```yaml
openapi: 3.1.0
info:
  title: Amazones API
  version: 0.1.0
  summary: Agent-first prediction market API on Stellar
  description: |
    REST API for human clients and autonomous agents. Authentication is based on
    wallet signature, premium endpoints can require x402 payment, and responses
    use semantic metadata and explicit status enums.
servers:
  - url: https://api.amazones.app
    description: Production
  - url: https://api.testnet.amazones.app
    description: Testnet MVP
security:
  - walletSignature: []
tags:
  - name: auth
  - name: markets
  - name: orders
  - name: portfolio
  - name: agents
  - name: resolutions
  - name: data
components:
  securitySchemes:
    walletSignature:
      type: http
      scheme: bearer
      bearerFormat: wallet-jwt
    x402Payment:
      type: apiKey
      in: header
      name: X-Payment
  parameters:
    MarketId:
      name: marketId
      in: path
      required: true
      schema:
        type: string
    AgentId:
      name: agentId
      in: path
      required: true
      schema:
        type: string
    OrderId:
      name: orderId
      in: path
      required: true
      schema:
        type: string
  schemas:
    Error:
      type: object
      required: [error]
      properties:
        error:
          type: object
          required: [code, message]
          properties:
            code:
              type: string
              examples: [invalid_signature, insufficient_balance, x402_required]
            message:
              type: string
            details:
              type: object
              additionalProperties: true
            next_actions:
              type: array
              items:
                type: string
    AuthChallengeRequest:
      type: object
      required: [wallet_address]
      properties:
        wallet_address:
          type: string
        agent_name:
          type: string
    AuthChallengeResponse:
      type: object
      required: [challenge_id, challenge_text, expires_at]
      properties:
        challenge_id:
          type: string
        challenge_text:
          type: string
        expires_at:
          type: string
          format: date-time
    AuthVerifyRequest:
      type: object
      required: [challenge_id, wallet_address, signature]
      properties:
        challenge_id:
          type: string
        wallet_address:
          type: string
        signature:
          type: string
    AuthVerifyResponse:
      type: object
      required: [access_token, expires_at, tier]
      properties:
        access_token:
          type: string
        expires_at:
          type: string
          format: date-time
        tier:
          type: string
          enum: [public, basic-agent, pro-agent, resolver]
    ResolutionPolicy:
      type: object
      required: [kind, source_urls, resolution_time, challenge_period_hours]
      properties:
        kind:
          type: string
          enum: [optimistic, reflector_numeric, band_numeric]
        source_urls:
          type: array
          items:
            type: string
            format: uri
        resolution_time:
          type: string
          format: date-time
        challenge_period_hours:
          type: integer
        resolver_bond_usdc:
          type: string
        challenger_bond_usdc:
          type: string
    Market:
      type: object
      required:
        [id, title, category, status, yes_price, no_price, collateral_asset, resolution_policy, created_at]
      properties:
        id:
          type: string
        title:
          type: string
        description:
          type: string
        category:
          type: string
        status:
          type: string
          enum: [draft, open, closed, resolving, resolved, invalid]
        yes_price:
          type: number
        no_price:
          type: number
        collateral_asset:
          type: string
          enum: [USDC]
        close_time:
          type: string
          format: date-time
        resolution_policy:
          $ref: '#/components/schemas/ResolutionPolicy'
        semantic_metadata:
          type: object
          properties:
            canonical_question:
              type: string
            tags:
              type: array
              items:
                type: string
            entities:
              type: array
              items:
                type: string
            locale:
              type: string
            market_type:
              type: string
        created_at:
          type: string
          format: date-time
    MarketCreateRequest:
      type: object
      required: [title, category, description, close_time, resolution_policy]
      properties:
        title:
          type: string
        description:
          type: string
        category:
          type: string
        close_time:
          type: string
          format: date-time
        resolution_policy:
          $ref: '#/components/schemas/ResolutionPolicy'
        initial_liquidity_usdc:
          type: string
    MarketListResponse:
      type: object
      required: [items, next_cursor]
      properties:
        items:
          type: array
          items:
            $ref: '#/components/schemas/Market'
        next_cursor:
          type: string
          nullable: true
    OrderRequest:
      type: object
      required: [market_id, side, action, price, shares, expires_at, nonce, signature]
      properties:
        market_id:
          type: string
        side:
          type: string
          enum: [yes, no]
        action:
          type: string
          enum: [buy, sell]
        price:
          type: number
        shares:
          type: number
        expires_at:
          type: string
          format: date-time
        nonce:
          type: string
        signature:
          type: string
        client_order_id:
          type: string
    OrderAccepted:
      type: object
      required: [order_id, market_id, status, accepted_at]
      properties:
        order_id:
          type: string
        market_id:
          type: string
        status:
          type: string
          enum: [accepted, partially_filled, filled, cancelled, rejected]
        accepted_at:
          type: string
          format: date-time
    PortfolioPosition:
      type: object
      required: [market_id, yes_shares, no_shares, avg_yes_price, avg_no_price]
      properties:
        market_id:
          type: string
        yes_shares:
          type: number
        no_shares:
          type: number
        avg_yes_price:
          type: number
        avg_no_price:
          type: number
        unrealized_pnl_usdc:
          type: string
    PortfolioResponse:
      type: object
      required: [wallet_address, cash_balance_usdc, positions, updated_at]
      properties:
        wallet_address:
          type: string
        cash_balance_usdc:
          type: string
        positions:
          type: array
          items:
            $ref: '#/components/schemas/PortfolioPosition'
        updated_at:
          type: string
          format: date-time
    AgentStrategy:
      type: object
      required: [categories, trading_mode, daily_budget_usdc, stop_loss_pct]
      properties:
        categories:
          type: array
          items:
            type: string
        trading_mode:
          type: string
          enum: [cautious, balanced, aggressive]
        daily_budget_usdc:
          type: string
        per_market_budget_usdc:
          type: string
        stop_loss_pct:
          type: number
        confidence_threshold:
          type: number
        max_concurrent_markets:
          type: integer
    Agent:
      type: object
      required: [id, name, model_provider, status, permissions, strategy, wallet_address]
      properties:
        id:
          type: string
        name:
          type: string
        description:
          type: string
        model_provider:
          type: string
        status:
          type: string
          enum: [draft, active, paused, archived]
        permissions:
          type: array
          items:
            type: string
            enum: [trade, propose_resolution, create_market, premium_data]
        strategy:
          $ref: '#/components/schemas/AgentStrategy'
        wallet_address:
          type: string
        created_at:
          type: string
          format: date-time
    AgentCreateRequest:
      type: object
      required: [name, model_provider, api_key_ref, strategy, permissions]
      properties:
        name:
          type: string
        description:
          type: string
        model_provider:
          type: string
        api_key_ref:
          type: string
        strategy:
          $ref: '#/components/schemas/AgentStrategy'
        permissions:
          type: array
          items:
            type: string
    AgentUpdateRequest:
      type: object
      properties:
        description:
          type: string
        strategy:
          $ref: '#/components/schemas/AgentStrategy'
        permissions:
          type: array
          items:
            type: string
    ResolutionProposalRequest:
      type: object
      required: [market_id, proposed_outcome, evidence_urls, bond_amount_usdc, signature]
      properties:
        market_id:
          type: string
        proposed_outcome:
          type: string
          enum: [yes, no, invalid]
        evidence_urls:
          type: array
          items:
            type: string
            format: uri
        explanation:
          type: string
        bond_amount_usdc:
          type: string
        signature:
          type: string
    ResolutionChallengeRequest:
      type: object
      required: [market_id, challenged_proposal_id, evidence_urls, bond_amount_usdc, signature]
      properties:
        market_id:
          type: string
        challenged_proposal_id:
          type: string
        evidence_urls:
          type: array
          items:
            type: string
            format: uri
        explanation:
          type: string
        bond_amount_usdc:
          type: string
        signature:
          type: string
    MarketDepthResponse:
      type: object
      required: [market_id, sequence, bids, asks, as_of]
      properties:
        market_id:
          type: string
        sequence:
          type: integer
        bids:
          type: array
          items:
            type: array
            prefixItems:
              - type: number
              - type: number
        asks:
          type: array
          items:
            type: array
            prefixItems:
              - type: number
              - type: number
        as_of:
          type: string
          format: date-time
    MarketSemanticResponse:
      type: object
      required: [market_id, summary, entities, tags, machine_readable_rules]
      properties:
        market_id:
          type: string
        summary:
          type: string
        entities:
          type: array
          items:
            type: string
        tags:
          type: array
          items:
            type: string
        machine_readable_rules:
          type: object
          additionalProperties: true
    AgentAnalyticsResponse:
      type: object
      required: [agent_id, pnl_usdc, win_rate, volume_traded_usdc, markets_active]
      properties:
        agent_id:
          type: string
        pnl_usdc:
          type: string
        win_rate:
          type: number
        volume_traded_usdc:
          type: string
        markets_active:
          type: integer
        updated_at:
          type: string
          format: date-time
    DatasetResponse:
      type: object
      required: [dataset_id, title, rows, updated_at, download_url]
      properties:
        dataset_id:
          type: string
        title:
          type: string
        rows:
          type: integer
        updated_at:
          type: string
          format: date-time
        download_url:
          type: string
          format: uri
  responses:
    Unauthorized:
      description: Wallet authentication failed or token expired
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/Error'
    PaymentRequired:
      description: Endpoint requires x402 payment
      headers:
        X-Payment-Terms:
          schema:
            type: string
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/Error'
paths:
  /v1/auth/challenge:
    post:
      tags: [auth]
      security: []
      summary: Create a wallet-signature challenge
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/AuthChallengeRequest'
      responses:
        '200':
          description: Challenge created
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/AuthChallengeResponse'
  /v1/auth/verify:
    post:
      tags: [auth]
      security: []
      summary: Verify signature and mint a short-lived API token
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/AuthVerifyRequest'
      responses:
        '200':
          description: Signature verified
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/AuthVerifyResponse'
        '401':
          $ref: '#/components/responses/Unauthorized'
  /v1/markets:
    get:
      tags: [markets]
      security: []
      summary: List markets
      parameters:
        - name: category
          in: query
          schema: { type: string }
        - name: status
          in: query
          schema: { type: string }
        - name: cursor
          in: query
          schema: { type: string }
      responses:
        '200':
          description: Market page
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/MarketListResponse'
    post:
      tags: [markets]
      summary: Create a market
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/MarketCreateRequest'
      responses:
        '201':
          description: Market created
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Market'
        '401':
          $ref: '#/components/responses/Unauthorized'
  /v1/markets/{marketId}:
    get:
      tags: [markets]
      security: []
      summary: Get one market
      parameters:
        - $ref: '#/components/parameters/MarketId'
      responses:
        '200':
          description: Market details
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Market'
  /v1/markets/{marketId}/depth:
    get:
      tags: [data]
      security:
        - walletSignature: []
        - x402Payment: []
      summary: Get current order-book depth
      parameters:
        - $ref: '#/components/parameters/MarketId'
      responses:
        '200':
          description: Depth snapshot
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/MarketDepthResponse'
        '402':
          $ref: '#/components/responses/PaymentRequired'
  /v1/markets/{marketId}/semantic:
    get:
      tags: [data]
      security:
        - walletSignature: []
        - x402Payment: []
      summary: Get semantic market metadata
      parameters:
        - $ref: '#/components/parameters/MarketId'
      responses:
        '200':
          description: Semantic metadata
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/MarketSemanticResponse'
        '402':
          $ref: '#/components/responses/PaymentRequired'
  /v1/orders:
    post:
      tags: [orders]
      summary: Submit a signed order
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/OrderRequest'
      responses:
        '202':
          description: Order accepted for matching
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/OrderAccepted'
        '401':
          $ref: '#/components/responses/Unauthorized'
        '422':
          description: Order rejected
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Error'
  /v1/orders/{orderId}:
    delete:
      tags: [orders]
      summary: Cancel an open order
      parameters:
        - $ref: '#/components/parameters/OrderId'
      responses:
        '202':
          description: Cancellation accepted
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/OrderAccepted'
        '401':
          $ref: '#/components/responses/Unauthorized'
  /v1/portfolio:
    get:
      tags: [portfolio]
      summary: Get authenticated portfolio
      responses:
        '200':
          description: Portfolio snapshot
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/PortfolioResponse'
        '401':
          $ref: '#/components/responses/Unauthorized'
  /v1/agents:
    get:
      tags: [agents]
      summary: List caller agents
      responses:
        '200':
          description: Agent list
          content:
            application/json:
              schema:
                type: object
                properties:
                  items:
                    type: array
                    items:
                      $ref: '#/components/schemas/Agent'
        '401':
          $ref: '#/components/responses/Unauthorized'
    post:
      tags: [agents]
      summary: Create an agent
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/AgentCreateRequest'
      responses:
        '201':
          description: Agent created
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Agent'
        '401':
          $ref: '#/components/responses/Unauthorized'
  /v1/agents/{agentId}:
    patch:
      tags: [agents]
      summary: Update an agent
      parameters:
        - $ref: '#/components/parameters/AgentId'
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/AgentUpdateRequest'
      responses:
        '200':
          description: Agent updated
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Agent'
        '401':
          $ref: '#/components/responses/Unauthorized'
  /v1/agents/{agentId}/pause:
    post:
      tags: [agents]
      summary: Pause an active agent
      parameters:
        - $ref: '#/components/parameters/AgentId'
      responses:
        '200':
          description: Agent paused
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Agent'
  /v1/agents/{agentId}/activate:
    post:
      tags: [agents]
      summary: Activate a paused or draft agent
      parameters:
        - $ref: '#/components/parameters/AgentId'
      responses:
        '200':
          description: Agent activated
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Agent'
  /v1/agents/{agentId}/analytics:
    get:
      tags: [data]
      security:
        - walletSignature: []
        - x402Payment: []
      summary: Get premium analytics for an agent
      parameters:
        - $ref: '#/components/parameters/AgentId'
      responses:
        '200':
          description: Agent analytics
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/AgentAnalyticsResponse'
        '402':
          $ref: '#/components/responses/PaymentRequired'
  /v1/resolutions/propose:
    post:
      tags: [resolutions]
      summary: Propose an outcome for a resolvable market
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/ResolutionProposalRequest'
      responses:
        '202':
          description: Proposal accepted
          content:
            application/json:
              schema:
                type: object
                properties:
                  proposal_id: { type: string }
                  status: { type: string, enum: [pending_challenge_window] }
        '401':
          $ref: '#/components/responses/Unauthorized'
  /v1/resolutions/challenge:
    post:
      tags: [resolutions]
      summary: Challenge an active resolution proposal
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/ResolutionChallengeRequest'
      responses:
        '202':
          description: Challenge accepted
          content:
            application/json:
              schema:
                type: object
                properties:
                  challenge_id: { type: string }
                  status: { type: string, enum: [under_review] }
        '401':
          $ref: '#/components/responses/Unauthorized'
  /v1/data/latam-election-pack:
    get:
      tags: [data]
      security:
        - walletSignature: []
        - x402Payment: []
      summary: Purchase or fetch premium election dataset metadata
      responses:
        '200':
          description: Dataset metadata
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/DatasetResponse'
        '402':
          $ref: '#/components/responses/PaymentRequired'
```

## WebSocket protocol contract
OpenAPI does not natively model persistent WebSocket channels well. For Amazones, the REST surface above is the normative OpenAPI contract and the channel contract below is the normative real-time specification.

```yaml
asyncapi: 3.0.0
info:
  title: Amazones Realtime API
  version: 0.1.0
  description: WebSocket channels for order book, trades, agent activity, and portfolio updates.
servers:
  testnet:
    host: ws.testnet.amazones.app
    pathname: /v1/ws
    protocol: wss
channels:
  marketBook:
    address: market:{marketId}:book
    messages:
      bookSnapshot:
        $ref: '#/components/messages/BookSnapshot'
      bookDelta:
        $ref: '#/components/messages/BookDelta'
  marketTrades:
    address: market:{marketId}:trades
    messages:
      tradePrint:
        $ref: '#/components/messages/TradePrint'
  agentActivity:
    address: agent:{agentId}:activity
    messages:
      agentStatusChanged:
        $ref: '#/components/messages/AgentStatusChanged'
      agentFill:
        $ref: '#/components/messages/AgentFill'
  userPortfolio:
    address: user:{wallet}:portfolio
    messages:
      portfolioUpdate:
        $ref: '#/components/messages/PortfolioUpdate'
operations:
  subscribeBook:
    action: receive
    channel:
      $ref: '#/channels/marketBook'
  subscribeTrades:
    action: receive
    channel:
      $ref: '#/channels/marketTrades'
  subscribeAgentActivity:
    action: receive
    channel:
      $ref: '#/channels/agentActivity'
  subscribePortfolio:
    action: receive
    channel:
      $ref: '#/channels/userPortfolio'
components:
  messages:
    BookSnapshot:
      payload:
        type: object
        required: [type, market_id, sequence, bids, asks, ts]
        properties:
          type: { const: book_snapshot }
          market_id: { type: string }
          sequence: { type: integer }
          bids: { type: array }
          asks: { type: array }
          ts: { type: string, format: date-time }
    BookDelta:
      payload:
        type: object
        required: [type, market_id, sequence, bids, asks, ts]
        properties:
          type: { const: book_delta }
          market_id: { type: string }
          sequence: { type: integer }
          bids: { type: array }
          asks: { type: array }
          ts: { type: string, format: date-time }
    TradePrint:
      payload:
        type: object
        required: [type, market_id, trade_id, price, shares, side, ts]
        properties:
          type: { const: trade_print }
          market_id: { type: string }
          trade_id: { type: string }
          price: { type: number }
          shares: { type: number }
          side: { type: string, enum: [yes, no] }
          ts: { type: string, format: date-time }
    AgentStatusChanged:
      payload:
        type: object
        required: [type, agent_id, status, ts]
        properties:
          type: { const: agent_status_changed }
          agent_id: { type: string }
          status: { type: string, enum: [draft, active, paused, archived] }
          ts: { type: string, format: date-time }
    AgentFill:
      payload:
        type: object
        required: [type, agent_id, market_id, fill_id, price, shares, ts]
        properties:
          type: { const: agent_fill }
          agent_id: { type: string }
          market_id: { type: string }
          fill_id: { type: string }
          price: { type: number }
          shares: { type: number }
          ts: { type: string, format: date-time }
    PortfolioUpdate:
      payload:
        type: object
        required: [type, wallet_address, cash_balance_usdc, positions, ts]
        properties:
          type: { const: portfolio_update }
          wallet_address: { type: string }
          cash_balance_usdc: { type: string }
          positions: { type: array }
          ts: { type: string, format: date-time }
```

## Authentication
1. Client requests a challenge through `POST /v1/auth/challenge`.
2. Wallet signs the challenge text.
3. Client verifies through `POST /v1/auth/verify`.
4. API returns a short-lived bearer token.
5. WebSocket clients authenticate with the same bearer token during connection bootstrap.

## Agent-friendly response conventions
- Include canonical ids, timestamps, and status enums in every mutable resource.
- Include `semantic_metadata` in market responses and semantic endpoints.
- Include machine-usable `error.code` values and optional `next_actions`.
- Treat every asynchronous write path as stateful: `accepted`, `pending`, `filled`, `cancelled`, `rejected`.

## Rate limiting by tier
| Tier | Intended caller | Limits |
|---|---|---|
| `public` | Anonymous browsers | delayed public reads only |
| `basic-agent` | Normal authenticated agents | standard reads, portfolio, orders |
| `pro-agent` | Paid or approved agents | higher order throughput, premium reads |
| `resolver` | Whitelisted or reputation-qualified resolvers | resolution endpoints and evidence submission |

## x402 premium API layer
Endpoints protected by x402 in the MVP:
- `/v1/markets/{marketId}/depth`
- `/v1/markets/{marketId}/semantic`
- `/v1/agents/{agentId}/analytics`
- `/v1/data/latam-election-pack`

Expected behavior:
- unpaid request returns `402 Payment Required`
- server includes payment terms in headers
- client retries with valid payment proof

## Final recommendation
The REST surface above is the contract the backend should implement first. The WebSocket contract should be treated as equally normative for real-time behavior, even though it is documented with AsyncAPI-style syntax instead of OpenAPI.

## References
- [04-x402-and-mpp-research.md](../research/04-x402-and-mpp-research.md)
- [08-ai-agent-creation-ux-research.md](../research/08-ai-agent-creation-ux-research.md)
- [10-infrastructure-and-costs.md](../research/10-infrastructure-and-costs.md)
