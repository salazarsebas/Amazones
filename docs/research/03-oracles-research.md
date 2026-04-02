# Oracle Research for Market Resolution

## Scope
This document evaluates three realistic resolution approaches for Amazones on Stellar: Reflector Oracle, Band Protocol, and a custom optimistic resolution system.

## Resource: Reflector Oracle
### Description
Reflector is a live oracle provider already used in Stellar DeFi, especially for price feeds.

### How it works
- Reflector publishes data feeds consumable by Stellar/Soroban integrations.
- In practice it is suited to objective numerical data such as asset prices.
- The broader Stellar DeFi ecosystem already references it for lending and collateral flows.

### How it is integrated in `kaankacar/stellar-defi-app`
- The integration pattern is the standard Soroban consumer pattern for a SEP-40-compatible oracle.
- A contract that needs prices stores or receives the Reflector contract address as configuration.
- At execution time, the consumer instantiates the oracle client and requests the latest quote for the required asset pair.
- The consumer contract then applies local risk logic to that price, for example collateral valuation, health checks, or liquidation thresholds.
- This is consistent with Reflector's own reference usage, where a contract creates a `PriceOracleClient`, reads decimals and a quote, and then derives business logic from the returned value and timestamp.

### Practical reading for Amazones
- In a DeFi app like `stellar-defi-app`, Reflector is not acting as a subjective truth engine.
- It is an objective numeric dependency used inside contract logic, typically to answer questions like "what is BTC worth in the base asset right now?".
- That makes it useful for valuation and threshold checks, but not for markets such as elections, sports, or policy outcomes.
- Because the consumer must also verify feed freshness, a realistic integration should check timestamp staleness before trusting a quote for settlement-sensitive logic.

### Pros for Amazones
- Native Stellar ecosystem relevance.
- Strong candidate for crypto-price or macro numeric markets.
- Lower integration risk than inventing a numeric-price feed from scratch.

### Cons for Amazones
- It is not a general-purpose event-resolution oracle for ambiguous real-world questions.
- It does not solve subjective market rules, source-of-truth disputes, or editorial adjudication.

### Verdict
**Use partially.** Use Reflector only for clearly defined numeric markets where the resolution source is a price/time feed.

## Resource: Band Protocol on Stellar
### Description
Band is available in the Stellar ecosystem as an oracle option, again mainly for structured external data feeds.

### How it works
- Band supplies externally sourced data through oracle infrastructure rather than custom per-market human adjudication.
- Best fit is machine-verifiable data with known schemas and update cadence.

### Pros for Amazones
- Better decentralization optics than a fully proprietary oracle.
- Useful for future expansion into sports stats, macro data, and price-indexed markets if supported feeds match demand.

### Cons for Amazones
- Feed coverage and operational maturity on Stellar are narrower than Ethereum-centric oracle expectations.
- Like Reflector, it is not enough for subjective market wording or edge-case resolution disputes.

### Verdict
**Use partially later.** Worth evaluating after the MVP if specific Band-supported feeds overlap with high-volume Amazones markets.

## Resource: Custom optimistic resolution
### Description
This is the closest match to UMA-style resolution used by modern event markets: anyone can propose an outcome, challengers can dispute, and the market finalizes after a challenge window if no valid dispute succeeds.

### How it works
- Market creator defines a clear resolution source and rules at creation time.
- After event maturity, a resolver proposes the outcome on-chain.
- A 48-hour challenge window opens.
- Challengers post a bond to dispute.
- A designated adjudication path decides the winner, and correct participants receive fees while incorrect actors lose stake.

### Pros for Amazones
- Works for subjective or editorial markets, not just price feeds.
- Keeps the MVP flexible across elections, sports, crypto, and regional current events.
- Can be made agent-friendly: agent resolvers and verifiers can monitor markets and earn fees.
- Fits the product's differentiation better than relying entirely on price-feed oracles.

### Cons for Amazones
- Requires careful dispute UX and bonded incentives.
- More governance and policy work than plugging in a pure data feed.
- Incorrectly specified market rules create downstream operational risk.

### Verdict
**Use.** This should be the main MVP resolution design.

## Recommended MVP oracle strategy
### MVP
- Primary resolution: **custom optimistic resolution** with explicit market rules, source URL, resolver bond, challenger bond, and 48-hour dispute window.
- Supplemental feed support: **Reflector** for purely numeric crypto-price markets.

### Scale-up path
- Add **Band** where it provides coverage for machine-verifiable markets.
- Introduce a resolver reputation system so verified agents can earn more responsibility and lower bond requirements.
- Add a fallback resolution council or multisig only for deadlocked disputes.

## Integration notes
- Market creation must require a structured `resolution_policy`.
- Each market should store:
  - canonical question
  - resolution source(s)
  - resolution timestamp or condition
  - allowed resolver types
  - bond amounts
  - challenge deadline
- The protocol should emit explicit events for `ResolutionProposed`, `ResolutionChallenged`, `ResolutionFinalized`, and `BondSlashed`.
- For Reflector-backed numeric markets, the policy should also store:
  - oracle contract address
  - required asset pair or feed key
  - maximum accepted staleness
  - resolution timestamp used for the final read

## Final recommendation
- **MVP:** optimistic resolution
- **Specialized feed markets:** Reflector
- **Phase 2 expansion:** Band where supported

This is the only approach that covers both objective data markets and the more interesting agent-created event markets without blocking the MVP on oracle vendor coverage.

## References
- https://developers.stellar.org/docs/data/oracles
- https://defillama.com/oracles/Reflector/Stellar
- https://github.com/kaankacar/stellar-defi-app
- https://github.com/reflector-network/reflector-contract
- https://github.com/reflector-network/reflector-contract/tree/master/contracts/reflector
- https://polymarketguide.gitbook.io/polymarketguide/resolution/oracles
- https://github.com/bandprotocol
