#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CONFIG_DIR="${AMAZONES_STELLAR_CONFIG_DIR:-$ROOT_DIR/deployments/testnet/.config/stellar}"
NETWORK_NAME="${AMAZONES_STELLAR_NETWORK:-testnet}"
DEPLOYER_IDENTITY="${AMAZONES_DEPLOYER_IDENTITY:-amazones-deployer}"
ADMIN_IDENTITY="${AMAZONES_ADMIN_IDENTITY:-$DEPLOYER_IDENTITY}"
CHALLENGE_PERIOD="${AMAZONES_CHALLENGE_PERIOD:-172800}"
ARTIFACT_DIR="${AMAZONES_WASM_OUT_DIR:-$ROOT_DIR/artifacts/wasm}"
DEPLOYMENTS_DIR="$ROOT_DIR/deployments/testnet"
OUTPUT_ENV="$DEPLOYMENTS_DIR/contracts.env"
ALIAS_PREFIX="${AMAZONES_ALIAS_PREFIX:-amazones}"

mkdir -p "$DEPLOYMENTS_DIR"

"$ROOT_DIR/scripts/build-contracts.sh"

ADMIN_ADDRESS="$(stellar keys public-key "$ADMIN_IDENTITY" --config-dir "$CONFIG_DIR")"

echo "Deploying market_factory"
MARKET_FACTORY_ID="$(
  stellar contract deploy \
    --config-dir "$CONFIG_DIR" \
    --network "$NETWORK_NAME" \
    --source "$DEPLOYER_IDENTITY" \
    --alias "${ALIAS_PREFIX}-market-factory" \
    --wasm "$ARTIFACT_DIR/market_factory.wasm" \
    -- \
    --admin "$ADMIN_ADDRESS"
)"

echo "Deploying resolution"
RESOLUTION_ID="$(
  stellar contract deploy \
    --config-dir "$CONFIG_DIR" \
    --network "$NETWORK_NAME" \
    --source "$DEPLOYER_IDENTITY" \
    --alias "${ALIAS_PREFIX}-resolution" \
    --wasm "$ARTIFACT_DIR/resolution.wasm" \
    -- \
    --admin "$ADMIN_ADDRESS" \
    --challenge-period "$CHALLENGE_PERIOD"
)"

echo "Deploying agent_registry"
AGENT_REGISTRY_ID="$(
  stellar contract deploy \
    --config-dir "$CONFIG_DIR" \
    --network "$NETWORK_NAME" \
    --source "$DEPLOYER_IDENTITY" \
    --alias "${ALIAS_PREFIX}-agent-registry" \
    --wasm "$ARTIFACT_DIR/agent_registry.wasm" \
    -- \
    --admin "$ADMIN_ADDRESS"
)"

cat >"$OUTPUT_ENV" <<EOF
AMAZONES_STELLAR_CONFIG_DIR=$CONFIG_DIR
AMAZONES_STELLAR_NETWORK=$NETWORK_NAME
AMAZONES_DEPLOYER_IDENTITY=$DEPLOYER_IDENTITY
AMAZONES_ADMIN_IDENTITY=$ADMIN_IDENTITY
AMAZONES_CHALLENGE_PERIOD=$CHALLENGE_PERIOD
AMAZONES_MARKET_FACTORY_ID=$MARKET_FACTORY_ID
AMAZONES_RESOLUTION_ID=$RESOLUTION_ID
AMAZONES_AGENT_REGISTRY_ID=$AGENT_REGISTRY_ID
EOF

echo "Deployment complete"
echo "Saved contract ids to $OUTPUT_ENV"
