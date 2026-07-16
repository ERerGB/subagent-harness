# Production JSON Contract

[← Back to the README](../README.md#quality-gates)

For a `runtime: production` target, `subagent-compose` does more than serialize
the parsed source. It verifies that the emitted JSON still carries the meaning
declared by the portable source of truth.

## Fidelity rules

Compose applies these checks during both `--dry-run` and `--apply`:

- `prompt` must be a non-empty string.
- If the source declares a named `model`—directly or through the target's
  `profile`—the JSON `model` must be an object with the same `name`. This catches
  silent `"inherited"` values and wrong-provider fallbacks.
- If `.agent.ext.yaml` declares `contentSchema` as a mapping, its top-level keys
  must match the composed JSON.

Any parse failure, schema error, or fidelity violation increments the failure
count. The CLI exits with status `1`, so CI can gate on either command:

```bash
pnpm exec subagent-compose --dry-run --target production
pnpm exec subagent-compose --apply --target production
```

## Verifying production artifact fidelity

After applying production artifacts, compare the files on disk with a fresh
compose from the source definition:

```bash
pnpm exec subagent-compose --apply --target production
pnpm exec subagent-compose --verify --target production
```

`--verify` exits:

| Status | Meaning |
| ---: | --- |
| `0` | Every production artifact matches a fresh compose. |
| `1` | At least one artifact is absent, invalid, or has drifted. |
| `2` | Invalid CLI usage, including no active production target or combining `--verify` with `--apply`, `--clean`, or `--check`. |

`--verify` requires at least one active `production` target.

## Target selection

With `subagent.config.json`, compose only the runtimes needed by the current
workflow:

```bash
pnpm exec subagent-compose --apply --target codex
pnpm exec subagent-compose --apply --target cursor --target production
pnpm exec subagent-compose --apply --target all
```

Omitting `--target` is equivalent to `--target all`. Legacy `--src` / `--dst`
mode accepts only `--target cursor` or `--target all`.

Related implementation discussions: [issue #14](https://github.com/ERerGB/subagent-harness/issues/14)
and [issue #15](https://github.com/ERerGB/subagent-harness/issues/15).
