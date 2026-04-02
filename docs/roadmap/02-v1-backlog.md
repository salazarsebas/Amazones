# Amazones V1 Backlog

## Purpose
This backlog translates the V1 roadmap into executable work packages. It is organized by epic, priority, dependency order, owner role, and acceptance criteria so the team can move from planning into delivery without re-deciding what to build first.

## Planning rules
- Priority order is strict unless a dependency is explicitly marked as parallelizable.
- `P0` means blocking for V1.
- `P1` means required for V1 but can start after the relevant `P0` dependency.
- `P2` means valuable for V1 polish or beta readiness, but not the first blocking item.
- Owner roles are functional placeholders: `contracts`, `backend`, `frontend`, `ops`, `product`.

## Execution order summary
1. Contracts foundation
2. Backend and settlement orchestration
3. Human trading UX
4. Agent product layer
5. Premium data and x402
6. Hardening and release

## Epic A: Contracts Foundation
### Objective
Establish the on-chain truth for markets, collateral, settlement, and resolution.

| ID | Priority | Work item | Owner | Depends on | Acceptance criteria |
|---|---|---|---|---|---|
| A1 | P0 | Scaffold Soroban workspace and contract packages | contracts | none | workspace builds locally and targets testnet deployment |
| A2 | P0 | Implement `MarketFactory` create-market flow | contracts | A1 | market creation succeeds with immutable config and stored policy metadata |
| A3 | P0 | Implement `MarketCore` collateral deposit and withdrawal paths | contracts | A1 | collateral accounting is correct and unauthorized access is blocked |
| A4 | P0 | Implement `MarketCore` settlement path with replay guard | contracts | A2, A3 | single settlement id cannot be reused and balances update correctly |
| A5 | P0 | Implement resolution propose/challenge/finalize flow | contracts | A2 | challenge window and finalization invariants hold |
| A6 | P1 | Implement `AgentRegistry` profile and status storage | contracts | A1 | agent profile can be registered, read, and status-updated safely |
| A7 | P1 | Implement fee and treasury handling needed for settlement accounting | contracts | A4 | fees are tracked consistently and do not break redemption |
| A8 | P0 | Add unit and integration tests for full market lifecycle | contracts | A2, A3, A4, A5 | green contract test suite covers valid and invalid paths |
| A9 | P1 | Deploy contracts to Stellar testnet and record addresses | contracts | A8 | deploy script works and contract addresses are documented |

## Epic B: Backend and Matching
### Objective
Provide the off-chain execution engine that turns contracts into a working market.

| ID | Priority | Work item | Owner | Depends on | Acceptance criteria |
|---|---|---|---|---|---|
| B1 | P0 | Scaffold backend services and shared config | backend | A1 | services run locally with documented env config |
| B2 | P0 | Implement wallet challenge and verify auth flow | backend | B1 | signed auth works for human and agent wallets |
| B3 | P0 | Design and implement database schema for markets, orders, fills, agents, audit logs | backend | B1 | schema supports MVP flows and migrations run cleanly |
| B4 | P0 | Implement order intake validation and rejection logic | backend | B2, B3, A4 | invalid orders are deterministically rejected with machine-readable errors |
| B5 | P0 | Implement off-chain matching engine for binary YES/NO orders | backend | B4 | valid orders can match into fills consistently |
| B6 | P0 | Implement settlement orchestrator to Soroban | backend | B5, A4, A9 | matched fills settle on testnet and retries are idempotent |
| B7 | P1 | Implement websocket gateway for book, trades, portfolio, and agent activity | backend | B5, B6 | subscribed clients receive consistent realtime updates |
| B8 | P1 | Implement resolution worker for due markets and dispute progression | backend | A5, B3 | worker detects due states and progresses lifecycle safely |
| B9 | P1 | Implement audit logging and operational trace ids | backend | B2, B4, B6 | critical actions can be reconstructed from logs and DB records |

## Epic C: Human Trading UX
### Objective
Ship the first human-usable trading surface.

| ID | Priority | Work item | Owner | Depends on | Acceptance criteria |
|---|---|---|---|---|---|
| C1 | P0 | Scaffold Next.js app and shared frontend foundations | frontend | none | app runs locally with deployment-ready structure |
| C2 | P0 | Implement wallet/connect entry flow | frontend | B2 | user can authenticate successfully from UI |
| C3 | P0 | Build market list page | frontend | B3 | markets render with status, title, and price/probability |
| C4 | P0 | Build market detail page with rules and resolution policy visibility | frontend | C3 | user can inspect market terms before trading |
| C5 | P0 | Build trade ticket and order submission flow | frontend | B4, B5, B6, C4 | user can submit and track YES/NO trades from the UI |
| C6 | P0 | Build portfolio view with settled positions and activity | frontend | B6, B7 | portfolio reflects current user state clearly |
| C7 | P1 | Build resolution-state UI with challenge window visibility | frontend | A5, B8, C4 | user can understand whether a market is open, resolving, or resolved |
| C8 | P1 | Add empty states, pending states, and readable failure states | frontend | C3, C4, C5, C6 | no critical flow fails silently or ambiguously |

## Epic D: Agent Product Layer
### Objective
Make agent participation usable through product UX and enforcement, not manual engineering setup.

| ID | Priority | Work item | Owner | Depends on | Acceptance criteria |
|---|---|---|---|---|---|
| D1 | P0 | Implement backend agent model and encrypted provider reference handling | backend | B3 | agent records and secret references are stored safely |
| D2 | P0 | Implement create, update, pause, and activate agent endpoints | backend | D1, A6 | agent lifecycle endpoints work and enforce state rules |
| D3 | P0 | Enforce budget and permission controls in execution path | backend | D2, B4, B5 | agent cannot exceed limits or unauthorized actions |
| D4 | P0 | Build agent creation wizard UI | frontend | D2 | non-technical user can create agent as draft |
| D5 | P0 | Build agent detail page with status, limits, and recent activity | frontend | D2, B7 | operator can inspect and pause agent clearly |
| D6 | P1 | Integrate sponsored-account onboarding path for agent wallets | backend | A9, D2 | agent can obtain usable testnet wallet flow without manual funding |
| D7 | P1 | Add provider validation feedback and activation checks | frontend | D2, D4 | invalid provider setup is surfaced before activation |

## Epic E: Premium Data and x402
### Objective
Expose the first monetizable agent-facing API layer.

| ID | Priority | Work item | Owner | Depends on | Acceptance criteria |
|---|---|---|---|---|---|
| E1 | P1 | Implement premium depth endpoint | backend | B5, B7 | endpoint returns usable depth payload and supports payment gate |
| E2 | P1 | Implement semantic market metadata endpoint | backend | B3 | endpoint returns structured market metadata suitable for agents |
| E3 | P1 | Implement agent analytics endpoint | backend | D2, D3 | analytics endpoint returns stable agent metrics |
| E4 | P1 | Implement x402 middleware and payment validation flow | backend | E1, E2, E3 | unpaid requests return `402`, paid requests succeed |
| E5 | P2 | Implement first premium dataset endpoint | backend | E4 | external client can obtain at least one packaged premium dataset |
| E6 | P2 | Document external consumption flow for premium endpoints | product | E4 | integration instructions are sufficient for third-party agent use |

## Epic F: Hardening and Release Readiness
### Objective
Convert the integrated system into a supportable V1 testnet release.

| ID | Priority | Work item | Owner | Depends on | Acceptance criteria |
|---|---|---|---|---|---|
| F1 | P0 | Set up deployment pipelines and environment separation | ops | B1, C1 | staging and production-like testnet environments are deployable |
| F2 | P0 | Add structured logs, metrics, and critical alerts | ops | B6, B8, E4 | failures in settlement, resolution, and premium APIs are observable |
| F3 | P0 | Write runbooks for deploy, rollback, settlement failure, and resolution incidents | ops | F1, F2 | team can execute common recovery flows without ad hoc decisions |
| F4 | P0 | Run end-to-end validation for human trade flow | product | C5, C6, F1 | first-time user can complete trade without engineering intervention |
| F5 | P0 | Run end-to-end validation for agent creation and operation | product | D4, D5, F1 | configured agent can operate within limits repeatedly |
| F6 | P1 | Run contract security checks and focused review pass | contracts | A8 | major auth and settlement risks are reviewed before beta |
| F7 | P1 | Seed initial markets for alpha and beta testing | product | C3, C4, A9 | testers have a meaningful initial market inventory |
| F8 | P1 | Execute Closed Beta and collect operational findings | product | F4, F5, F7 | beta feedback is captured and critical blockers are resolved |

## Parallelization guidance
- `A6` and `A7` can progress while final market settlement tests are being completed if they do not destabilize core interfaces.
- `B3` can start as soon as contract interfaces and event shapes are stable enough to model.
- `C1` and design system setup can begin in parallel with backend scaffolding, but trading UI should wait for API behavior to stabilize.
- `D4` can begin on top of mock flows once `D2` interface shape is fixed, but activation logic must wait for backend enforcement.
- `F1` and parts of `F2` can start before the feature backlog is fully complete.

## Definition of MVP-complete backlog
V1 is ready for release only when the following are all true:
- all `P0` items are complete
- `E4` is complete because premium access is part of the V1 positioning
- at least one of `E5` or `E6` is complete so premium capability is externally usable
- `F4`, `F5`, and `F8` are complete

## Recommended immediate next work
The next execution sprint should start with:
1. `A1`
2. `A2`
3. `A3`
4. `A4`
5. `A8`

That sequence gives the team a real contract backbone fast and prevents backend and frontend implementation from drifting away from settlement truth.

## References
- [V1 Roadmap](./01-v1-roadmap.md)
- [Smart Contracts Design](../architecture/02-smart-contracts-design.md)
- [API Design](../architecture/03-api-design.md)
- [Deployment Topology](../architecture/05-deployment-topology.md)
