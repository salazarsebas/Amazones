# Repository-Local Skills

This repository keeps a local record of the external skills and skill-like workflows referenced by Amazones so the build does not depend only on a Codex workstation configuration.

## Policy
- The repo is the source of truth for which skills/workflows Amazones expects.
- Local Codex installation is optional convenience, not the only place where this information lives.
- If an upstream skill changes, this folder should be updated alongside the architecture docs.

## Required skills and references
| Skill / workflow | Source | Status |
|---|---|---|
| Stellar development | `stellar/stellar-dev-skill` | Required reference |
| OpenZeppelin Stellar setup | `OpenZeppelin/openzeppelin-skills` | Required reference |
| x402 payments | `ASGCompute/x402-payments-skill` | Required reference |
| Stellar MPP payments | `ASGCompute/stellar-mpp-payments-skill` | Required reference |
| Trustless Work | `docs.trustlesswork.com/trustless-work/ai/skill` | Research reference only |

## Usage in this repo
- The architecture and research docs assume these skills as implementation guidance.
- The actual application code must not depend on a skill being installed locally.
- Before implementation starts, copy or vendor any upstream skill content that becomes operationally necessary into versioned repo docs or scripts.

## Reproducible setup
- Source inventory: [sources.md](./sources.md)
- Install script: [install-skills.sh](../scripts/install-skills.sh)
- Vendor script: [vendor-external-deps.sh](../scripts/vendor-external-deps.sh)
- MCP servers documented alongside the skill sources so the development environment can be rebuilt consistently.

## Repository-local snapshots
- Vendored skill snapshots live in `skills/vendor/`
- Vendored MCP snapshots live in `mcp/vendor/`
- The repo-local copies are the project source of truth; global installs are only a staging source for refreshes

## Remaining hardening step
- Freeze chosen commit SHAs in [sources.md](./sources.md) before implementation depends on upstream behavior.

## Upstream references
- https://github.com/stellar/stellar-dev-skill
- https://github.com/OpenZeppelin/openzeppelin-skills
- https://github.com/ASGCompute/x402-payments-skill
- https://github.com/ASGCompute/stellar-mpp-payments-skill
- https://docs.trustlesswork.com/trustless-work/ai/skill
