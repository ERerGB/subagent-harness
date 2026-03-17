---
name: single-profile
description: Agent with only one profile
archetype: responder
scenario: meeting
adr: ADR-006
profiles:
  default: only
  only:
    skills: [respond, summarize]
---

Respond to queries with concise summaries.
