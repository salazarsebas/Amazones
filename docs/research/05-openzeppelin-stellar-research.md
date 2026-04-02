# OpenZeppelin Stellar Research

## Scope
This document evaluates the OpenZeppelin stack for Stellar and identifies which parts are essential for the Amazones MVP.

## Resource: OpenZeppelin Relayer
### Description
OpenZeppelin Relayer is a transaction-relay infrastructure layer that supports non-EVM networks including Stellar.

### How it works
- A service receives a signed or partially signed user request.
- The relayer assembles, sponsors, and submits the final transaction.
- Policy controls can govern which actions are allowed and who pays fees.

### Pros for Amazones
- Strong fit for gasless or gas-abstracted UX.
- Useful for human onboarding and especially agent onboarding where holding XLM should not be mandatory.
- Helpful for x402 facilitator flows and approved backend-triggered settlement patterns.

### Cons for Amazones
- Adds an operational dependency and trust surface.
- Needs careful policy design so the relayer cannot be abused.

### Verdict
**Use.** Relayer-backed fee abstraction is important for MVP UX.

## Resource: OpenZeppelin Relayer SDK
### Description
The SDK provides application-side integration with the relayer service.

### How it works
- Backend services call the relayer through the SDK instead of hand-rolling submission logic.
- Policies, auth, and relay requests are standardized.

### Pros for Amazones
- Reduces custom relay glue.
- Makes gas sponsorship and server-side submission flows easier to reason about.

### Cons for Amazones
- Another SDK dependency in a still-young Stellar stack.

### Verdict
**Use partially.** Use if the backend adopts OpenZeppelin Relayer for sponsored execution.

## Resource: Smart Account Contracts
### Description
OpenZeppelin provides Stellar smart account patterns that support programmable account behavior.

### How it works
- Account contracts define their own authorization logic.
- This can enable passkeys, delegated permissions, spending rules, and agent-specific controls.

### Pros for Amazones
- Very strong fit for agent wallets with bounded permissions.
- Supports future policy features like strategy scopes, daily spend caps, or trusted executors.
- Improves onboarding versus raw key management.

### Cons for Amazones
- More moving parts than a plain Stellar account.
- May be too much complexity for the earliest MVP if paired with another smart account framework already chosen.

### Verdict
**Use partially.** Keep smart accounts in scope for agent onboarding, but do not block MVP launch on deep account abstraction.

## Resource: Contracts Wizard for Stellar
### Description
The Wizard generates OpenZeppelin-based contract scaffolding and patterns for Soroban.

### How it works
- Developers choose a standard pattern.
- The Wizard generates audited library-based scaffolding.

### Pros for Amazones
- Speeds up safe scaffolding for access control, pause, token, and account patterns.
- Keeps contract design closer to audited library usage.

### Cons for Amazones
- Prediction-market-specific contracts still require substantial custom logic.

### Verdict
**Use partially.** Good for scaffolding and reference, not sufficient by itself.

## Resource: Soroban Security Detectors
### Description
OpenZeppelin provides Soroban-focused security tooling and audits for Stellar contracts.

### How it works
- Static and review-oriented tooling helps identify common Soroban risks.
- The broader OpenZeppelin Stellar contracts effort is audited and publishes findings.

### Pros for Amazones
- High leverage for a protocol handling collateral and market payouts.
- Important because Soroban has its own pitfalls around storage TTL, auth, and token/account interactions.

### Cons for Amazones
- Tooling coverage is still evolving.

### Verdict
**Use.** Mandatory in the contract review pipeline.

## Resource: OpenZeppelin skills for Claude Code
### Description
OpenZeppelin ships Codex/Claude-oriented skills for Stellar setup and secure contract work.

### How it works
- The skill provides setup guidance, dependency patterns, and library usage conventions.

### Pros for Amazones
- Useful for keeping generated project guidance aligned with audited libraries.
- Reduces drift when bootstrapping Soroban contracts.

### Cons for Amazones
- A skill is only advisory; it does not replace code review or audits.

### Verdict
**Use.** Helpful during implementation, not a runtime dependency.

## What is essential for the MVP
- OpenZeppelin Relayer
- Security detectors / audit workflow
- Library-based contract components where applicable

## What is useful but not MVP-blocking
- Smart account contracts
- Contracts Wizard
- Relayer SDK abstractions if simpler than direct integration

## Final recommendation
For the MVP, OpenZeppelin should provide the **security and relay foundation**, not the entire business logic. Amazones should rely on OZ for:
- fee abstraction / gasless flows
- secure access-control and pause patterns
- audit-oriented development discipline

The core market engine still needs custom Soroban contracts.

## References
- https://docs.openzeppelin.com/relayer/1.4.x
- https://github.com/OpenZeppelin/openzeppelin-relayer-sdk
- https://docs.openzeppelin.com/stellar-contracts/accounts/smart-account
- https://docs.openzeppelin.com/stellar-contracts
- https://github.com/OpenZeppelin/openzeppelin-skills
- https://www.openzeppelin.com/news/stellar-contracts-library-0.1.0-audit
