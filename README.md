# subagent-harness

Portable harness to parse, validate, and compose rich agent definitions into runtime-specific subagent files (starting with Cursor).

## Governance Agreement

See `docs/AGREEMENT.md` for maintainer agreements, migration triggers, and the
org-level split checklist.

## Why

Teams often need:
- rich source definitions for product runtime (`contentSchema`, `config`, `skills`, evolution metadata)
- minimal runtime definitions for tooling (for example Cursor `.cursor/agents/*.md`)

This package provides a strict, repeatable pipeline:
1. Parse rich agent markdown (`*.agent.md`)
2. Validate schema + governance rules
3. Compose target runtime files
4. Run smoke checks

## Scope (v0)

- Parse markdown files with YAML frontmatter + body
- Validate required fields and invariants
- Compose Cursor-compatible subagent files
- Discovery audit for name conflicts and drift

## Non-goals (v0)

- Executing subagents remotely
- Managing MCP servers
- IDE-specific private APIs

## Example

```bash
pnpm agents:audit
pnpm agents:compose
pnpm agents:check
```

## License

Apache-2.0

