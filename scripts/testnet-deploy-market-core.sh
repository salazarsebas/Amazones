#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CONFIG_DIR="${AMAZONES_STELLAR_CONFIG_DIR:-$ROOT_DIR/deployments/testnet/.config/stellar}"
NETWORK_NAME="${AMAZONES_STELLAR_NETWORK:-testnet}"
DEPLOYER_IDENTITY="${AMAZONES_DEPLOYER_IDENTITY:-amazones-deployer}"
ADMIN_IDENTITY="${AMAZONES_ADMIN_IDENTITY:-$DEPLOYER_IDENTITY}"
ARTIFACT_DIR="${AMAZONES_WASM_OUT_DIR:-$ROOT_DIR/artifacts/wasm}"
ALIAS_PREFIX="${AMAZONES_ALIAS_PREFIX:-amazones}"

if [[ -z "${AMAZONES_MARKET_ID_HEX:-}" ]]; then
  echo "AMAZONES_MARKET_ID_HEX is required" >&2
  exit 1
fi

if [[ -z "${AMAZONES_COLLATERAL_ASSET:-}" ]]; then
  echo "AMAZONES_COLLATERAL_ASSET is required" >&2
  exit 1
fi

"$ROOT_DIR/scripts/build-contracts.sh"

ADMIN_ADDRESS="$(stellar keys public-key "$ADMIN_IDENTITY" --config-dir "$CONFIG_DIR")"
MARKET_CORE_ALIAS="${AMAZONES_MARKET_CORE_ALIAS:-${ALIAS_PREFIX}-market-core-${AMAZONES_MARKET_ID_HEX:0:8}}"

stellar contract deploy \
  --config-dir "$CONFIG_DIR" \
  --network "$NETWORK_NAME" \
  --source "$DEPLOYER_IDENTITY" \
  --alias "$MARKET_CORE_ALIAS" \
  --wasm "$ARTIFACT_DIR/market_core.wasm" \
  -- \
  --admin "$ADMIN_ADDRESS" \
  --market-id "$AMAZONES_MARKET_ID_HEX" \
  --collateral-asset "$AMAZONES_COLLATERAL_ASSET"
