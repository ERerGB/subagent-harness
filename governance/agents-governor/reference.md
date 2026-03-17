# Agents Governor Reference

## Rule Matrix (v0)

### Schema Rules

- `name`: required, lowercase kebab-case
- `description`: required, non-empty
- `scenario`: required, one of `meeting|creator`
- `adr`: required
- prompt body: required, non-empty

### Governance Rules

- Source of truth is `archetypes/**/*.agent.md`
- Composed runtime files are generated artifacts
- `quotable` fire-and-freeze implies `maxIdleTurns = 0` (when config is present)
- Cross-file `name` must be globally unique

### Discovery Rules

- Each source agent maps to exactly one runtime file
- Runtime file name must match source `name`
- Description must not be empty after compose
- Repeat compose must be idempotent

## Error Code Convention

- `E_SCHEMA_*`: schema validation failures
- `E_RULE_*`: governance rule failures
- `E_DISCOVERY_*`: mapping/collision/drift failures
- `E_COMPOSE_*`: compose runtime failures
- `E_SMOKE_*`: runtime smoke failures

## Suggested Check Commands (planned)

```bash
pnpm agents:audit
pnpm agents:audit-discovery
pnpm agents:compose
pnpm agents:check
```

If these commands are not yet implemented, governance runs should still report
missing command gaps explicitly.

## PR Checklist

- [ ] Audit passed
- [ ] Discovery audit passed
- [ ] Compose deterministic
- [ ] Smoke checks passed (if adapter behavior touched)
- [ ] Docs updated (README/skill/reference if policy changed)
