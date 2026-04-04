#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OUT_DIR="${AMAZONES_WASM_OUT_DIR:-$ROOT_DIR/artifacts/wasm}"

mkdir -p "$OUT_DIR"

echo "Building Soroban contracts into $OUT_DIR"
stellar contract build \
  --manifest-path "$ROOT_DIR/Cargo.toml" \
  --out-dir "$OUT_DIR"

echo "WASM artifacts available in $OUT_DIR"
