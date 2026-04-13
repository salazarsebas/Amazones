# Amazones Environments and Deployments

## Objective
Define a repeatable deployment shape for local development, staging, and production-like testnet without relying on ad hoc operator memory.

## Environment Separation

### Local
- Purpose: feature development and route-level debugging
- API config:
  - `PERSISTENCE_MODE=snapshot`
  - `STATE_SNAPSHOT_PATH=var/api-state.snapshot.json`
- Settlement mode: `SETTLEMENT_MODE=immediate` by default
- Premium verification: `X402_MODE=development`
- Wallet funding: optional `STELLAR_FRIENDBOT_URL`

### Staging
- Purpose: integration testing before merge to release branch
- API config:
  - dedicated `JWT_SECRET`
  - dedicated `X402_HMAC_SECRET`
  - dedicated `AGENT_PROVIDER_ENCRYPTION_KEY`
  - `PERSISTENCE_MODE=postgres`
  - dedicated `DATABASE_URL`
- Settlement mode: `stellar-cli`
- Stellar config: repo-local config directory with staging identities
- Market inventory: seeded only with staging-safe markets

### Production-like Testnet
- Purpose: candidate release validation on Stellar testnet
- Same config shape as staging, but with:
  - separate signer identity
  - separate premium pay-to account
  - testnet contract ids recorded under `deployments/testnet/`
  - metrics scraped from `/metrics`

## CI Coverage
- API checks: [api.yml](/Users/sebastiansalazar/Documents/Acachete-Labs/Amazones/.github/workflows/api.yml)
- Web checks: [web.yml](/Users/sebastiansalazar/Documents/Acachete-Labs/Amazones/.github/workflows/web.yml)
- Contracts checks: [contracts.yml](/Users/sebastiansalazar/Documents/Acachete-Labs/Amazones/.github/workflows/contracts.yml)

These workflows provide merge-gate verification for build and test quality. They are not deployment pipelines by themselves.

## Deployment Procedure
1. Run contract, API, and web CI successfully on the candidate branch.
2. Build contracts and deploy/update the testnet contract set if contract changes are included.
3. Set API runtime to `SETTLEMENT_MODE=stellar-cli` with current contract ids.
4. Start API and websocket gateway.
5. Verify `/readyz`, `/healthz`, and `/metrics`.
6. Run the human and agent validation flows from `docs/release/`.
7. Record resulting contract ids, tx hashes, and validation notes under `deployments/testnet/`.

## Rollback Principle
- Backend-only rollback: redeploy the previous API build and preserve the durable store.
- Contract rollback: deploy a new compatible contract artifact and update environment mappings; do not mutate history by hand.
- Frontend rollback: serve the previous known-good build after confirming API compatibility.
