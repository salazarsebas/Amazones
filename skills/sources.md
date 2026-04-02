# Skill and MCP Sources

## Purpose
This file pins the external skill and MCP sources that Amazones expects during implementation. The URLs below match the local installs created through [`scripts/install-skills.sh`](../scripts/install-skills.sh), and the commit SHAs record the exact versions installed on 2026-04-01.

## Skills
| Name | Source | Branch / tag | Commit SHA | Purpose |
|---|---|---|---|---|
| Stellar development | `https://github.com/stellar/stellar-dev-skill.git` | `main` | `6c849e9feddae048a9a73f013fcf9d6020d15ed4` | Soroban and Stellar implementation guidance |
| OpenZeppelin Stellar skills | `https://github.com/OpenZeppelin/openzeppelin-skills.git` | `main` | `0ba03a1dae8aee52d6d945d060eceaa74f7eee24` | Secure Stellar contract and relayer patterns |
| x402 payments | `https://github.com/ASGCompute/x402-payments-skill.git` | `main` | `8d6477878cd75a33acd01b8b9b03afe29b345f1e` | x402 implementation workflow |
| Stellar MPP payments | `https://github.com/ASGCompute/stellar-mpp-payments-skill.git` | `main` | `582b88d507eb93df4ab81cf8c3eea6e89eac3293` | MPP integration workflow |
| Trustless Work skill docs | `https://docs.trustlesswork.com/trustless-work/ai/skill` | `live docs` | `docs-only` | Research reference only |

## MCP servers
| Name | Source | Branch / tag | Commit SHA | Purpose |
|---|---|---|---|---|
| Stellar MCP Server | `https://github.com/kalepail/stellar-mcp-server.git` | `main` | `f9cadcdc1ee1aa46404ed6920822c61b505bfacd` | Network interaction during development |
| x402 MCP Stellar | `https://github.com/jamesbachini/x402-mcp-stellar.git` | `main` | `626c23160cf7ededf884c1940ca03c0a69207576` | x402 payment flow testing |
| XDR MCP | `https://github.com/stellar-experimental/mcp-stellar-xdr.git` | `main` | `c866653e607dec3747fe91b89bd99d7a01ae2c3c` | XDR decoding and Soroban debugging |

## Versioning rule
- If any upstream source changes, either update the pinned SHA here intentionally or vendor a snapshot into the repo.
- CI or local setup should only rely on versions recorded in this file.
- Docs-only references such as Trustless Work do not need local installation unless the MVP scope changes.

## Repository-local snapshot rule
- Refresh repo-local snapshots with [`scripts/vendor-external-deps.sh`](../scripts/vendor-external-deps.sh)
- Commit the contents of `skills/vendor/` and `mcp/vendor/` together with any SHA change in this file
