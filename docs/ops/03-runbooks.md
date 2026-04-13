# Amazones Runbooks

## Deploy
1. Confirm `cargo test`, `bun test`, and both builds pass.
2. If contracts changed, deploy them first and update `MARKET_CORE_CONTRACT_IDS_JSON`.
3. For staging or production-like testnet, confirm `PERSISTENCE_MODE=postgres` and validate `DATABASE_URL`.
4. Restart API with the target environment config.
5. Verify `/readyz`, `/metrics`, websocket subscription, and one premium endpoint `402 -> paid -> 200` flow.

## Rollback
1. Stop the candidate API release.
2. Restore the previous known-good build artifact.
3. Keep the durable persistence backend intact unless corruption is confirmed.
4. Recheck `/readyz`.
5. Re-run one order submission and one premium endpoint smoke test.

## Settlement Failure
1. Inspect request logs for the failing `trace_id`.
2. Check `SETTLEMENT_MODE`, `STELLAR_SOURCE_ACCOUNT`, and `MARKET_CORE_CONTRACT_IDS_JSON`.
3. If `stellar-cli` was unavailable, switch to the previous working runtime or repair CLI/config.
4. Re-submit only idempotent retries after verifying the settlement id has not already been consumed on-chain.

## Resolution Incident
1. Query `/v1/audit?entity_type=proposal&limit=100` and inspect recent proposals.
2. Check whether the proposal is still inside its challenge window.
3. If the worker is stalled, run the worker once manually in a controlled environment and verify the audit trace.
4. Record the final market state and outcome evidence in the incident log.

## Premium API Incident
1. Confirm whether failures are expected `402` responses or actual server errors.
2. Validate `X402_HMAC_SECRET`, `X402_MODE`, and request path consistency.
3. Reproduce with one premium endpoint using the documented external flow.
4. If token verification is compromised, rotate the HMAC secret and invalidate older tokens operationally.
