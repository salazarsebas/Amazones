# Amazones Testnet Deployment

These scripts keep Stellar CLI state repo-local by default through `AMAZONES_STELLAR_CONFIG_DIR=.stellar`.

## Prerequisites

- `stellar` CLI installed locally
- Rust toolchain with the Soroban target
- access to Stellar testnet RPC

## Files

- `scripts/build-contracts.sh`: builds all Soroban contracts and copies wasm artifacts into `artifacts/wasm`
- `scripts/testnet-bootstrap.sh`: adds the testnet network to the repo-local config and creates/funds identities
- `scripts/testnet-deploy-core.sh`: deploys `market_factory`, `resolution`, and `agent_registry`
- `scripts/testnet-deploy-market-core.sh`: deploys one `market_core` instance for a specific market id
- `scripts/testnet-smoke.sh`: runs a basic smoke path across the deployed contracts

## Suggested Flow

1. `cp deployments/testnet/.env.example deployments/testnet/contracts.env.local`
2. `source deployments/testnet/contracts.env.local`
3. `./scripts/testnet-bootstrap.sh`
4. `./scripts/testnet-deploy-core.sh`
5. Export `AMAZONES_COLLATERAL_ASSET` to a valid Stellar asset contract or SAC address before smoke testing.
6. `./scripts/testnet-smoke.sh`

## Notes

- `market_core` is per-market, so it is deployed separately after a market id exists.
- `scripts/testnet-smoke.sh` assumes `stellar contract invoke` accepts the struct payload for `create_market` as a JSON string under `--request`.
- Once contracts are deployed, use `stellar contract invoke --id <contract-id> --source-account <identity> -- --help` to verify the generated argument shape for each function in your local CLI version.

## Latest Verified Deployment

- Core deployment and smoke-test evidence: [2026-04-02-core-deployment.md](/Users/sebastiansalazar/Documents/Acachete-Labs/Amazones/deployments/testnet/2026-04-02-core-deployment.md)
- Market core validation and fix verification: [2026-04-02-market-core-validation.md](/Users/sebastiansalazar/Documents/Acachete-Labs/Amazones/deployments/testnet/2026-04-02-market-core-validation.md)
