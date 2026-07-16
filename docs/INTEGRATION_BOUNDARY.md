# Integration Boundary

[← Back to the README](../README.md#integration-boundary)

When integrating `subagent-harness`, the key architectural decision is knowing
where the portable build layer stops and the product runtime begins.

```text
subagent-harness (standardized)          Your project (project-specific)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━            ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
.agent.md → parse → validate              Interpret extension semantics
.agent.ext.yaml → merge extensions        Resolve scenario bundles
Profile → resolve model + skills          Orchestrate and schedule agents
Output → definition or artifact           Manage runtime lifecycle
Contract validation                       Bind skill names to real tools
```

## What goes where

| Concern | Owner | Why |
| --- | --- | --- |
| Agent identity, description, and prompt | Harness · `.agent.md` | Portable across runtimes |
| Model config and profile resolution | Harness · `loadAgent()` | Deterministic and runtime-agnostic |
| Extension fields such as `config`, `contentSchema`, or `archetype` | Harness stores; your project interprets | Semantics are domain-specific |
| Scenario bundles, overrides, and exclusions | Your project | Product-level composition decision |
| Scheduling and lifecycle | Your project | Depends on the interaction model |
| Skill-to-tool binding | Your project | Tool implementations are runtime-specific |

The harness never interprets `extensions`. It carries them as an opaque
`Record<string, unknown>` so domain-specific semantics do not leak into the core
protocol.

## Consuming a production artifact

```ts
import { loadAgentFromDisk, composeSubagent } from "subagent-harness";

// Harness: portable source → typed artifact
const doc = loadAgentFromDisk("agents/my-agent.agent.md");
const json = JSON.parse(composeSubagent(doc, "production"));

// Your project: interpret extensions and wire the runtime
const maxIdleTurns = json.config?.maxIdleTurns ?? 10;
const contentSchema = json.contentSchema;
// ...feed these values into your scheduler or executor.
```

## Why scenario bundles stay outside the harness

A scenario bundle answers questions such as which agents run together, which
overrides apply, and which agents should be disabled. Those are product
decisions:

- A meeting app may run three agents in parallel over one transcript.
- A CI pipeline may run one reviewer agent per pull request.
- A CLI may spawn agents sequentially as task executors.

The harness provides `loadAgent()` for an individual agent. How multiple agents
are composed and run belongs to the consuming product.

See [issue #16](https://github.com/ERerGB/subagent-harness/issues/16) for the
typed `loadAgent()` API discussion.

