---
name: empty-skills
description: Agent with a profile that has no skills
archetype: analyzer
scenario: meeting
adr: ADR-001
profiles:
  default: broken
  broken:
    skills: []
---

This agent has an empty skills array and should fail validation.
