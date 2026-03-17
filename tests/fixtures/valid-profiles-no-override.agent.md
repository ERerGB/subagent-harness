---
name: simple-profiles
description: Agent with profiles but no model overrides in any profile
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
