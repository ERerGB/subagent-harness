---
name: simple-profiles
description: Agent with profiles but no model overrides in any profile
archetype: detector
scenario: creator
adr: ADR-005
model:
  name: sonnet
profiles:
  default: standard
  standard:
    skills: [detect, classify]
  verbose:
    skills: [detect, classify, explain, trace]
---

Detect and classify incoming signals.
