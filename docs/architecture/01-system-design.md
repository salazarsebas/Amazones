# Amazones System Design

## Final decisions
- Chain: **Stellar testnet first**, Soroban smart contracts
- Collateral: **USDC on Stellar via SAC**
- Market model: **binary YES/NO**
- Execution model: **hybrid off-chain CLOB, on-chain settlement**
- Resolution: **optimistic resolution with bonds and 48h challenge period**
- Human wallet UX: **Stellar Wallets Kit**
- Agent onboarding: **sponsored accounts** plus optional smart-account patterns
- Paid data APIs: **x402**
- Advanced machine-to-machine infra: **MPP later**
- Deployment stack: **Vercel + Supabase + CubePath**
- Database: **Supabase Postgres**
- Ephemeral live state: **Upstash Redis**

## General architecture
```mermaid
flowchart LR
    UI[Next.js Web App]
    AG[External Agents / Internal Agents]
    API[Hono API]
    MATCH[Matching Engine]
    WS[WebSocket Gateway]
    DB[(Postgres)]
    REDIS[(Redis)]
    CP[CubePath Backend]
    XR[x402 Paid API Layer]
    REL[Relayer / Sponsored Tx Service]
    SC[(Soroban Contracts)]
    ORA[Resolution Worker / Resolver Agents]

    UI --> API
    UI --> WS
    AG --> API
    AG --> XR
    API --> MATCH
    MATCH --> REDIS
    API --> DB
    WS --> REDIS
    API --> REL
    CP --> API
    CP --> MATCH
    CP --> WS
    CP --> ORA
    REL --> SC
    API --> SC
    ORA --> API
    ORA --> SC
    SC --> DB
```

## Component responsibilities
### Soroban contracts
- canonical market definitions
- collateral escrow
- position balances
- settlement and redemption
- optimistic resolution and dispute bonds
- agent profile and reputation state

### API and matching engine
- signed order intake
- risk checks
- off-chain sequencing and matching
- settlement orchestration
- market metadata and semantic indexing

### Deployment mapping
- Vercel hosts the Next.js frontend and any minimal stateless public routes.
- CubePath hosts the Hono API, websocket gateway, matching engine, and background workers.
- Supabase stores persistent application data and can provide selected platform features.

### Postgres
- market metadata
- off-chain order state
- fill history
- agent configs
- audit trails

### Redis
- current order book
- websocket fanout
- short-lived intents and quote caches

### Relayer / sponsored tx
- gas abstraction
- agent onboarding
- sponsored settlement or user-triggered actions where appropriate

## Human trade flow
```mermaid
sequenceDiagram
    participant User
    participant Frontend
    participant API
    participant Match
    participant Relayer
    participant MarketContract

    User->>Frontend: Connect wallet / passkey account
    User->>Frontend: Submit BUY YES order
    Frontend->>API: Signed order intent
    API->>Match: Validate + enqueue
    Match-->>API: Fill found
    API->>Relayer: Build settlement transaction
    Relayer->>MarketContract: Settle trade on Soroban
    MarketContract-->>API: Positions and balances updated
    API-->>Frontend: Fill confirmation
    Frontend-->>User: Updated position and probability
```

## Agent trade flow
```mermaid
sequenceDiagram
    participant Agent
    participant API
    participant Risk
    participant Match
    participant Relayer
    participant MarketContract

    Agent->>API: Auth by wallet signature
    Agent->>API: Submit strategy-generated order
    API->>Risk: Check budget, permissions, tier
    Risk-->>API: Approved
    API->>Match: Match order
    Match-->>API: Fill result
    API->>Relayer: Submit settlement
    Relayer->>MarketContract: Update escrow and positions
    MarketContract-->>API: Emit trade events
    API-->>Agent: Structured fill + balance delta
```

## Market creation flow
```mermaid
sequenceDiagram
    participant Creator
    participant UI
    participant API
    participant Policy
    participant Factory

    Creator->>UI: Define question, category, rules, sources
    UI->>API: Market draft request
    API->>Policy: Validate wording, resolution policy, limits
    Policy-->>API: Approved or rejected
    API->>Factory: Create market on Soroban
    Factory-->>API: Market ID and contract state
    API-->>UI: Market created and indexed
```

## Resolution flow
```mermaid
sequenceDiagram
    participant Resolver
    participant API
    participant MarketContract
    participant Challenger

    Resolver->>API: Propose outcome with evidence
    API->>MarketContract: propose_resolution()
    MarketContract-->>API: Challenge window open
    Challenger->>API: Challenge outcome with bond
    API->>MarketContract: challenge_resolution()
    alt no valid challenge
        MarketContract->>MarketContract: finalize_resolution()
    else challenge succeeds
        MarketContract->>MarketContract: slash bad bond and set correct outcome
    end
```

## Key product rules
- Markets are binary in MVP.
- Prices are displayed as probabilities and share prices.
- Order matching is off-chain; ownership and payout are on-chain.
- Outcome shares are internal ledgered positions in MVP, not freely transferable tokens.
- Every market must include structured resolution policy metadata.

## Security posture
- OpenZeppelin relayer and security tooling preferred where possible.
- Pause controls for critical contract flows.
- Replay protection on orders and settlement ids.
- Bonded resolution with explicit challenge windows.

## Non-MVP items deliberately deferred
- fully tokenized composable conditional positions
- multi-outcome markets
- MPP-native market-making channels
- ZK-backed reputation proofs

## References
- [01-stellar-ecosystem-overview.md](../research/01-stellar-ecosystem-overview.md)
- [02-prediction-market-architecture.md](../research/02-prediction-market-architecture.md)
- [03-oracles-research.md](../research/03-oracles-research.md)
- [04-x402-and-mpp-research.md](../research/04-x402-and-mpp-research.md)
