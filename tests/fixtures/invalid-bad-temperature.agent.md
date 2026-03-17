---
name: hot-agent
description: Agent with out-of-range temperature
archetype: analyzer
scenario: meeting
adr: ADR-001
model:
  name: opus
  temperature: 5.0
---

This agent has an invalid temperature and should fail validation.
