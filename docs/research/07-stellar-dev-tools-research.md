# Stellar Developer Tools Research

## Scope
This document evaluates the Stellar developer tooling relevant to Amazones, with special attention to agent onboarding and testnet-first development.

## Resource: Scaffold Stellar
### Description
Scaffold Stellar is a starter framework for Stellar/Soroban app development.

### How it works
- Provides a batteries-included project scaffold with frontend and contract development workflows.

### Pros for Amazones
- Fastest path to a working prototype.
- Good fit for a testnet-first build with wallet integration.

### Cons for Amazones
- May introduce starter conventions that Amazones outgrows quickly.
- For a custom exchange-style product, a lighter custom workspace may stay cleaner.

### Verdict
**Use partially.** Good reference and possibly a quick bootstrap, but do not force the whole architecture around it.

## Resource: Stellar Wallets Kit
### Description
A frontend wallet integration toolkit for Stellar.

### How it works
- Provides wallet connectors, theming, and wallet interaction helpers.

### Pros for Amazones
- Strong fit for human wallet connection in the web app.
- Much easier than hand-rolling wallet integrations.

### Cons for Amazones
- Human-wallet-oriented; agent wallet flows still need a separate story.

### Verdict
**Use.** This should be the primary human wallet integration layer.

## Resource: Smart Account Kit
### Description
A toolkit for passkey-based smart wallets and account abstraction patterns on Stellar.

### How it works
- Helps applications create and manage passkey-backed smart account flows.

### Pros for Amazones
- Excellent fit for frictionless user onboarding.
- Strong fit for agent accounts with controlled permissions.

### Cons for Amazones
- Account abstraction increases implementation complexity.
- Needs careful alignment with OpenZeppelin and relayer choices.

### Verdict
**Use partially.** Prioritize for onboarding design, but ship the simplest stable subset first.

## Resource: Stellar MCP Server
### Description
An MCP server that lets coding agents inspect and interact with Stellar more directly during development.

### How it works
- Exposes Stellar operations as machine-usable tools for development workflows.

### Pros for Amazones
- Strong fit for agent-assisted development and debugging.
- Especially useful for repeatable testnet workflows.

### Cons for Amazones
- Development tooling only, not product runtime.

### Verdict
**Use.** Recommended for implementation phase.

## Resource: XDR MCP
### Description
A focused MCP tool for decoding and debugging Stellar XDR payloads.

### How it works
- Helps developers inspect built transactions, auth entries, and failures.

### Pros for Amazones
- High leverage for Soroban debugging, sponsored flows, and x402 payload inspection.

### Cons for Amazones
- Narrow tool, not a broad dev environment.

### Verdict
**Use.** Strongly recommended for transaction debugging.

## Resource: Stellar Dev Skill
### Description
An AI development skill for Stellar/Soroban implementation patterns.

### How it works
- Provides implementation guidance, common pitfalls, and stack defaults.

### Pros for Amazones
- Helps keep the build aligned with current Stellar patterns.
- Useful during implementation, review, and deployment setup.

### Cons for Amazones
- Advisory only.

### Verdict
**Use.**

## Resource: Stellar Sponsored Agent Account
### Description
A reference service that creates USDC-ready Stellar accounts for agents in two API calls by sponsoring the reserve and trustline cost.

### How it works
- Agent generates its own keypair locally.
- Service builds a sponsored account-creation transaction.
- Agent signs.
- Service co-signs and submits.

### Pros for Amazones
- Critical for zero-friction agent onboarding.
- Solves the chicken-and-egg problem of needing XLM before an agent can hold USDC.
- Cleanly aligned with the project's `agent-first` requirement.

### Cons for Amazones
- Requires Amazones or a partner service to cover sponsor reserves.
- Needs rate limiting and abuse controls.

### Verdict
**Use.** This is essential for the MVP onboarding strategy.

## Resource: Stellar Observatory
### Description
An x402 reference app in the Stellar ecosystem, useful as an architectural example for paid APIs and agent tooling.

### How it works
- Demonstrates x402-based access patterns with Stellar-oriented tooling and agent compatibility.

### Pros for Amazones
- Good implementation reference for paid market-data endpoints.
- Helpful example for combining API products with agent interfaces.

### Cons for Amazones
- Reference only; not a plug-in market module.

### Verdict
**Use partially.** Use as a reference implementation.

## Testnet-first notes
- Use Friendbot or Quickstart faucet flows for funded test accounts.
- Build all contracts and relayer logic against testnet first.
- Sponsored agent onboarding should also be rehearsed on testnet before any mainnet funding decision.

## Final recommendation
For the MVP toolchain:
- Frontend wallet UX: **Stellar Wallets Kit**
- Passkey/smart onboarding: **Smart Account Kit**
- Agent onboarding: **Stellar Sponsored Agent Account**
- Local and testnet dev: **Scaffold Stellar** as reference, not strict dependency
- Agent-assisted development: **Stellar MCP Server**, **XDR MCP**, **Stellar Dev Skill**
- x402 API reference: **Stellar Observatory**

## References
- https://scaffoldstellar.org
- https://stellarwalletskit.dev/
- https://github.com/kalepail/smart-account-kit
- https://github.com/kalepail/stellar-mcp-server
- https://github.com/stellar-experimental/mcp-stellar-xdr
- https://github.com/stellar/stellar-dev-skill
- https://github.com/oceans404/stellar-sponsored-agent-account
- https://github.com/elliotfriend/stellar-observatory
- https://developers.stellar.org/docs/tools/quickstart/faucet
