#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CODEX_HOME_DEFAULT="${HOME}/.codex"
CODEX_HOME="${CODEX_HOME:-$CODEX_HOME_DEFAULT}"

mkdir -p "${ROOT_DIR}/skills/vendor" "${ROOT_DIR}/mcp/vendor"

copy_repo() {
  local src="$1"
  local dest="$2"

  rm -rf "${dest}"
  mkdir -p "${dest}"

  rsync -a \
    --exclude='.git' \
    --exclude='node_modules' \
    --exclude='.DS_Store' \
    "${src}/" "${dest}/"
}

copy_repo "${CODEX_HOME}/skills/stellar-dev-skill" "${ROOT_DIR}/skills/vendor/stellar-dev-skill"
copy_repo "${CODEX_HOME}/skills/openzeppelin-skills" "${ROOT_DIR}/skills/vendor/openzeppelin-skills"
copy_repo "${CODEX_HOME}/skills/x402-payments-skill" "${ROOT_DIR}/skills/vendor/x402-payments-skill"
copy_repo "${CODEX_HOME}/skills/stellar-mpp-payments-skill" "${ROOT_DIR}/skills/vendor/stellar-mpp-payments-skill"

copy_repo "${CODEX_HOME}/mcp/stellar-mcp-server" "${ROOT_DIR}/mcp/vendor/stellar-mcp-server"
copy_repo "${CODEX_HOME}/mcp/x402-mcp-stellar" "${ROOT_DIR}/mcp/vendor/x402-mcp-stellar"
copy_repo "${CODEX_HOME}/mcp/mcp-stellar-xdr" "${ROOT_DIR}/mcp/vendor/mcp-stellar-xdr"

cat <<EOF
Vendored external dependencies into the repository:
- ${ROOT_DIR}/skills/vendor
- ${ROOT_DIR}/mcp/vendor

Excluded:
- .git directories
- node_modules

Review the snapshots before committing if you want to trim unused files further.
EOF
