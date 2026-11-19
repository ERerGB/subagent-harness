---
name: agents-governor
description: Validate rich agent definitions and inspect deterministic runtime composition with subagent-harness. Use for agent definition, adapter, or discovery changes in a repository that uses this compiler.
---

# Agents Governor

Resolve the consuming repository, installed compiler version and
`subagent.config.json`. Read its source definitions, target configuration and
extension validator; project-specific fields are not universal schema rules.
Use [the reference](reference.md) for validation and evidence boundaries.

From the consumer's cwd, preview with `subagent-compose --dry-run`, or
`node /absolute/subagent-harness/dist/cli.js --dry-run` for a built checkout.
Configuration selects runtime targets; explicit `--src`/`--dst` is the legacy
Cursor path. Preserve actual diagnostics and distinguish errors from optional-field
warnings. Inspect output paths, names and collisions before an authorized `--apply`.
Do not add `--clean` to ordinary verification.

After apply, use the same compiler's `--check` for source/output drift and, for a
configured production target, `--verify` for its compose contract. Neither proves
live model behavior or cross-runtime parity. Report source/target, commands, files,
drift and unverified runtime claims; generated files remain derived artifacts.

When changing this compiler, run its `pnpm typecheck`, `pnpm test` and `pnpm build`.
For a consumer, inspect its actual scripts instead of assuming `agents:*` exists.
