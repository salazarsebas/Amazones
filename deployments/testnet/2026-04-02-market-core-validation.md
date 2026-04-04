# Amazones Market Core Validation on Stellar Testnet

Date: `2026-04-02`
Network: `Stellar testnet`
Market id: `0000000000000000000000000000000000000000000000000000000000000001`

## Initial Deployment

- Initial `market_core` contract ID: `CBOFXMNICZS7IG4LLZFPNVZSURCITI4J5MBORJIIKGJXDYSOACZXTSN5`
- Stellar Expert: https://stellar.expert/explorer/testnet/contract/CBOFXMNICZS7IG4LLZFPNVZSURCITI4J5MBORJIIKGJXDYSOACZXTSN5
- Stellar Explorer: https://stellar-explorer.acachete.xyz/en/testnet/contract/CBOFXMNICZS7IG4LLZFPNVZSURCITI4J5MBORJIIKGJXDYSOACZXTSN5
- Deploy tx: `1763c1183ff03bba267cdd1b1d163f1c2c24e24d3516dfcfc136d2ccadd3f5f6`
- Deploy tx link: https://stellar.expert/explorer/testnet/tx/1763c1183ff03bba267cdd1b1d163f1c2c24e24d3516dfcfc136d2ccadd3f5f6

## Initial Smoke Result

Validated on-chain:

- `deposit_collateral`
- `get_position`
- `settle_trade`
- `set_final_outcome`
- `redeem`

Transactions:

- Buyer deposit: `ebdb822cf84ec9704e25c41e718c563a09f6390ee38d9e26eee01815d45e1568`
- Seller deposit: `5058adee1341dbd873d5f262e2ce08743c60ac1465a81345e6fec524d7c459c5`
- Settlement: `ccfcb72c4911c9a24a0b2c2f3d880e9c280803f4aecf5b6d778081598dd2892d`
- Outcome set: `d3d7006f6a54f4a5c0f7905a2d1232c86065d380e5a23cc5d88c9907bb115f7e`
- Buyer redeem: `684d89851f4f7f2a6a4491698805fe8b0dc6748f617bbf5eccdf76e3b6bcdf7d`

Issue found:

- `redeem` transferred payout correctly but left `locked_collateral` and share balances unchanged.
- This created an incorrect post-resolution position state even though funds moved as expected.

Observed incorrect buyer state after redeem:

```json
{"available_collateral":"1394","locked_collateral":"600","no_shares":"0","yes_shares":"1000"}
```

## Fix Applied

Code fix:

- `contracts/market_core/src/lib.rs`
- `redeem` now clears:
  - `LockedCollateral(user)`
  - `YesShares(user)`
  - `NoShares(user)`

Local verification:

- `cargo test -p market-core` ✅
- `cargo clippy -p market-core --all-targets -- -D warnings` ✅
- `stellar contract build --package market-core` ✅

## Fixed Deployment

- Fixed `market_core` contract ID: `CDA7X677TP3M2RDFSG73MLQQZMGSZ6T6TP5CN7BYWTMMEP5CYUWUZRTC`
- Stellar Expert: https://stellar.expert/explorer/testnet/contract/CDA7X677TP3M2RDFSG73MLQQZMGSZ6T6TP5CN7BYWTMMEP5CYUWUZRTC
- Stellar Explorer: https://stellar-explorer.acachete.xyz/en/testnet/contract/CDA7X677TP3M2RDFSG73MLQQZMGSZ6T6TP5CN7BYWTMMEP5CYUWUZRTC
- Wasm upload tx: `433745e78cfcc2031866cbde658b3c5821d7bb93b07f3f503e6ec424f146bcce`
- Contract deploy tx: `243fdd574d89b5655826e1074a9d7e9946170ba4d1295a45174e104efd207439`
- Deploy tx link: https://stellar.expert/explorer/testnet/tx/243fdd574d89b5655826e1074a9d7e9946170ba4d1295a45174e104efd207439

## Fixed Smoke Verification

Transactions:

- Buyer deposit: `2acd70eab33235d89f23e995d70b3e8d9b188056bc3a68f76e9e80b840dd7c81`
- Seller deposit: `ceacda2f77e6a46c06e6cca27eb725401f95db3c3a58addae8778f17b1421ee5`
- Settlement: `58c66e8063924762f708cd29cc28dca15dfc7335f19e1dd26b36120d5352be96`
- Outcome set: `f421cc44a9219a38fe0a01364cb5488b7d68ab5a7c6d9ed6ecb33a3875d1b947`
- Buyer redeem: `2672670e8bbca6c503c082e1463bae00779c1b0e82bd8c8fd69061d639fb8560`
- Seller redeem: `f7ec8ffad3f9fd10b39764b252396fa5c421d88a5750da5916b8d4759a36fe96`

There was one transient RPC network error during a read, but the state reads and submitted transactions completed successfully after retry.

Verified buyer state after redeem:

```json
{"available_collateral":"1394","locked_collateral":"0","no_shares":"0","yes_shares":"0"}
```

Verified seller state after redeem:

```json
{"available_collateral":"600","locked_collateral":"0","no_shares":"0","yes_shares":"0"}
```

## Conclusion

- `market_core` is now validated end-to-end on Stellar testnet for:
  - deposit
  - position read
  - trade settlement
  - outcome finalization
  - redemption
- The initial bug was found through on-chain validation, fixed in code, and revalidated against a fresh deployed contract.
- This closes the remaining technical gap for Sprint 1.
