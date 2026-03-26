---
schemaVersion: 1
version: 2.0.0
name: versioned-agent
description: >
  A versioned agent fixture used to verify optional core version support.
model:
  name: sonnet
  temperature: 0.2
  maxTokens: 2048
profiles:
  default: runtime
  runtime:
    skills: [fact-check]
---

# Versioned fixture

You are a versioned test agent.
