# Sprint 1 Security and Quality Findings

## Purpose
This document records the security and quality checks executed during Sprint 1 for the Soroban contract foundation, along with the findings that must remain visible as the project moves into later implementation phases.

## Scope of checks executed
The following checks were executed against the initial Soroban workspace and contract set:
- `cargo test`
- `cargo fmt --check`
- `cargo clippy --workspace --all-targets -- -D warnings`
- `stellar contract build`
- `cargo audit`
- `cargo deny check advisories`

## Contracts covered
- `market_factory`
- `market_core`
- `resolution`
- `agent_registry`
- `amazones-shared`

## Result summary

### Passed
- Unit tests passed for the initial contract flows.
- Formatting checks passed.
- Clippy passed with warnings treated as errors.
- `stellar contract build` completed successfully and generated valid WASM artifacts for all contract crates.

### Findings that require tracking
The dependency-level checks did not identify a direct exploitable vulnerability in Amazones-owned code, but they did flag two **unmaintained transitive dependencies** in the current Soroban dependency tree:

1. `derivative`  
   - RustSec ID: `RUSTSEC-2024-0388`
   - Status: unmaintained
   - Source path: transitive dependency through `ark-*` crates used by `soroban-env-host`

2. `paste`  
   - RustSec ID: `RUSTSEC-2024-0436`
   - Status: unmaintained
   - Source path: transitive dependency through `ark-*` and `soroban-wasmi` used by `soroban-env-host`

## Assessment
These findings are currently **supply-chain maintenance risks**, not confirmed exploitable defects in the Amazones contracts.

Why they do not block Sprint 1:
- They are not introduced by project-owned dependencies directly.
- They come from the current Soroban ecosystem stack.
- RustSec does not report a safe replacement upgrade path for the current dependency graph.
- Core contract functionality, tests, clippy, and Soroban builds remain valid.

Why they still matter:
- The project should not silently ignore them.
- They must be re-evaluated whenever Soroban SDK versions are upgraded.
- They should be revisited before any mainnet-grade release or formal audit window.

## Decision for now
Current decision: **accept temporarily and track explicitly**.

This is the correct short-term decision because:
- replacing or forking transitive dependencies inside the Soroban stack would be disproportionate at Sprint 1
- no project-local safe upgrade is currently available
- blocking contract progress on ecosystem-level transitive maintenance issues would stall the MVP without materially improving product safety in the short term

## Required follow-up actions
- Re-run `cargo audit` and `cargo deny check advisories` on every dependency upgrade affecting Soroban crates.
- Track Soroban SDK and `soroban-env-host` release notes for dependency-tree changes.
- Reassess these findings before:
  - public beta
  - external audit engagement
  - any mainnet deployment decision

## Recommended policy
- Test failures, clippy failures, and Soroban build failures are blocking.
- Unmaintained transitive advisories are not automatically blocking for MVP testnet, but they must be documented and reviewed periodically.
- Any future finding that changes from `unmaintained` to a concrete exploitable advisory must be treated as blocking until resolved or explicitly accepted with justification.

## Commands used
```bash
cargo test
cargo fmt --check
cargo clippy --workspace --all-targets -- -D warnings
stellar contract build
cargo audit
cargo deny check advisories
```

## References
- https://rustsec.org/advisories/RUSTSEC-2024-0388
- https://rustsec.org/advisories/RUSTSEC-2024-0436
- [Smart Contracts Design](../architecture/02-smart-contracts-design.md)
- [V1 Backlog](../roadmap/02-v1-backlog.md)
