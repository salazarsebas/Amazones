#!/usr/bin/env bash

set -euo pipefail

CODEX_HOME_DEFAULT="${HOME}/.codex"
CODEX_HOME="${CODEX_HOME:-$CODEX_HOME_DEFAULT}"
SKILLS_DIR="${CODEX_HOME}/skills"
MCP_DIR="${CODEX_HOME}/mcp"

mkdir -p "${SKILLS_DIR}" "${MCP_DIR}"

clone_or_update() {
  local repo_url="$1"
  local branch="$2"
  local dest_dir="$3"

  if [ -d "${dest_dir}/.git" ]; then
    git -C "${dest_dir}" fetch origin "${branch}"
    git -C "${dest_dir}" checkout "${branch}"
    git -C "${dest_dir}" pull --ff-only origin "${branch}"
  else
    git clone --branch "${branch}" --depth 1 "${repo_url}" "${dest_dir}"
  fi
}

echo "Installing repository-backed skills into ${SKILLS_DIR}"
clone_or_update "https://github.com/stellar/stellar-dev-skill.git" "main" "${SKILLS_DIR}/stellar-dev-skill"
clone_or_update "https://github.com/OpenZeppelin/openzeppelin-skills.git" "main" "${SKILLS_DIR}/openzeppelin-skills"
clone_or_update "https://github.com/ASGCompute/x402-payments-skill.git" "main" "${SKILLS_DIR}/x402-payments-skill"
clone_or_update "https://github.com/ASGCompute/stellar-mpp-payments-skill.git" "main" "${SKILLS_DIR}/stellar-mpp-payments-skill"

echo "Installing MCP server repositories into ${MCP_DIR}"
clone_or_update "https://github.com/kalepail/stellar-mcp-server.git" "main" "${MCP_DIR}/stellar-mcp-server"
clone_or_update "https://github.com/jamesbachini/x402-mcp-stellar.git" "main" "${MCP_DIR}/x402-mcp-stellar"
clone_or_update "https://github.com/stellar-experimental/mcp-stellar-xdr.git" "main" "${MCP_DIR}/mcp-stellar-xdr"

cat <<EOF
Install complete.

Next steps:
1. Register the skills you want Codex to use from:
   ${SKILLS_DIR}
2. Configure MCP servers from:
   ${MCP_DIR}
3. Record frozen commit SHAs in:
   skills/sources.md

Trustless Work remains docs-only and is not installed by this script.
EOF
