# x402 and MPP Research

## Scope
This document evaluates the two payment protocols most relevant to Amazones as an agent-first product: x402 on Stellar and MPP.

## Resource: x402 on Stellar
### Description
x402 is an HTTP payment protocol built around `402 Payment Required`. On Stellar, it enables API monetization using USDC and Soroban transactions, typically mediated by a facilitator.

### How it works
- Client requests a paid endpoint.
- Server returns `402 Payment Required` with accepted payment terms.
- Client prepares and signs the required Stellar payment payload.
- A facilitator verifies and settles the payment on Stellar.
- Server returns the protected resource.

### Pros for Amazones
- Ideal for monetizing premium API endpoints used by external agents.
- HTTP-native and easy to wrap around existing REST endpoints.
- Strong alignment with the Stellar ecosystem, official docs, SDK, and OpenZeppelin facilitator plugin.
- Good fit for pay-per-call access to structured market data.

### Cons for Amazones
- It is request-based, so very high-frequency flows can become chatty.
- Per-request payment is not the right primitive for continuous quoting or internal market-making loops.

### Verdict
**Use.** x402 should be the default monetization protocol for paid data and agent-access APIs.

## x402 resources reviewed
- Official docs: `developers.stellar.org/docs/build/apps/x402`
- Quickstart: `developers.stellar.org/docs/build/apps/x402/quickstart-guide`
- Official implementation: `stellar/x402-stellar`
- SDK: `@x402/stellar`
- Facilitator: `OpenZeppelin/relayer-plugin-x402-facilitator`
- Demo reference: `xlm402.com`
- MCP reference: `jamesbachini/x402-mcp-stellar`
- OpenZeppelin relayer stack as supporting infra

## Resource: MPP (Machine Payments Protocol)
### Description
MPP is designed for machine-to-machine payment flows, including high-frequency off-chain commitments via channels.

### How it works
- In simple charge mode, parties exchange payment requests and settle machine payments programmatically.
- In channel mode, a funder opens a one-way payment channel on-chain.
- Subsequent micro-payments are signed off-chain as cumulative commitments.
- Recipient settles on-chain only when needed.

### Pros for Amazones
- Better fit than x402 for repeated micro-payments in high-frequency loops.
- Very attractive for market-making agents buying streams, compute, or execution rights repeatedly.
- Reduces on-chain overhead for repeated interactions between known counterparties.

### Cons for Amazones
- More operationally complex than x402.
- Less intuitive for simple public API monetization.
- Experimental status means more implementation risk for the MVP.

### Verdict
**Use partially later.** Do not make MPP a hard dependency for MVP trading, but design APIs so it can power advanced agent flows later.

## MPP resources reviewed
- `stellar/stellar-mpp-sdk`
- Stripe MPP docs and `stripe-samples/machine-payments`
- `ASGCompute/stellar-mpp-payments-skill`

## x402 vs MPP in Amazones
| Use case | x402 | MPP |
|---|---|---|
| Public premium REST endpoints | Best fit | Overkill |
| Buying historical market datasets | Best fit | Possible but unnecessary |
| Pay-per-query semantic market search | Best fit | Overkill |
| Continuous market-making telemetry | Weak | Better fit |
| Agent-to-agent recurring service payments | Acceptable | Better fit |
| Internal high-frequency execution loops | Weak | Best fit |

## Where x402 should be used in Amazones
- `/v1/markets/{id}/depth`
- `/v1/markets/{id}/ticks`
- `/v1/markets/{id}/semantic`
- `/v1/agents/{id}/performance`
- `/v1/data/latam-election-pack`
- `/v1/ws/replay` or archive export endpoints

### x402 product logic
- Free tier: delayed or sampled data
- Paid via x402: real-time depth, bulk exports, semantic enrichment, agent analytics, and private-market access metadata

## Where MPP should be used in Amazones
- Dedicated market-making service agreements
- Agent subscriptions to low-latency event streams
- Per-fill or per-quote infrastructure charging between Amazones and third-party agent operators
- Internal settlement for bot infrastructure vendors or strategy marketplaces

## MVP recommendation
- **MVP:** x402 for external paid APIs, no mandatory MPP dependency
- **Phase 1.5:** evaluate MPP channel-based flows for approved market makers
- **Phase 2:** expose MPP for institutional or pro-agent integrations that need repeated low-friction micro-payments

## Final recommendation
- x402 is the right protocol for **paid data access**.
- MPP is the right protocol for **repeated machine-to-machine service relationships**.
- Amazones should ship x402 in the MVP and keep MPP as a reserved capability for advanced agent market-making and infra monetization.

## References
- https://developers.stellar.org/docs/build/apps/x402
- https://developers.stellar.org/docs/build/apps/x402/quickstart-guide
- https://github.com/stellar/x402-stellar
- https://github.com/OpenZeppelin/relayer-plugin-x402-facilitator
- https://www.npmjs.com/package/@x402/stellar
- https://xlm402.com
- https://github.com/jamesbachini/x402-mcp-stellar
- https://github.com/stellar/stellar-mpp-sdk
- https://github.com/stripe-samples/machine-payments
- https://docs.stripe.com/machine-payments-protocol
