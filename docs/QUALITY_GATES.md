# Quality Gates

[← Back to the README](../README.md#quality-gates)

`subagent-harness` treats composition as a governance pipeline. The test layers
separate cheap structural failures from runtime-specific and live-process
failures.

| Layer | Checks | Default behavior |
| --- | --- | --- |
| **L1 · Schema** | Required fields, YAML frontmatter, parser errors | Always local and deterministic |
| **L2 · Runtime contract** | Generated output matches the target runtime shape | Always local and deterministic |
| **L3 · Live smoke** | A real runtime can load or execute the artifact | Optional unless explicitly required |

## Standard commands

```bash
# Run L1, L2, and configured L3 probes
pnpm test:e2e

# Run the reusable matrix with a strict production probe
pnpm test:matrix
```

## Subject-harness probes

To include real Subject-Harness CLI and API probes in strict mode:

```bash
SUBJECT_HARNESS_CLI_CMD='subject-harness run --artifact "$SUBJECT_ARTIFACT_PATH"' \
SUBJECT_HARNESS_API_MODULE=./path/to/subject-api-probe.mjs \
node scripts/run-matrix.mjs \
  --targets "production,subject-cli,subject-api" \
  --strict
```

## Runtime smoke probes

For composed Markdown agents, set any of these environment variables to a shell
command:

- `CURSOR_RUNTIME_CHECK_CMD`
- `CODEX_RUNTIME_CHECK_CMD`
- `CLAUDE_RUNTIME_CHECK_CMD`

`pnpm test:l3` passes `AGENT_FILE` pointing at the temporary composed artifact.
Markdown probes use a five-minute Vitest timeout so an actual CLI or IDE
round-trip can complete.

Example for OpenAI Codex CLI:

```bash
export CODEX_RUNTIME_CHECK_CMD='codex exec -s read-only --skip-git-repo-check --ephemeral - < "$AGENT_FILE"'
pnpm test:l3
```

To make a missing probe fail CI, add its target name to the comma-separated
`L3_REQUIRE_TARGETS` variable, for example `production,codex`.

## Freshness and fidelity

Tests validate the compiler. CLI checks validate generated state:

```bash
# Check target presence and source/output mtime freshness
pnpm exec subagent-compose --check

# Verify production JSON against a fresh compose
pnpm exec subagent-compose --verify --target production
```

See the [Production JSON Contract](PRODUCTION_JSON_CONTRACT.md) for fidelity
rules and exit codes, and the [SDK Probe Contract](SDK_PROBE_CONTRACT.md) for L3
probe input/output semantics.
