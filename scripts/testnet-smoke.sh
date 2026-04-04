#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CONFIG_DIR="${AMAZONES_STELLAR_CONFIG_DIR:-$ROOT_DIR/deployments/testnet/.config/stellar}"
NETWORK_NAME="${AMAZONES_STELLAR_NETWORK:-testnet}"
DEPLOYMENTS_ENV="${AMAZONES_DEPLOYMENTS_ENV:-$ROOT_DIR/deployments/testnet/contracts.env}"
CREATOR_IDENTITY="${AMAZONES_CREATOR_IDENTITY:-amazones-creator}"
AGENT_OWNER_IDENTITY="${AMAZONES_AGENT_OWNER_IDENTITY:-amazones-agent-owner}"
AGENT_WALLET_IDENTITY="${AMAZONES_AGENT_WALLET_IDENTITY:-amazones-agent-wallet}"

if [[ ! -f "$DEPLOYMENTS_ENV" ]]; then
  echo "Deployment file not found: $DEPLOYMENTS_ENV" >&2
  exit 1
fi

source "$DEPLOYMENTS_ENV"

ensure_identity() {
  local name="$1"
  if ! stellar keys ls --config-dir "$CONFIG_DIR" | grep -q "^$name$"; then
    stellar keys generate "$name" --config-dir "$CONFIG_DIR" --network "$NETWORK_NAME"
    stellar keys fund "$name" --config-dir "$CONFIG_DIR" --network "$NETWORK_NAME"
  fi
}

ensure_identity "$CREATOR_IDENTITY"
ensure_identity "$AGENT_OWNER_IDENTITY"
ensure_identity "$AGENT_WALLET_IDENTITY"

CREATOR_ADDRESS="$(stellar keys public-key "$CREATOR_IDENTITY" --config-dir "$CONFIG_DIR")"
AGENT_OWNER_ADDRESS="$(stellar keys public-key "$AGENT_OWNER_IDENTITY" --config-dir "$CONFIG_DIR")"
AGENT_WALLET_ADDRESS="$(stellar keys public-key "$AGENT_WALLET_IDENTITY" --config-dir "$CONFIG_DIR")"

if [[ -z "${AMAZONES_COLLATERAL_ASSET:-}" ]]; then
  echo "AMAZONES_COLLATERAL_ASSET must be exported before smoke test" >&2
  exit 1
fi

MARKET_REQUEST="$(cat <<EOF
{"creator":"$CREATOR_ADDRESS","collateral_asset":"$AMAZONES_COLLATERAL_ASSET","question":"Will Amazones ship V1 on Stellar testnet?","category":"product","close_time":2000000000,"resolve_time":2000003600,"resolution_policy_uri":"ipfs://amazones-resolution-policy","resolver_bond":"10000000","challenger_bond":"20000000"}
EOF
)"

echo "Creating market"
stellar contract invoke \
  --config-dir "$CONFIG_DIR" \
  --network "$NETWORK_NAME" \
  --id "$AMAZONES_MARKET_FACTORY_ID" \
  --source "$CREATOR_IDENTITY" \
  -- \
  create_market \
  --request "$MARKET_REQUEST"

echo "Registering agent"
stellar contract invoke \
  --config-dir "$CONFIG_DIR" \
  --network "$NETWORK_NAME" \
  --id "$AMAZONES_AGENT_REGISTRY_ID" \
  --source "$AGENT_OWNER_IDENTITY" \
  -- \
  register_agent \
  --owner "$AGENT_OWNER_ADDRESS" \
  --agent-wallet "$AGENT_WALLET_ADDRESS" \
  --agent-type trader \
  --metadata-uri "ipfs://amazones-agent"

echo "Proposing resolution"
stellar contract invoke \
  --config-dir "$CONFIG_DIR" \
  --network "$NETWORK_NAME" \
  --id "$AMAZONES_RESOLUTION_ID" \
  --source "$CREATOR_IDENTITY" \
  -- \
  propose_resolution \
  --resolver "$CREATOR_ADDRESS" \
  --outcome Yes \
  --evidence-uri "ipfs://amazones-evidence"

echo "Fetching agent"
stellar contract invoke \
  --config-dir "$CONFIG_DIR" \
  --network "$NETWORK_NAME" \
  --id "$AMAZONES_AGENT_REGISTRY_ID" \
  --source "$AGENT_OWNER_IDENTITY" \
  --send=no \
  -- \
  get_agent \
  --agent-wallet "$AGENT_WALLET_ADDRESS"

echo "Fetching resolution state"
stellar contract invoke \
  --config-dir "$CONFIG_DIR" \
  --network "$NETWORK_NAME" \
  --id "$AMAZONES_RESOLUTION_ID" \
  --source "$CREATOR_IDENTITY" \
  --send=no \
  -- \
  get_state
