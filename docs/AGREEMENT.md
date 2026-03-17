# subagent-harness Agreement

This document is the shared agreement for maintainers and contributors.

## 1) Principles

- **Source-first**: rich `*.agent.md` files are the source of truth.
- **Adapter isolation**: runtime output formats (Cursor/others) are adapters, not source.
- **Stable core, replaceable runtime**: parse/validate/compose contracts should stay stable even if IDEs change.
- **Dry-run by default**: mutating operations must support safe preview before apply.

## 2) Trigger Checklist

Use this checklist to decide when to keep work in this repository, split modules,
or migrate to a dedicated organization.

### A. Keep all governance in this repository (default)

Stay here when all are true:

- Active contributors are small (<= 5 maintainers).
- Main target is one runtime adapter (currently Cursor).
- Release cadence is fast and still exploring schema boundaries.
- No external partner requires independent release ownership.

### B. Split governance into a separate package/repo

Trigger split when **any 2** are true:

- 2+ runtime adapters are actively maintained (for example Cursor + Claude/Codex).
- Validation rules are reused by 2+ external repositories.
- Governance changes release more frequently than core parser/compose code.
- Governance ownership needs a separate maintainer team.

Recommended shape:

- `subagent-harness` (core parse/validate/compose APIs)
- `subagent-governance` (policy bundles, rule packs, profiles)

### C. Create/open-source organization and migrate multiple repos

Trigger org migration when **any 3** are true:

- 3+ repos are tightly related (sub-agent runtime, governance, Hacker workflow).
- 5+ regular contributors across repos.
- Need unified issue templates, project boards, and release policy.
- Shared branding/documentation/security policy is required.
- External adopters need neutral governance (not tied to one product repo).

## 3) Migration Guardrails

Before any split/migration:

- Define ownership and CODEOWNERS.
- Freeze and tag current stable release.
- Publish migration guide with old/new package mapping.
- Keep backward-compatible aliases for at least one minor cycle.
- Add CI checks proving old fixtures still compose correctly.

## 4) Runtime Compatibility Policy

- Cursor adapter is required in every stable release.
- New runtime adapters must include:
  - parser/validator compatibility tests
  - compose snapshot tests
  - smoke-run examples
- Breaking changes to generated runtime files require a migration note.

## 5) Contributor Workflow

For every feature PR:

1. Add/update fixture under test data.
2. Run validation checks.
3. Run compose checks (dry-run + apply in CI sandbox).
4. Update docs if behavior or policy changed.

## 6) Review Checklist (PR)

- Does this preserve source-of-truth in rich `*.agent.md`?
- Is the change adapter-specific or core-contract?
- Are error messages actionable for contributors?
- Are dry-run and non-destructive defaults preserved?
- Is migration impact documented if output format changes?

