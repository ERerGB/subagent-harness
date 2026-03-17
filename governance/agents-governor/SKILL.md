---
name: agents-governor
description: Govern rich agent definitions through a strict, repeatable pipeline (audit, discovery audit, compose, smoke). Use when adding or updating agent files under archetypes and before release.
---

# Agents Governor

Skill-first governance for `subagent-harness`.

## When to Use

- A `*.agent.md` file is added/modified.
- Adapter compose logic changes.
- Before publishing a release.
- When runtime discovery issues appear (missing agent, wrong description, drift).

## Workflow

1. **Audit**
   - Validate required schema fields and invariants.
2. **Audit Discovery**
   - Check name uniqueness, collisions, and source/target drift.
3. **Compose**
   - Generate runtime-compatible subagent files from rich sources.
4. **Smoke**
   - Verify generated subagents are runnable and return expected shape.

## Commands (planned)

```bash
# 1) Audit
pnpm agents:audit

# 2) Discovery audit
pnpm agents:audit-discovery

# 3) Compose (dry-run then apply)
pnpm agents:compose
pnpm agents:compose -- --apply

# 4) Full gate
pnpm agents:check
```

If the commands are not available yet, run the equivalent local scripts and
report the gap as `E_GOVERNANCE_MISSING_COMMAND`.

## Safety Rules

- Dry-run first for mutating commands.
- Never treat composed output as source of truth.
- Block merge on failed audit checks.
- Keep error messages actionable (file + field + reason).

## Output Contract

For each run, report:

- Passed/failed checks
- Files affected
- Determinism result (idempotent or drifted)
- Next action recommendation

## Additional Rules

See `reference.md` for full rule matrix and error code conventions.
