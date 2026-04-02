# Smart Contracts Design

## Contract set
- `MarketFactory`
- `MarketCore`
- `ResolutionModule` or embedded resolution logic inside `MarketCore`
- `AgentRegistry`
- `FeeTreasury`

## Contract roles
- `admin`
- `market_creator`
- `resolver`
- `challenger`
- `relayer`

## MarketFactory
### Responsibilities
- create new markets
- validate immutable market parameters
- assign market ids
- register market metadata hash / URI

### Interface
```rust
fn create_market(
    creator: Address,
    collateral_asset: Address,
    question: String,
    category: Symbol,
    close_time: u64,
    resolve_time: u64,
    resolution_policy_uri: String,
    resolver_bond: i128,
    challenger_bond: i128,
) -> BytesN<32>;
```

## MarketCore
### Responsibilities
- hold collateral
- track YES/NO positions
- settle matched trades
- manage redemption after final resolution

### Interface
```rust
fn deposit_collateral(user: Address, amount: i128);
fn withdraw_unused_collateral(user: Address, amount: i128);
fn settle_trade(
    settlement_id: BytesN<32>,
    buyer: Address,
    seller: Address,
    side: Symbol,
    price_bps: u32,
    shares: i128,
    fee_bps: u32,
);
fn get_position(user: Address) -> Position;
fn redeem(user: Address) -> i128;
```

## Resolution interface
```rust
fn propose_resolution(resolver: Address, outcome: Symbol, evidence_uri: String);
fn challenge_resolution(challenger: Address, evidence_uri: String);
fn finalize_resolution();
```

## AgentRegistry
### Responsibilities
- register agent profiles
- store compact reputation fields
- store permission flags

### Interface
```rust
fn register_agent(owner: Address, agent_wallet: Address, agent_type: Symbol, metadata_uri: String);
fn set_agent_status(agent_wallet: Address, status: Symbol);
fn update_reputation(agent_wallet: Address, category: Symbol, score_delta: i64);
fn get_agent(agent_wallet: Address) -> AgentProfile;
```

## Storage keys
### `MarketFactory`
- `Admin`
- `MarketCount`
- `MarketsById`

### `MarketCore`
- `Config`
- `CollateralBalance(Address)`
- `YesShares(Address)`
- `NoShares(Address)`
- `LockedCollateral(Address)`
- `SettlementUsed(BytesN<32>)`
- `ResolutionState`
- `ResolutionProposal`
- `ChallengeDeadline`
- `ResolverBond`
- `ChallengerBond`

### `AgentRegistry`
- `AgentProfile(Address)`
- `AgentCategoryScore(Address, Symbol)`
- `AgentVolume(Address)`

## Storage class guidance
- `Instance`: immutable config, admin, asset addresses
- `Persistent`: balances, positions, market lifecycle state, agent profiles
- `Temporary`: expiring settlement guards, short-lived challenge metadata if compact enough

## Events
```text
MarketCreated(market_id, creator, category)
CollateralDeposited(market_id, user, amount)
TradeSettled(market_id, settlement_id, buyer, seller, side, price_bps, shares)
ResolutionProposed(market_id, resolver, outcome, challenge_deadline)
ResolutionChallenged(market_id, challenger)
ResolutionFinalized(market_id, outcome)
Redeemed(market_id, user, amount)
AgentRegistered(agent_wallet, owner, agent_type)
AgentReputationUpdated(agent_wallet, category, delta)
```

## Authorization flows
### Human trade settlement
- User signs order off-chain.
- Matching engine produces fill.
- Relayer or backend submits `settle_trade`.
- Contract checks replay guard with `settlement_id`.
- Contract updates locked collateral and position balances.

### Agent trade settlement
- Agent wallet signs auth just like a human wallet.
- Optional smart-account policy constrains spend.
- Same settlement function, same market contract.

### Resolution
- Any authorized resolver can call `propose_resolution` if bonded.
- Any challenger can call `challenge_resolution` before deadline if bonded.
- `finalize_resolution` is permissionless after the challenge window.

## Important invariants
- `YES + NO` exposure must always be collateralized.
- `settlement_id` must be single-use.
- Market outcome becomes immutable after finalization.
- Redemption cannot exceed collateral pool less fees.

## Design choice: internal positions vs tokenized YES/NO
For MVP, positions stay internal to `MarketCore`.

### Reason
- simpler accounting
- fewer contracts
- less transfer-related abuse surface
- faster to audit

## Upgrade stance
Prefer controlled upgradeability only where strictly needed. For MVP, immutable market instances plus a controlled factory is safer than a highly upgradeable system.

## References
- [01-system-design.md](./01-system-design.md)
- [05-openzeppelin-stellar-research.md](../research/05-openzeppelin-stellar-research.md)
- [09-agent-identity-and-reputation.md](../research/09-agent-identity-and-reputation.md)
