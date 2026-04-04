#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CONFIG_DIR="${AMAZONES_STELLAR_CONFIG_DIR:-$ROOT_DIR/deployments/testnet/.config/stellar}"
NETWORK_NAME="${AMAZONES_STELLAR_NETWORK:-testnet}"
RPC_URL="${AMAZONES_RPC_URL:-https://soroban-testnet.stellar.org}"
NETWORK_PASSPHRASE="${AMAZONES_NETWORK_PASSPHRASE:-Test SDF Network ; September 2015}"
DEPLOYER_IDENTITY="${AMAZONES_DEPLOYER_IDENTITY:-amazones-deployer}"
ADMIN_IDENTITY="${AMAZONES_ADMIN_IDENTITY:-$DEPLOYER_IDENTITY}"

mkdir -p "$CONFIG_DIR"

if ! stellar network ls --config-dir "$CONFIG_DIR" | grep -q "^$NETWORK_NAME[[:space:]]"; then
  echo "Adding network $NETWORK_NAME to $CONFIG_DIR"
  stellar network add "$NETWORK_NAME" \
    --config-dir "$CONFIG_DIR" \
    --rpc-url "$RPC_URL" \
    --network-passphrase "$NETWORK_PASSPHRASE"
fi

if ! stellar keys ls --config-dir "$CONFIG_DIR" | grep -q "^$DEPLOYER_IDENTITY$"; then
  echo "Generating deployer identity $DEPLOYER_IDENTITY"
  stellar keys generate "$DEPLOYER_IDENTITY" \
    --config-dir "$CONFIG_DIR" \
    --network "$NETWORK_NAME"
fi

if ! stellar keys ls --config-dir "$CONFIG_DIR" | grep -q "^$ADMIN_IDENTITY$"; then
  echo "Generating admin identity $ADMIN_IDENTITY"
  stellar keys generate "$ADMIN_IDENTITY" \
    --config-dir "$CONFIG_DIR" \
    --network "$NETWORK_NAME"
fi

echo "Funding $DEPLOYER_IDENTITY on $NETWORK_NAME"
stellar keys fund "$DEPLOYER_IDENTITY" \
  --config-dir "$CONFIG_DIR" \
  --network "$NETWORK_NAME"

if [[ "$ADMIN_IDENTITY" != "$DEPLOYER_IDENTITY" ]]; then
  echo "Funding $ADMIN_IDENTITY on $NETWORK_NAME"
  stellar keys fund "$ADMIN_IDENTITY" \
    --config-dir "$CONFIG_DIR" \
    --network "$NETWORK_NAME"
fi

echo "Bootstrap complete"
echo "Config dir: $CONFIG_DIR"
echo "Deployer public key: $(stellar keys public-key "$DEPLOYER_IDENTITY" --config-dir "$CONFIG_DIR")"
echo "Admin public key: $(stellar keys public-key "$ADMIN_IDENTITY" --config-dir "$CONFIG_DIR")"
