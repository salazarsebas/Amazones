# Repository-Local MCP Servers

This directory stores vendored MCP server snapshots that Amazones references during development.

## Layout
- `mcp/vendor/stellar-mcp-server`
- `mcp/vendor/x402-mcp-stellar`
- `mcp/vendor/mcp-stellar-xdr`

## Rule
The repository snapshot is the project-local source of truth. Global installs under `~/.codex` are allowed as a convenience, but the repo must keep the versions it depends on.

## Refresh workflow
1. Install or update global copies with [install-skills.sh](../scripts/install-skills.sh)
2. Copy snapshots into the repo with [vendor-external-deps.sh](../scripts/vendor-external-deps.sh)
3. Update pinned SHAs in [sources.md](../skills/sources.md) if the source version changed
