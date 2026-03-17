---
name: test-agent
description: >
  A fully specified agent with all three pillars present
  for comprehensive testing.
archetype: analyzer
scenario: meeting
adr: ADR-001
model:
  name: sonnet
  temperature: 0.3
  maxTokens: 4096
profiles:
  default: live
  live:
    skills: [fact-check, real-time-cite]
  review:
    skills: [deep-analysis, citation-gen, summary-format]
    model:
      name: opus
      temperature: 0.7
---

You are a test agent. Analyze the conversation and produce structured output.

## Rules

- Be precise
- Be concise
