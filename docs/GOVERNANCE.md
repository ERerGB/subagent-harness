# Governance Entry

Governance in this project is **skill-first**.

## Canonical Sources

- Strategic agreement: `docs/AGREEMENT.md`
- Executable workflow: `.cursor/skills/agents-governor/SKILL.md`
- Rule matrix and checks: `.cursor/skills/agents-governor/reference.md`

## Why Skill-First

Governance should be runnable, not only readable. The `agents-governor` skill
defines the exact operational flow:

1. `audit` (schema and invariants)
2. `audit-discovery` (name/drift/collision checks)
3. `compose` (runtime adapter generation)
4. `smoke` (runtime sanity validation)

Use this doc as navigation. Put behavior changes in the skill files.

