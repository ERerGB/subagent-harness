---
name: agents-governor
description: Validate rich agent definitions and inspect deterministic runtime composition with subagent-harness. Use for agent definition, adapter, or discovery changes in a repository that uses this compiler.
---

# Agents Governor

Resolve the consuming repository and its `subagent.config.json` before choosing
source and target directories. The compiler's schema and the consumer's extension
validator define the contract; a historical project's fields are not global rules.
Read [reference.md](reference.md) for the verification boundaries.

## Validate and compose

1. Read the installed package version, repository scripts, source definitions,
   target configuration, and any consumer extension validator.
2. Use the current compiler to parse and validate definitions. Keep required-field
   errors separate from optional-model/profile warnings.
3. Run a composition preview from the consuming repository. With a built checkout,
   use `node /absolute/subagent-harness/dist/cli.js --dry-run`; with the package
   installed, use `subagent-compose --dry-run`. Both read the current directory's
   `subagent.config.json`. Explicit `--src`/`--dst` is the legacy Cursor path;
   use configuration for other runtimes.
4. Inspect generated names, target paths, collisions and intended scope before an
   authorized `--apply`. Do not invoke `--clean` as part of ordinary verification.
5. After apply, run the same compiler with `--check` to detect source/output drift.
   For a configured production target, `--verify` checks its compose contract;
   it does not run a model or establish behavioral parity.

When changing this compiler repository, use its actual package scripts:
`pnpm typecheck`, `pnpm test`, and `pnpm build`. Consumer repositories may provide
additional audit scripts; inspect them rather than assuming `agents:*` commands
exist. Runtime smoke tests require their own configured runtime and authorization.

## Report

Report the source and target, commands and outcomes, changed files, drift result,
and any runtime behavior left unverified. Composed files remain derived artifacts.
