# Stellar Ecosystem Overview for Amazones

## Scope
This document evaluates the Stellar primitives most relevant to Amazones: Soroban smart contracts, contract storage, Stellar Asset Contracts (SAC), USDC on Stellar, fees, settlement finality, and the tradeoffs versus Polygon for a prediction market.

## Resource: Soroban smart contracts
### Description
Soroban is Stellar's WASM smart contract platform, with contracts typically written in Rust and deployed as deterministic contract instances on Stellar.

### How it works
- Contracts compile to WASM and run inside Soroban's host environment.
- Contract authorization is explicit and first-class, which matters for agent-operated wallets and relayed execution.
- Soroban contracts can interact with Stellar-native assets through the Stellar Asset Contract bridge.

### Pros for Amazones
- Strong fit for deterministic market logic, settlement, escrow, fees, and agent identity.
- Rust + WASM is safer than writing a custom execution layer in an untyped stack.
- Native interoperability with Stellar assets and sponsored transaction patterns supports agent onboarding.
- Official Stellar docs, CLI, Quickstart, and RPC tooling are now mature enough for MVP work on testnet.

### Cons for Amazones
- Ecosystem is younger than Ethereum/Polygon, so reusable DeFi market primitives are fewer.
- Prediction-market-specific examples are limited; more architecture work falls on Amazones.
- Contract size and storage economics require discipline around state design.

### Verdict
**Use.** Soroban should be the contract layer for the MVP.

## Resource: Soroban storage model
### Description
Soroban exposes three storage classes: `Persistent`, `Temporary`, and `Instance`.

### How it works
- `Persistent`: long-lived contract state that survives until explicitly removed or expires from TTL neglect.
- `Temporary`: cheaper state meant for short-lived data, useful for ephemeral order intents, disputes, or expiring commitments.
- `Instance`: state attached to the contract instance itself; useful for config and compact global counters.

### Pros for Amazones
- Natural split between durable market state and short-lived order/dispute state.
- `Temporary` storage is a good fit for challenge windows, quote caches, or optimistic-resolution timers.
- `Instance` storage works well for immutable or rarely changing config like fee params and admin roles.

### Cons for Amazones
- TTL extension is operationally important; forgetting it creates avoidable failure modes.
- Overusing persistent storage for order-book-like state can become expensive and operationally noisy.

### Verdict
**Use partially.** Use `Persistent` for markets, positions, payouts, and reputation; `Temporary` for expiring intents/challenges; `Instance` for contract config only.

## Resource: Stellar Asset Contract (SAC)
### Description
SAC is the protocol-provided contract interface that makes Stellar assets available to Soroban contracts under a standard token interface.

### How it works
- Any Stellar asset can be represented by a deterministic SAC instance.
- Contracts call the SAC rather than maintaining a bespoke fungible token implementation when a standard Stellar-issued asset is enough.
- SAC gives contracts access to XLM balances, trustlines, and contract token balances through a standard interface.

### Pros for Amazones
- Ideal for USDC collateral and any canonical issued asset used in settlement.
- Reduces custom token surface area and leverages protocol-level interoperability.
- Better than inventing a custom collateral token contract for the MVP.

### Cons for Amazones
- YES/NO shares may still need dedicated market logic even if collateral uses SAC.
- SAC alone does not solve prediction-market splitting/merging semantics.

### Verdict
**Use.** Use SAC for collateral assets, especially USDC. For outcome shares, use SAC-compatible token logic only if it keeps the design simple; otherwise, keep shares internal to the market contract until redemption.

## Resource: Native USDC on Stellar
### Description
USDC is a first-class, widely used Stellar asset and is the obvious quote/collateral asset for Amazones.

### How it works
- Users hold USDC through Stellar trustlines.
- Soroban contracts can interact with its SAC representation.
- Testnet flows still require account funding and trustline setup unless sponsorship abstracts it away.

### Pros for Amazones
- Lowest-friction stable collateral option in the Stellar ecosystem.
- Strong alignment with agentic payments research, x402, and sponsored-account onboarding.
- Cleaner UX than asking users to bridge to an ecosystem-specific synthetic.

### Cons for Amazones
- Agents still need trustlines and account bootstrapping unless onboarding is abstracted.
- US users may still need off-ramp/on-ramp guidance outside the app.

### Verdict
**Use.** USDC on Stellar should be the default collateral and settlement asset.

## Resource: Fees and finality
### Description
Stellar combines low transaction fees with deterministic-style fast settlement characteristics, with blocks closing roughly every 5 seconds.

### How it works
- Stellar uses SCP rather than probabilistic block production.
- Fees are low, and Soroban resource pricing is explicit.
- Sponsored transactions and relayers can shift gas complexity away from end users and agents.

### Pros for Amazones
- Better fit than higher-cost chains for many small trades, dispute actions, and agent activity.
- Fast enough for a CLOB or hybrid execution system, even if not ideal for ultra-low-latency HFT.
- Deterministic settlement profile is attractive for real-money markets.

### Cons for Amazones
- Not optimized for sub-second matching on-chain.
- For highly active order books, fully on-chain matching would still be inefficient.

### Verdict
**Use.** Stellar's cost/finality profile is strong for settlement, escrow, and low-friction consumer trading.

## Stellar vs Polygon for Amazones
| Dimension | Stellar | Polygon PoS |
|---|---|---|
| Collateral UX | Native USDC and simple sponsored account patterns | Mature USDC liquidity, but bridging and wallet complexity are common for new users |
| Smart contract stack | Soroban Rust/WASM | EVM/Solidity |
| Ecosystem maturity | Smaller, especially for prediction markets | Much larger DeFi and prediction market adjacency |
| Fees | Very low | Low, but variable and still worse UX than fully abstracted Stellar flows |
| Settlement profile | Fast, deterministic-style finality | Faster ecosystem depth, but more consumer friction for non-crypto users |
| Agent onboarding | Strong story with sponsored accounts and smart accounts | Better generic tooling, weaker purpose-built Stellar agent onboarding primitives |

### Conclusion
Polygon is still ahead on existing prediction-market infrastructure because Polymarket already proved the stack there. But for **agent-first onboarding, USDC-native UX, low fees, and sponsored account patterns**, Stellar is the better chain for Amazones if the execution layer is designed around Stellar's current strengths rather than copied directly from Polymarket.

## Recommendation for Amazones
- Build contracts and settlement on Soroban.
- Use Stellar USDC as collateral.
- Keep market matching mostly off-chain for the MVP, with on-chain settlement and payout.
- Design storage carefully so durable state stays small and short-lived state expires safely.
- Build everything `testnet-first`, using Friendbot/Quickstart for funded test accounts and sponsored account flows for agents.

## References
- https://developers.stellar.org/llms.txt
- https://developers.stellar.org/docs/build/smart-contracts/overview
- https://developers.stellar.org/docs/build/guides/storage
- https://developers.stellar.org/docs/tokens/anatomy-of-an-asset
- https://developers.stellar.org/docs/networks/resource-limits-fees
- https://developers.stellar.org/docs/tools/quickstart/faucet
- https://stellar.org/learn/stellar-consensus-protocol
