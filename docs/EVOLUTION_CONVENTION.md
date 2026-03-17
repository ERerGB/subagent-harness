# Evolution Field Convention

The `evolution` field is an **extension** (lives in `.agent.ext.yaml`, not in the core `.agent.md`). It enables automated prompt optimization tools like [Hacker](https://github.com/user/hacker) to track mutation history on agent definitions.

## Location

```
my-agent.agent.md       # Core: name, description, model, profiles, prompt
my-agent.agent.ext.yaml # Extensions: evolution, scenario, archetype, etc.
```

## Schema

```yaml
# .agent.ext.yaml
evolution:
  engine: hacker       # Which optimizer produced this mutation
  cycle: 0             # Monotonic generation counter (0 = seed)
  parent: <agent-id>   # Optional: source agent this was derived from
  score: <number>      # Optional: fitness score from last evaluation
  mutatedAt: <iso8601> # Optional: timestamp of last mutation
```

### Field Semantics

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `engine` | string | yes | Identifier of the optimization tool (`hacker`, `dspy`, custom) |
| `cycle` | integer | yes | Generation number. Seed agents start at `0`. Each mutation increments by 1. |
| `parent` | string | no | Reference to the parent agent definition this was derived from. |
| `score` | number | no | Last evaluated fitness score. Interpretation is engine-specific. |
| `mutatedAt` | string | no | ISO 8601 timestamp of when this mutation was applied. |

## Lifecycle

1. **Seed** — A human-authored agent starts with `cycle: 0` (or no `evolution` block at all).
2. **Mutate** — The optimizer reads the agent via `loadAgentFromDisk()`, applies mutations via `patchAgent()`, increments `cycle`, and writes back via `serializeAgent()` + `serializeExtensions()`.
3. **Evaluate** — The optimizer runs the mutated agent against a test corpus and records `score`.
4. **Select** — Top-performing variants survive; others are discarded or archived.

## Round-trip Example

```typescript
import { loadAgentFromDisk, patchAgent, serializeAgent, serializeExtensions } from "subagent-harness";

const doc = loadAgentFromDisk("agents/classifier.agent.md");

// Apply a prompt mutation
const mutated = patchAgent(doc, { path: "body", value: newPrompt });

// Increment evolution cycle
const cycle = Number(doc.extensions.evolution?.cycle ?? 0) + 1;
const evolved = patchAgent(mutated, {
  path: "extensions.evolution",
  value: { engine: "hacker", cycle: String(cycle), score: "8.2" },
});

// Write back
writeFileSync("agents/classifier.agent.md", serializeAgent(evolved));
writeFileSync("agents/classifier.agent.ext.yaml", serializeExtensions(evolved.extensions));
```

## Design Rationale

- **Extension, not core**: Evolution metadata is optimizer-specific. Keeping it in the sidecar means the core `.agent.md` stays human-readable and optimizer-agnostic.
- **Monotonic cycle**: Simple integer avoids version conflicts. The optimizer owns the counter.
- **Engine tag**: Supports multiple optimization tools operating on the same agent pool without collision.
