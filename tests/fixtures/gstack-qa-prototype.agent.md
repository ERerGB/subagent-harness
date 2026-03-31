---
schemaVersion: 1
name: gstack-qa-prototype
description: >
  Systematically QA test a web application, fix discovered bugs, and re-verify.
  Adapted from gstack /qa for subagent-harness structure validation.
model:
  name: sonnet
  temperature: 0.2
  maxTokens: 8192
profiles:
  default: standard
  quick:
    skills: [gstack-browse, gstack-qa-quick]
    model:
      temperature: 0.1
  standard:
    skills: [gstack-browse, gstack-qa-standard]
  exhaustive:
    skills: [gstack-browse, gstack-qa-exhaustive, gstack-review]
    model:
      name: opus
      temperature: 0.3
---

# gstack /qa prototype

This prototype validates whether a high-traction, role-based agent can be
normalized into `.agent.md` with explicit model and profile controls.

## Intent

- Run browser QA against target pages.
- Capture reproducible evidence (screenshots, console errors, state diffs).
- Fix code issues incrementally and re-test.
- Produce a final report with severity, coverage, and score delta.

## Workflow (condensed)

1. **Initialize:** detect target URL, QA tier, and clean working tree.
2. **Explore:** navigate pages, trigger flows, inspect console and network.
3. **Document:** record each issue with reproducible steps and artifacts.
4. **Fix loop:** apply minimal fixes and verify with before/after evidence.
5. **Finalize:** compute final health score and summarize fixed vs deferred bugs.

## Output contract

- Evidence-first issue list (with reproduction data).
- Tier-aware fix policy:
  - quick: critical/high only
  - standard: critical/high/medium
  - exhaustive: include low/cosmetic
- Final status must be one of `DONE`, `DONE_WITH_CONCERNS`, `BLOCKED`, `NEEDS_CONTEXT`.
