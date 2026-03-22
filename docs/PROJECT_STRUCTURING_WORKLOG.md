# Project Structuring Worklog

This worklog tracks project-by-project structured imports and the resulting protocol insights.

## Workflow

For each external project:

1. Select atomic, runnable agents.
2. Map into `.agent.md` core protocol.
3. Place non-generalized data in `.agent.ext.yaml`.
4. Run L1/L2/L3 + matrix probes.
5. Record core-field promotion signals.

## Project 001 — gstack (in progress)

### Scope

- Start with two canonical atomic agents:
  - `qa`
  - `review`

### Imported entities

- `agents/gstack-qa.agent.md`
- `agents/gstack-qa.agent.ext.yaml`
- `agents/gstack-review.agent.md`
- `agents/gstack-review.agent.ext.yaml`

### Initial protocol observations

- `version` appears as protocol content and is now promoted to optional core.
- `allowed-tools` is currently kept as extension to avoid over-expanding core prematurely.
- Multi-role, workflow-heavy prompts map cleanly to `.agent.md` body.

### Next step

- Continue importing remaining gstack atomic agents one by one.
- Re-evaluate `allowed-tools` promotion when repeated evidence threshold is met.
