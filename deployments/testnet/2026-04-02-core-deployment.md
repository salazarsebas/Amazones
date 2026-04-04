# Amazones Core Deployment on Stellar Testnet

Date: `2026-04-02`
Network: `Stellar testnet`
Config mode: repo-local `.stellar`
Deployer identity: `amazones-deployer`
Admin identity: `amazones-deployer`

## Deployed Contracts

### Market Factory

- Contract ID: `CAKLYJBOUTXICUGIFZZOIRKJ2VACSSJWCC3OQXQKYVT63CULNQDQJ3JX`
- Stellar Expert: https://stellar.expert/explorer/testnet/contract/CAKLYJBOUTXICUGIFZZOIRKJ2VACSSJWCC3OQXQKYVT63CULNQDQJ3JX
- Stellar Explorer: https://stellar-explorer.acachete.xyz/en/testnet/contract/CAKLYJBOUTXICUGIFZZOIRKJ2VACSSJWCC3OQXQKYVT63CULNQDQJ3JX
- Deploy tx: `eaf0199a27f9b9b837d44888c4cea04bb6f02c8a937b89bc334d489cb5c11f15`
- Deploy tx link: https://stellar.expert/explorer/testnet/tx/eaf0199a27f9b9b837d44888c4cea04bb6f02c8a937b89bc334d489cb5c11f15

### Resolution

- Contract ID: `CC6O52ZAPCBIHPIOCIPYNEBDRM3DIBDGTDLCGU3MT4HXPRW2IIAN3NHC`
- Stellar Expert: https://stellar.expert/explorer/testnet/contract/CC6O52ZAPCBIHPIOCIPYNEBDRM3DIBDGTDLCGU3MT4HXPRW2IIAN3NHC
- Stellar Explorer: https://stellar-explorer.acachete.xyz/en/testnet/contract/CC6O52ZAPCBIHPIOCIPYNEBDRM3DIBDGTDLCGU3MT4HXPRW2IIAN3NHC
- Deploy tx: `54bc406260edece87f2d4e2b1424ba602efda112e914377618ba72ffaf073b13`
- Deploy tx link: https://stellar.expert/explorer/testnet/tx/54bc406260edece87f2d4e2b1424ba602efda112e914377618ba72ffaf073b13

### Agent Registry

- Contract ID: `CDPPFNZNAUQ673MKHVSZ64MGXFJTHEELGBSLHW342ZXAMIQ7CMEHPCFW`
- Stellar Expert: https://stellar.expert/explorer/testnet/contract/CDPPFNZNAUQ673MKHVSZ64MGXFJTHEELGBSLHW342ZXAMIQ7CMEHPCFW
- Stellar Explorer: https://stellar-explorer.acachete.xyz/en/testnet/contract/CDPPFNZNAUQ673MKHVSZ64MGXFJTHEELGBSLHW342ZXAMIQ7CMEHPCFW
- Deploy tx: `356a47ebbcc7d5db91698a1aea5bd82333eac055166650be1372253fda1ceb01`
- Deploy tx link: https://stellar.expert/explorer/testnet/tx/356a47ebbcc7d5db91698a1aea5bd82333eac055166650be1372253fda1ceb01

## Smoke Test Results

### `create_market`

- Tx: `5ea107f3a9f621c68c03809a8afd5619879f4aa1e749e5ce20e55bd0879bc048`
- Link: https://stellar.expert/explorer/testnet/tx/5ea107f3a9f621c68c03809a8afd5619879f4aa1e749e5ce20e55bd0879bc048
- Result: success
- Event: `MktCreated`
- Created market id: `0000000000000000000000000000000000000000000000000000000000000001`

### `register_agent`

- Tx: `b4a977f40afb502cbbf7aa5cbfc6b68590d6e3b9555df5b9e27583f686515903`
- Link: https://stellar.expert/explorer/testnet/tx/b4a977f40afb502cbbf7aa5cbfc6b68590d6e3b9555df5b9e27583f686515903
- Result: success
- Event: `AgtReg`
- Registered agent wallet: `GBDLDQDHT65Q7V5D7GH3L36QPUU6MVGXKSRMRQX6I3GHOM66ESONDGS6`

### `propose_resolution`

- Tx: `8f725b83e16d0060d195ee4b2acb762284ae0f47ce292f993a8b34f77ade2496`
- Link: https://stellar.expert/explorer/testnet/tx/8f725b83e16d0060d195ee4b2acb762284ae0f47ce292f993a8b34f77ade2496
- Result: success
- Event: `ResProp`
- Outcome proposed: `Yes`
- Challenge deadline: `1775352004`

## Read Verification

### Agent Profile

```json
{"agent_type":"trader","agent_wallet":"GBDLDQDHT65Q7V5D7GH3L36QPUU6MVGXKSRMRQX6I3GHOM66ESONDGS6","metadata_uri":"ipfs://amazones-agent","owner":"GC6IUM5WLHPINTRSDVJTVQKLSIJYKWNCFPMZUTWKCKVTFADT7QPMBY3C","status":"Draft"}
```

### Resolution State

```json
{"challenge_deadline":1775352004,"challenged":false,"evidence_uri":"ipfs://amazones-evidence","outcome":"Yes","proposed_by":"GBW2A4SXFIOKDXB5WF4TLB7252WSRZK3YJGZGUEBQY6VTODNILM4PBZ6"}
```

## Operational Notes

- The contracts were deployed successfully with repo-local Stellar CLI config under `.stellar`.
- The current Stellar CLI warns that local config is deprecated and recommends migration to `~/.config/stellar`.
- This did not block deployment or invocation, but it should be handled in a future tooling cleanup pass.
- `market_core` has not been deployed yet in this batch because it is instantiated per market and needs a concrete collateral asset decision for the next validation pass.
