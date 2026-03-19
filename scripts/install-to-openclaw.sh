#!/usr/bin/env bash
# Install Samantha agent + skills to local OpenClaw.
# Run from subagent-harness root. Set OPENCLAW_SKILLS_DST to override.
set -e

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OPENCLAW_DST="${OPENCLAW_SKILLS_DST:-$ROOT/../openclaw/skills}"

cd "$ROOT"
pnpm build
node dist/cli.js --apply

# Copy composed skills to OpenClaw (skills are in .cursor/skills after compose)
if [[ -d "$ROOT/.cursor/skills/samantha" ]]; then
  mkdir -p "$OPENCLAW_DST"
  cp -r "$ROOT/.cursor/skills/samantha" "$OPENCLAW_DST/"
  echo "Installed samantha to $OPENCLAW_DST/samantha"
else
  echo "No samantha skill found. Run: pnpm compose --apply"
  exit 1
fi
