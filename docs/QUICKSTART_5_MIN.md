# 5-Minute Quickstart

This guide helps a new user go from zero to first successful compose in under 5 minutes.

## 0) Prerequisites (30s)

- Node 20+
- pnpm 10+
- A project with rich agent sources (`*.agent.md`)

## 1) Install (30s)

In your target project:

```bash
pnpm add -D subagent-harness
```

## 2) Compose (1 min)

Run a dry-run first:

```bash
pnpm exec subagent-compose \
  --src apps/magpie-mobile/agents/archetypes \
  --dst .cursor/agents \
  --dry-run
```

If output looks correct, apply:

```bash
pnpm exec subagent-compose \
  --src apps/magpie-mobile/agents/archetypes \
  --dst .cursor/agents \
  --apply
```

## 3) Check idempotence (30s)

Run apply again. It should not introduce drift.

```bash
pnpm exec subagent-compose \
  --src apps/magpie-mobile/agents/archetypes \
  --dst .cursor/agents \
  --apply
```

## 4) Verify discovery (1 min)

- Reload your editor/window if needed.
- Check subagents list.
- Confirm each expected agent appears with non-empty description.

## 5) Smoke test (1-2 min)

Test one agent from each scenario:

- Meeting example: `anchor`
- Creator example: `story-seed`

Expected result: agent runs and returns structured output without format failure.

---

## Troubleshooting

### Subagent not discovered

- Ensure target path is correct (`.cursor/agents`)
- Reload window/editor
- Ensure file starts with YAML frontmatter and includes `name` + `description`

### Description missing

- Ensure source has valid `description`
- Re-run compose
- Inspect generated file in target directory

### Compose fails with schema errors

- Fix required frontmatter fields in source `*.agent.md`
- Re-run with `--dry-run` first

## Share this quickstart

Send this URL to testers:

- `docs/QUICKSTART_5_MIN.md`

