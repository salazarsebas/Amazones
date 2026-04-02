# Amazones V1 Roadmap

## Purpose
This roadmap defines the path from the current documentation-first stage to the first usable version of Amazones. It is written as an execution document, not as a vision note. Each phase has a concrete objective, clear deliverables, explicit exit criteria, and a direct relationship to the product and technical architecture already defined for Amazones.

## Product target for V1
The first version of Amazones must be a **usable testnet product**, not a prototype disguised as a product.

That means the following must be true at release:
- A human user can access the app, understand the market, connect or create an account, place a YES/NO trade, and see portfolio state update correctly.
- An operator can create markets with structured rules and manage the resolution flow with clear evidence and challenge handling.
- A configured AI agent can authenticate, operate within explicit budget and permission limits, and surface a readable operational history.
- The backend can process signed orders, match them off-chain, settle them on Soroban, and recover safely from partial failures.
- The system can be operated repeatedly on Stellar testnet with basic observability, incident handling, and release discipline.

## V1 release principles
- **Agent-first, not agent-only**: every core flow must work for both human users and AI agents.
- **Usability before breadth**: one clear market flow is worth more than a broad but confusing surface.
- **Testnet first**: V1 launches on Stellar testnet only.
- **Operational credibility**: no flow should depend on manual heroics from the team to function.
- **Audited-first dependencies**: default to OpenZeppelin and official Stellar ecosystem components where available.

## Current starting point
At the time of this roadmap, Amazones has already completed the specification stage:
- research documents in `docs/research/`
- architecture specifications in `docs/architecture/`
- API and realtime contracts defined
- repo-local skill and MCP snapshots documented under `skills/` and `mcp/`

The implementation work has not started yet. That means the roadmap should now begin with the first real delivery phase, not with documentation freeze work that is already complete.

## Completed prerequisite: Specification baseline
This stage is already completed and is not part of the remaining execution sequence for V1.

### What is already available
- ecosystem and product research
- system design
- smart contract design
- API and websocket specification
- agent creation flow
- deployment topology
- V1 roadmap baseline

### Why it still matters
The implementation phases below depend on this baseline. If scope changes later, the architecture docs must be updated before implementation continues.

## Release definition

### Internal Alpha
The team can create markets, place trades, run resolution, and create test agents on Stellar testnet.

### Closed Beta
Invited users can complete the core human and agent flows with support from the team, but the product is still under controlled rollout.

### V1 Usable
The core product is stable enough that a new user can understand and use it on testnet without direct operator assistance, and the team can monitor and recover the system with standard runbooks.

## Delivery roadmap

## Phase 1: Smart Contracts Foundation
### Objective
Build the minimum on-chain system required for custody, settlement, redemption, and resolution.

### Scope
- `MarketFactory`
- `MarketCore`
- `Resolution`
- `AgentRegistry`
- fee and treasury handling required for settlement accounting

### Why this phase comes first
Everything else depends on stable contract interfaces, storage behavior, events, and settlement guarantees. If the contract layer is not real, the backend and frontend will only be implementing assumptions.

### Required capabilities
- Create binary markets with structured `resolution_policy`
- Hold and account for USDC collateral
- Track YES/NO positions internally
- Settle matched trades
- Propose, challenge, and finalize market resolution
- Emit events required by indexing and audit flows
- Enforce authorization and replay protection
- Support emergency pause for critical flows

### Definition of done
- Contracts deploy cleanly to testnet.
- Unit and integration tests cover the market lifecycle.
- Invalid paths are explicitly tested: double finalization, unauthorized action, stale resolution, insufficient collateral, replayed settlement intent.
- Contract interfaces align with the architecture docs and API contract.

### Exit criteria
- Market lifecycle works end-to-end on testnet.
- Resolution lifecycle works end-to-end on testnet.
- Contract state and events are stable enough for backend integration.

## Phase 2: Backend, Matching Engine, and Settlement Orchestration
### Objective
Implement the off-chain execution layer that makes the market usable in practice.

### Scope
- wallet-signature authentication
- order intake and validation
- off-chain matching engine
- settlement orchestration to Soroban
- persistence layer
- websocket gateway
- background workers
- resolution worker

### Why this phase comes second
Once the contract interfaces are stable, the backend becomes the system that turns those contracts into a usable market. It is the dependency for both the human product and the agent product.

### Required capabilities
- Generate and verify auth challenges
- Accept signed orders and reject invalid ones deterministically
- Maintain current order book and fill state
- Settle matched fills on-chain with idempotent retry behavior
- Persist market, order, fill, and agent activity history
- Publish realtime updates for book, trades, portfolio, and agent activity
- Handle operational failures without corrupting state

### Definition of done
- The flow `auth -> order -> match -> settle -> portfolio update` works repeatedly in testnet.
- Failed settlement attempts can be retried safely.
- Redis-backed realtime state and Postgres-backed durable state remain consistent after restart.
- Resolution jobs can detect due markets and progress the lifecycle correctly.

### Exit criteria
- A human or agent can trade from the API surface without operator intervention.
- Matching and settlement behavior is stable enough for UI and alpha testing.

## Phase 3: Human Trading UX
### Objective
Ship a clear, trustworthy frontend for non-technical users.

### Scope
- market list
- market detail
- trade ticket
- portfolio
- resolution state visibility
- wallet and onboarding entry flow

### Why this phase comes third
The first external proof that Amazones is usable will come from a human trading flow. Before advanced agent features, the product needs a credible market experience with clear state and understandable outcomes.

### Required product qualities
- YES/NO framing is unambiguous.
- Price is shown both as probability and payout intuition.
- Rules and resolution sources are easy to inspect.
- The user can always see whether a market is open, resolving, resolved, or invalid.
- Trading actions show confirmation, failure, and pending states clearly.

### Definition of done
- A new user can understand a market without prior prediction-market experience.
- A new user can place a trade without guidance from the team.
- The portfolio reflects settled positions accurately.
- Error states are readable and actionable.

### Exit criteria
- Core human flow is usable by internal testers.
- Product language and UI no longer depend on blockchain literacy.

## Phase 4: Agent Creation and Controlled Agent Operation
### Objective
Make agent participation a first-class product flow rather than an engineering-only capability.

### Scope
- agent creation wizard
- model provider setup
- API key validation
- strategy configuration
- permission controls
- budget and risk limits
- sponsored account path or existing wallet path
- agent detail and activity screens

### Why this phase comes fourth
The agent system should be built on top of a stable market product, not used to discover basic execution bugs. By this point, the team can focus on safe automation and agent UX instead of underlying trading mechanics.

### Required capabilities
- Create agents as `draft`
- Activate and pause agents safely
- Store provider references securely
- Enforce budget caps and permission constraints
- Log agent actions in a way humans can inspect
- Surface performance and state clearly

### Definition of done
- A non-technical user can configure an agent in the UI.
- The product clearly explains what the agent is allowed to do.
- An operator can pause an agent instantly when needed.
- The agent cannot exceed configured budget or capability limits.

### Exit criteria
- Agents can participate in the product under safe operational controls.
- The “agent-first” promise is visible in the actual product, not just in docs.

## Phase 5: Premium Data and x402 Monetization Layer
### Objective
Introduce the first revenue-capable and ecosystem-facing API surface.

### Scope
- x402-protected depth endpoint
- x402-protected semantic market endpoint
- x402-protected agent analytics endpoint
- first premium dataset endpoint

### Why this phase comes fifth
The product must first work as a market before it can sell infrastructure to third-party agents. x402 is strategically important, but it should monetize a stable system, not subsidize an unfinished one.

### Required capabilities
- Return `402 Payment Required` with usable terms
- Accept valid payment flow and unlock access
- Distinguish public versus premium data cleanly
- Instrument usage and error visibility for premium endpoints

### Definition of done
- External clients can discover and pay for premium resources.
- Premium endpoints are stable enough for repeated agent consumption.
- The addition of x402 does not degrade the main trading product.

### Exit criteria
- Amazones exposes at least one credible paid agent-facing capability in testnet.

## Phase 6: Hardening, Operations, and V1 Release
### Objective
Turn the integrated product into a releasable system.

### Scope
- end-to-end validation
- contract security checks
- operational dashboards and alerts
- deployment pipeline
- rollback and incident procedures
- seeded markets for live usage

### Why this phase closes the roadmap
The earlier phases make the product functional. This phase makes the product publishable and supportable as a real testnet release.

### Required capabilities
- Observe and troubleshoot order flow, settlement, resolution, and premium API failures
- Recover from partial service failure
- Validate contracts and backend behavior under realistic repeated use
- Release updates without breaking the live testnet instance

### Definition of done
- Internal Alpha and Closed Beta have both been completed.
- The team has operational runbooks for common failures.
- Testnet launch can be sustained without direct engineering intervention for each action.

### Exit criteria
- Amazones V1 Testnet is publishable as a usable product.

## Acceptance criteria by release stage

## Internal Alpha acceptance
- markets can be created and resolved internally
- trades settle successfully on Soroban
- portfolio updates reflect fills correctly
- human trading flow is usable by the team
- agent creation works end-to-end in controlled conditions
- core failures are observable

## Closed Beta acceptance
- invited users can trade and inspect outcomes
- invited users can create and manage simple agents
- premium endpoints work for controlled external clients
- operational incidents are recoverable through documented procedures

## V1 usable acceptance
- human trading flow works without team guidance
- agent creation and limited autonomous operation work without code edits
- resolution and disputes are operable with clear evidence handling
- premium endpoints are usable by external agent developers
- the product is stable enough for repeated use on testnet

## Success metrics for V1
- first-time user completes a trade without operator support
- invited tester understands market resolution rules before trading
- agent can operate within limits for repeated sessions
- settlement success rate is high enough for beta use
- support burden is low enough that routine activity does not require engineering intervention

## Risks that must be managed before V1
- settlement inconsistency between off-chain matching and on-chain state
- ambiguous market wording leading to resolution disputes
- agent overreach caused by weak budget or permission enforcement
- poor onboarding causing users to fail before first trade
- premium API flows that are technically correct but too cumbersome for real agent usage

## Next steps after V1

## Step 1: V1.1 Product Maturity
### Goal
Increase reliability, supportability, and product clarity without expanding product scope too aggressively.

### What this includes
- stronger reconciliation between matching and settlement
- better observability and alerting
- improved trade confirmations and failure recovery UX
- cleaner operator dashboards
- better agent analytics and history views

### Why it matters
V1 proves Amazones can work. V1.1 proves Amazones can be operated repeatedly and trusted by early users. This step reduces the risk that growth simply amplifies operational weakness.

### Expected outcome
The team spends less time manually diagnosing issues, users see fewer confusing states, and the product becomes stable enough to support more aggressive market and agent growth.

## Step 2: V1.2 Market Expansion
### Goal
Increase product usefulness by expanding the market surface without changing the core execution model.

### What this includes
- more market categories
- better market creation tooling
- stronger editorial quality controls
- selective use of numeric oracle-backed market types where Reflector fits
- controlled opening of market creation to more users or approved agents

### Why it matters
A prediction market with strong mechanics but weak market inventory will not retain usage. This stage focuses on supply quality, category breadth, and repeated engagement.

### Expected outcome
Higher trading frequency, better return rate from users, and more reasons for agents to stay active in the system.

## Step 3: V1.3 Agent Marketplace
### Goal
Turn agents from an internal capability into a marketplace layer with its own value proposition.

### What this includes
- public or permissioned agent discovery
- agent subscriptions or copy-style participation models
- rankings and performance by category
- reputation and monetization for agent creators
- stronger explainability around agent behavior and history

### Why it matters
This is where Amazones becomes structurally differentiated. The market is no longer only a place to trade outcomes; it also becomes a place to discover, evaluate, and use market-facing agents.

### Expected outcome
New monetization paths, stronger creator incentives, and a more defensible product identity.

## Step 4: V2 Resolution and Trust Expansion
### Goal
Improve market credibility and reduce dependence on the core team for hard resolution cases.

### What this includes
- more advanced resolver reputation
- broader verifier participation
- better fallback mechanisms for deadlocked disputes
- clearer evidence standards
- exploration of ZK-backed reputation proofs as a separate post-V1 line of work

### Why it matters
The optimistic model is a strong MVP fit, but trust requirements rise as markets become more numerous, sensitive, or valuable. This phase evolves resolution from a practical workflow into a more credible trust layer.

### Expected outcome
Higher confidence in the fairness of outcomes and lower long-term centralization pressure on the operating team.

## Step 5: Advanced Agent Economics
### Goal
Expand the economic layer that supports professional agents and machine-to-machine infrastructure.

### What this includes
- MPP for repeated high-frequency service relationships
- richer premium data products
- agent-to-agent or agent-to-infra payment flows
- private markets or higher-tier agent services
- more advanced market-making and service-provider participation

### Why it matters
x402 is the correct first monetization layer, but it is not the full economic model for a serious agent ecosystem. This phase supports denser automation and more sophisticated commercial relationships around Amazones.

### Expected outcome
Amazones becomes not only a prediction market, but also a programmable market infrastructure layer for autonomous economic actors.

## Executive recommendation
The correct path is to treat V1 as a **usable testnet market and agent product**, not as a prematurely broad platform. The first release should earn trust through clarity, safe automation, and reliable settlement. The phases after V1 should then expand reliability first, market depth second, and ecosystem differentiation third.

That sequence gives Amazones the best chance of becoming both usable in the short term and strategically differentiated in the medium term.

## References
- [Executive Summary](../architecture/00-executive-summary.md)
- [System Design](../architecture/01-system-design.md)
- [Smart Contracts Design](../architecture/02-smart-contracts-design.md)
- [API Design](../architecture/03-api-design.md)
- [Agent Creation Flow](../architecture/04-agent-creation-flow.md)
