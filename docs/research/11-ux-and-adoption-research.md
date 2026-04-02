# UX and Adoption Research

## Scope
This document studies what makes prediction markets accessible to mainstream users and how Amazones can reduce the main friction points.

## Main frictions in Polymarket
### Observation
Polymarket's current onboarding still requires users to understand wallets, USDC, and cross-chain deposit details.

### Evidence
- Polymarket documents wallet/deposit flows explicitly.
- Deposits may require selecting the correct network or bridging into Polygon collateral.

### Why this matters
Every extra wallet/network step removes non-crypto users before they ever see market value.

### Verdict
**Amazones should explicitly solve this.**

## How Stellar improves onboarding
### Resource: passkeys and smart accounts
Passkey-based smart accounts can hide key management from the user.

### Resource: sponsored agent accounts
Sponsored account creation removes the need for an initial XLM balance.

### Combined effect
- Humans can get a wallet-like account without traditional seed phrase pain.
- Agents can get a USDC-ready identity without first acquiring XLM.

### Verdict
**Use.** This is one of the strongest strategic reasons to build Amazones on Stellar.

## Intuitive prediction-market UI patterns
### Polymarket benchmark
- Very clear YES/NO framing
- probability-like pricing
- familiar market cards

### Kalshi benchmark
- Contract wording is often clearer
- settlement rules and market mechanics are more explicit
- contract payoff at `$1` is easy to understand

### Recommendation for Amazones
- Use clear binary cards with `Yes` and `No`
- Display both price and implied probability
- Show payout example before trade confirmation
- Keep market rules one click away, not buried

## Probability presentation
Recommended display:
- `Yes 62%`
- secondary line: `Costs $0.62, pays $1.00 if true`

This is easier for mainstream users than showing only price or only token quantities.

## LatAm adoption opportunities
### Inference from existing market demand and regional context
The best initial categories for Latin American adoption are likely:
- elections and public policy
- football
- crypto
- inflation, FX, and regional macro

### Why
- They are already legible to mainstream users.
- They generate repeat participation.
- They create a clear reason for an agent assistant to exist.

### Note
This is an inference from benchmark market categories and regional consumer familiarity, not a direct Stellar-specific dataset.

## Onboarding recommendation
### Human flow
- Sign in with passkey
- auto-create wallet/account
- show funded or fundable USDC balance
- first market tutorial with one small trade

### Agent flow
- create agent
- generate or sponsor account
- connect API key
- assign budget and strategy template

## Final recommendation
To maximize adoption, Amazones should treat onboarding as a product feature, not a wallet prerequisite. The MVP should hide chain choice, abstract gas, frame prices as probabilities, and start with highly legible market categories for Latin American users.

## References
- https://docs.polymarket.com/polymarket-learn/get-started/how-to-deposit
- https://docs.polymarket.com/polymarket-learn/deposits/large-cross-chain-deposits
- https://help.kalshi.com/kalshi-101/what-are-prediction-markets
- https://help.kalshi.com/markets/popular-markets/weather-markets
- https://github.com/kalepail/smart-account-kit
- https://github.com/oceans404/stellar-sponsored-agent-account
