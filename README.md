# subagent-harness

Portable harness to parse, validate, and compose rich agent definitions into runtime-specific subagent files (starting with Cursor).

## Governance Agreement

See `docs/AGREEMENT.md` for maintainer agreements, migration triggers, and the
org-level split checklist.

## Governance Docs

- `docs/AGREEMENT.md`: shared agreement and trigger checklist
- `docs/GOVERNANCE.md`: governance entry and navigation
- `.cursor/skills/agents-governor/SKILL.md`: executable governance workflow
- `.cursor/skills/agents-governor/reference.md`: rule details and check matrix
- `docs/TRUSTED_PUBLISHING.md`: npm Trusted Publishing setup and release flow
- `docs/QUICKSTART_5_MIN.md`: onboarding guide for external testers
- `docs/BETA_FEEDBACK.md`: feedback form for beta validation

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

## Compose (CLI)

```bash
# Install
pnpm add -D subagent-harness

# Dry-run
pnpm exec subagent-compose --src /path/to/archetypes --dst /path/to/.cursor/agents --dry-run

# Apply
pnpm exec subagent-compose --src /path/to/archetypes --dst /path/to/.cursor/agents --apply
```

## 📚 References & Prior Art

The design of `subagent-harness` is heavily inspired by ongoing industry challenges in AgentOps and Prompt Engineering:

- **The "Prompt Drift" Problem**: As discussed in [*Designing AI Features Without Prompt Drift*](https://dev.to/zywrap/designing-ai-features-without-prompt-drift-105b), maintaining prompts across fragmented services leads to unpredictable degradation. `subagent-harness` solves this by forcing a Single Source of Truth (SSOT).
- **Git-as-Source-of-Truth**: While many PromptOps platforms push for UI-based API delivery, tools like [*Agentsmith*](https://agentsmith.dev/docs/core-concepts/architecture) highlight the necessity of keeping prompts version-controlled alongside code. We believe agents are code, and their definitions belong in Git.
- **The IDE Formatting Gap**: The community is actively exploring how to break out of proprietary IDE formats (see [*Migrating Cursor Rules to AGENTS.md*](https://www.adithyan.io/blog/migrating-cursor-rules-to-agents)). `subagent-harness` bridges this exact gap—allowing you to leverage rich, IDE-specific features (like `.cursor/agents/`) without surrendering your universal SSOT.

## License

Apache-2.0

