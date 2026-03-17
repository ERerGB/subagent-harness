---
name: bad-default
description: Agent whose default profile references a non-existent profile
profiles:
  default: nonexistent
  live:
    skills: [fact-check]
---

This agent has a bad default profile reference.
