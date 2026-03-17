---
name: bad-default
description: Agent whose default profile references a non-existent profile
archetype: analyzer
scenario: meeting
adr: ADR-001
profiles:
  default: nonexistent
  live:
    skills: [fact-check]
---

This agent has a bad default profile reference.
