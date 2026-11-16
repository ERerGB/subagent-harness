# Agents Governor reference

## Authoritative contracts

- `src/validate.ts` validates rich definitions: lowercase name, description of at
  least three characters, and nonempty prompt body. Optional model/profile blocks
  have their own constraints. Read the installed version before relying on this list.
- Consumer-specific fields and rules belong in the consumer's extension validator.
  `scenario`, `adr`, `quotable`, and `maxIdleTurns` are not universal requirements.
- `subagent.config.json` selects sources and runtime targets. Do not assume every
  consumer uses `archetypes/`, or that one source produces only one file across
  multiple targets.
- `src/cli.ts` owns CLI behavior; `package.json` owns repository script names.

## Evidence levels

Preview validates and reports the proposed composition. Apply writes the reviewed
outputs. Check detects current source/output drift. Verify checks the production
compose contract for a configured production target. None proves a live model
followed the agent instructions. Report a live smoke test separately when performed.

Use actual reported diagnostic codes and paths; do not invent `E_SCHEMA_*` or
`E_DISCOVERY_*` codes for checks the compiler did not execute.
