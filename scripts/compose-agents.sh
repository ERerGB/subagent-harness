#!/usr/bin/env bash
# Compatibility wrapper; the TypeScript CLI is the only parser/compiler.
set -euo pipefail
SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
if [[ ! -f "$SCRIPT_DIR/../dist/cli.js" ]]; then
  echo "Build subagent-harness first with pnpm build." >&2
  exit 2
fi
exec node "$SCRIPT_DIR/../dist/cli.js" "$@"
