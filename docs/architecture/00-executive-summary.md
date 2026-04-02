# Executive Summary

## Goal
Amazones should launch as an agent-first prediction market on Stellar testnet that remains understandable for normal users, while using audited or ecosystem-native building blocks whenever practical.

## Final technical decisions
- Smart contracts: Soroban in Rust/WASM
- Collateral: native USDC on Stellar
- Market type: binary YES/NO only in the MVP
- Matching model: hybrid off-chain CLOB with on-chain settlement
- Resolution model: optimistic resolution with resolver and challenger bonds plus 48h dispute window
- Human onboarding: Stellar Wallets Kit with passkey-oriented smart account path
- Agent onboarding: sponsored Stellar accounts so agents do not need initial XLM
- Premium APIs: x402 for paid data access
- High-frequency machine payment rail: MPP deferred until after MVP
- Backend stack: Hono on CubePath
- Frontend stack: Next.js on Vercel
- Database: Supabase Postgres
- Ephemeral real-time state: Upstash Redis
- Security stack: OpenZeppelin relayer and security tooling where applicable

## Why this architecture
- Stellar gives lower friction for USDC-native onboarding than Polygon-style bridging.
- Soroban is sufficient for settlement, escrow, reputation, and resolution without forcing a fully on-chain order book.
- A hybrid CLOB is the best fit for low-latency trading and agent participation in the current Stellar ecosystem.
- Optimistic resolution covers both objective and editorial markets, which pure price-feed oracles do not.
- x402 is the right primitive for monetizing structured market data to external agents.

## MVP scope
- Create binary markets with structured resolution policy
- Submit signed YES/NO buy and sell orders
- Match orders off-chain and settle positions on-chain
- Manage agent profiles and visual strategy configuration
- Support optimistic resolution and disputes
- Expose premium structured data endpoints through x402

## Explicit non-MVP scope
- Multi-outcome markets
- Freely transferable tokenized conditional positions
- Mandatory MPP-based trading flows
- ZK-backed reputation proofs
- Fully decentralized dispute court

## Implementation plan by phase
### Phase 0: Research and specification
- Lock research findings in `docs/research/`
- Finalize architecture, API, contract design, and UX flows in `docs/architecture/`
- Freeze MVP scope and rejection criteria

### Phase 1: Contract foundation
- Build `MarketFactory`, `MarketCore`, `Resolution`, and `AgentRegistry`
- Implement storage layout, events, auth rules, and invariants
- Add unit tests for market lifecycle, trade settlement, and dispute flow

### Phase 2: Backend and matching
- Implement wallet-signature auth
- Implement off-chain order intake, validation, sequencing, matching, and settlement orchestration
- Persist market, order, fill, and audit data
- Add resolution worker and relayer integration

### Phase 3: Frontend and agent UX
- Ship market list, market detail, trade ticket, portfolio, and resolution UI
- Ship 5-step agent creation wizard
- Add sponsored account onboarding and wallet/passkey flows
- Add clear probability and payout explanations for non-technical users

### Phase 4: Premium data and ecosystem integrations
- Add x402 protection for premium endpoints
- Add semantic market metadata endpoints
- Integrate sponsored agent account flow in production-quality UX
- Keep MPP behind an experimental integration boundary

### Phase 5: Hardening and launch readiness
- Run contract security detectors and focused manual review
- Load-test matching and websocket fanout
- Rehearse end-to-end testnet flows with human and agent clients
- Prepare deployment, monitoring, and rollback procedures

## Acceptance criteria before coding
- Research documents completed and internally consistent
- Architecture docs reflect final decisions, not alternatives only
- REST and WebSocket contracts are explicit enough for implementation
- Skill and MCP setup is reproducible at repo level

## References
- [01-system-design.md](./01-system-design.md)
- [02-smart-contracts-design.md](./02-smart-contracts-design.md)
- [03-api-design.md](./03-api-design.md)
- [04-agent-creation-flow.md](./04-agent-creation-flow.md)
- [01-v1-roadmap.md](../roadmap/01-v1-roadmap.md)
- [02-v1-backlog.md](../roadmap/02-v1-backlog.md)
