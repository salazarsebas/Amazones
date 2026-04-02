# Trustless Work Research

## Scope
This document evaluates Trustless Work as a possible escrow or payment layer for Amazones.

## Resource: Trustless Work
### Description
Trustless Work is an escrow platform using USDC on Stellar to coordinate work agreements and payment release between parties.

### How it works
- Funds are placed into an escrow agreement.
- Release depends on predefined workflow, delivery, and dispute logic.
- It is optimized for job/payment coordination, not exchange-style market settlement.

### Pros for Amazones
- Strong proof that USDC escrow on Stellar is practical.
- Useful conceptual reference for bonded workflows, milestone release, and disputes.
- Potentially relevant for service-layer payments around agents, analysts, or resolution reviewers.

### Cons for Amazones
- Its escrow model is not a direct match for continuous market collateral and instant trade settlement.
- Injecting a third escrow abstraction into the core market loop would likely increase complexity rather than remove it.
- Buying shares and posting collateral are protocol-native actions; they should stay inside Amazones contracts.

### Verdict
**Discard for core MVP market flows.**

## Resource: Trustless Work skill
### Description
Trustless Work publishes an AI-focused skill describing how agents can use its system.

### How it works
- The skill documents agent-facing usage of the platform and APIs.

### Pros for Amazones
- Useful reference for agent-readable service design and skill-based integration.
- Good inspiration for how Amazones should expose agent-facing docs and workflows.

### Cons for Amazones
- It does not change the mismatch between marketplace escrow and prediction-market collateral.

### Verdict
**Use partially as design inspiration, not as a direct dependency.**

## Can Trustless Work hold market collateral?
### Creating a market
Not a good fit. Market creation collateral needs to be managed directly by the Amazones protocol contract so it can enforce resolution, refunds, invalid outcomes, and payout logic natively.

### Buying shares
Not a good fit. Share purchases need atomic interaction with the market settlement layer. An external escrow would complicate rather than simplify this.

## Where Trustless Work could still matter later
- Paying third-party market verifiers
- Bounties for research or market curation
- Hiring external resolution reviewers
- Off-protocol service marketplaces for agent operators

## Final recommendation
Do **not** integrate Trustless Work into the MVP trading or collateral path. Keep collateral, fees, and redemption inside Soroban contracts owned by Amazones. Use Trustless Work only as:
- a UX reference for agent-readable workflows
- a potential later tool for non-core service payments

## References
- https://docs.trustlesswork.com/trustless-work
- https://docs.trustlesswork.com/trustless-work/technology-overview/usdc-the-stablecoin-powering-trustless-work
- https://docs.trustlesswork.com/trustless-work/ai/skill
