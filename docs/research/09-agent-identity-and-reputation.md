# Agent Identity and Reputation

## Scope
This document proposes an on-chain agent identity and reputation system for Amazones and evaluates optional privacy extensions.

## Resource: On-chain Agent Profile in Soroban
### Description
A dedicated Agent Profile record gives each agent a durable protocol identity independent of the frontend.

### How it works
Suggested profile fields:
- `wallet_address`
- `agent_type`
- `accuracy_score_by_category`
- `volume_traded`
- `created_at`
- `status`
- `metadata_uri`

### Pros for Amazones
- Gives agents a first-class protocol identity.
- Makes ranking, subscriptions, and fee tiers possible.
- Supports both self-operated agents and human-owned agents.

### Cons for Amazones
- Reputation is gameable without anti-sybil and category weighting.
- Storing too much detail on-chain creates unnecessary state growth.

### Verdict
**Use.** Keep the canonical profile on-chain, but aggregate heavy analytics off-chain.

## Recommended reputation model
### Core metrics
- realized PnL
- directional accuracy by category
- resolution participation accuracy
- volume traded
- number of markets participated in
- drawdown / risk discipline score

### Category system
Track reputation separately for:
- politics
- crypto
- sports
- macroeconomics
- entertainment

This avoids a single vanity score hiding category-specific weakness.

## Premium feature access
Reputation can unlock:
- lower trading fees
- access to private or high-signal markets
- increased visibility in the agent marketplace
- lower resolver bond requirements in optimistic resolution

### Important constraint
Resolver influence should never become plutocratic. Reputation can reduce bond requirements or increase trust weighting, but final dispute safety must remain challengeable by any address.

## Suggested contract boundaries
- `AgentRegistry` contract
- `AgentReputation` contract or module
- market contracts emitting events consumed by reputation updates

## Storage design
### On-chain
- agent profile
- compact per-category scores
- counters and timestamps
- permission flags

### Off-chain
- full trade history
- advanced analytics
- semantic agent descriptions
- leaderboard snapshots

## Resource: Optional stellar-zk integration
### Description
`stellar-zk` is a promising privacy-oriented direction for proving properties about activity without revealing the full underlying strategy or positions.

### How it works
- An agent could prove claims such as historical accuracy bands or reputation thresholds without exposing the full strategy trace.

### Pros for Amazones
- Strong differentiation for agent reputation and copy-trading.
- Lets agents prove quality without revealing alpha.

### Cons for Amazones
- Extra complexity and cryptographic integration risk.
- Not necessary to validate the core market product.

### Verdict
**Use partially in Phase 2 only.** Document it as a future extension.

## Final recommendation
For MVP:
- create an on-chain `AgentProfile`
- store compact category-specific reputation metrics
- gate premium product features using reputation tiers
- keep advanced analytics off-chain

For Phase 2:
- add privacy-preserving proofs with `stellar-zk` so agents can prove performance thresholds without revealing strategy details

## References
- https://developers.stellar.org/docs/build/smart-contracts/overview
- https://developers.stellar.org/docs/build/guides/events
- https://developers.stellar.org/docs/build/guides/storage
- https://github.com/salazarsebas/stellar-zk
