# subagent-harness

> **Docker for agentic environments.**<br>
> Define an agent once. Build it for every runtime.

Modern teams do not work in one agentic environment. Application developers may
use Cursor, platform engineers Codex, automation authors Claude Code, and the
product backend a strict JSON contract. Just as polyglot software teams use
different languages and toolchains, agentic teams now use different end-to-end
environments. That diversity is expected. What is missing is a shared
interoperability layer.

`subagent-harness` applies Docker's **define → build → run** mental model to
agent definitions. A rich `.agent.md` provides the common abstraction;
`subagent-compose` validates it and builds native artifacts through target
adapters. Different teams keep their preferred environments while collaborating
through one portable contract.

> **Boundary:** this project is the build and compatibility layer. It does not import arbitrary vendor-native definitions, erase runtime capability gaps, sandbox, schedule, or execute agents.

**Fast paths:** [Understand the problem](#the-problem-agentic-environment-fragmentation) ·
[Install in two minutes](#quickstart) · [Inspect build targets](#build-targets) ·
[Embed the API](#programmatic-api) · [Define the integration boundary](#integration-boundary) ·
[Browse the docs](#documentation-index)

<details>
<summary><strong>README map — expand the top-down view</strong></summary>

- **Evaluate**
  - [The Problem: Environment Fragmentation](#the-problem-agentic-environment-fragmentation)
  - [How It Works](#how-it-works)
  - [Build Targets](#build-targets)
- **Adopt**
  - [Quickstart](#quickstart)
  - [Quality Gates](#quality-gates)
- **Extend**
  - [Programmatic API](#programmatic-api)
  - [Integration Boundary](#integration-boundary)
- **Operate**
  - [Project Status and Updates](#project-status-and-updates)
  - [Documentation Index](#documentation-index)

</details>

## The Problem: Agentic Environment Fragmentation

Agentic development now runs across **heterogeneous environments by default**.
IDE agents, CLI agents, CI automation, and product runtimes each optimize for a
different interaction model and expose different schemas, tool bindings,
configuration fields, discovery rules, and lifecycle contracts.

Environment heterogeneity is not the defect. The missing piece is a shared
interoperability layer that aggregates changes, abstracts portable semantics,
and verifies target compatibility without forcing every team onto the same
tool.

> **Core invariant:** unify the definition, not the environments.

Consider one `changelog-extractor`: the application team invokes it in Cursor,
the platform team tests it in Codex, and the release service loads production
JSON. Without a common contract, those integrations become three parallel
implementations. Every schema or tool change requires manual coordination, and
“compatibility” remains a social promise rather than a testable property.

Across `A` agent definitions and `R` runtimes, this becomes `A × R`
hand-maintained mappings. A canonical definition model plus reusable target
adapters separates the `A` authoring surfaces from the `R` compatibility
implementations.

`subagent-harness` supplies that interoperability layer:

| Layer | Engineering role |
| --- | --- |
| **Canonical aggregation** | Teams converge changes on one versioned `.agent.md` plus optional `.agent.ext.yaml` |
| **Portable abstraction** | The definition model expresses shared agent semantics independently of vendor serialization |
| **Target compatibility** | Deterministic adapters emit runtime-native Cursor, Codex, Claude Code, and production artifacts |
| **Contract validation** | Schema and runtime-contract gates verify each generated projection before consumption |

Dev-to-production promotion is one route through this layer, not the layer's
primary abstraction.

The architecture borrows from compiler toolchains: target-independent concepts
sit above target-specific backends. LLVM documents this separation between its
internal representation and
[target-specific code generation](https://llvm.org/docs/CodeGenerator.html);
OpenAPI applies a related idea through a
[language-agnostic interface description](https://spec.openapis.org/oas/v3.0.4.html).

Today, aggregation happens at the canonical source: teams collaborate on the
portable definition, then compile outward. The harness does not yet reverse-map
or merge arbitrary runtime-native files. Compatibility means that each output
satisfies its target contract; it does not imply identical features or behavior
across models, tools, and runtimes.

## How It Works

| Docker mental model | `subagent-harness` |
| --- | --- |
| `Dockerfile` | Rich `*.agent.md` source definition |
| `docker build` | `subagent-compose --apply` |
| Target image | Cursor, Codex, Claude Code, or production artifact |
| Container runtime | The agentic environment that discovers and runs the artifact |

```text
agents/changelog-extractor.agent.md       # Author this
              │
              └── subagent-compose --apply
                    ├── .cursor/agents/changelog-extractor.md
                    ├── .codex/agents/changelog-extractor.md
                    ├── .claude/skills/changelog-extractor/SKILL.md
                    └── dist/agents/changelog-extractor.json
```

### Build Targets

| Target | Generated Format | Purpose |
| ------ | ---------------- | ------- |
| **Cursor** | `.cursor/agents/*.md` | Local IDE autocomplete & agent generation |
| **Codex** | `.codex/agents/*.md` | OpenAI Codex CLI (`codex exec --instructions`); same markdown shape as Cursor |
| **Claude Code** | `.claude/skills/*.md` | Global CLI skills |
| **Production** | `dist/agents/*.json` | CI/CD pipelines & backend SDK consumption |

*More integrations are planned, including Windsurf, Copilot, and Cline.*

## Quickstart

```bash
# Install
pnpm add -D subagent-harness

# Preview generated files without writing them
pnpm exec subagent-compose \
  --src ~/my-custom-agents \
  --dst ~/.cursor/agents \
  --dry-run

# Build runtime-ready files
pnpm exec subagent-compose \
  --src ~/my-custom-agents \
  --dst ~/.cursor/agents \
  --apply
```

Reload the IDE window and open its agent list. Run `--apply` again at any time;
unchanged sources produce the same artifacts.

With `subagent.config.json`, build only the targets needed by the current
workflow:

```bash
pnpm exec subagent-compose --apply --target codex
pnpm exec subagent-compose --apply --target cursor --target production
```

Go deeper: [5-Minute Quickstart](docs/QUICKSTART_5_MIN.md) ·
[Target selection and production JSON](docs/PRODUCTION_JSON_CONTRACT.md)

## Quality Gates

Composition is a governance pipeline, not only a format conversion:

| Layer | Catches | Runs where |
| --- | --- | --- |
| **L1 · Schema** | Missing fields, invalid YAML, parser errors | Local and CI |
| **L2 · Runtime contract** | Output that the target runtime cannot consume | Local and CI |
| **L3 · Live smoke** | A real CLI, IDE, or backend rejecting the artifact | Optional or required by policy |

```bash
pnpm test:e2e    # L1 + L2 + configured L3 probes
pnpm test:matrix # reusable target matrix + strict production probe
```

Generated-state checks enforce artifact freshness and production projection
fidelity:

```bash
pnpm exec subagent-compose --check
pnpm exec subagent-compose --verify --target production
```

Reference: [Quality Gates](docs/QUALITY_GATES.md) ·
[Production JSON Contract](docs/PRODUCTION_JSON_CONTRACT.md) ·
[SDK Probe Contract](docs/SDK_PROBE_CONTRACT.md)

## Programmatic API

`subagent-harness` can also be embedded in a terminal app, backend worker, or
release pipeline.

```ts
import { readFileSync } from "node:fs";
import {
  parseRichAgentMarkdown,
  validateRichAgent,
  composeSubagent
} from "subagent-harness";

const sourcePath = "agents/changelog-extractor.agent.md";
const content = readFileSync(sourcePath, "utf8");

const doc = parseRichAgentMarkdown(sourcePath, content);
const validation = validateRichAgent(doc);

if (!validation.ok) {
  throw new Error(
    `Invalid agent definition: ${validation.issues.map((i) => i.code).join(", ")}`
  );
}

const cursorAgent = composeSubagent(doc, "cursor");
const codexAgent = composeSubagent(doc, "codex");
```

This keeps IDE and product runtimes on the same source while isolating their
adapters. For production fidelity checks, import
`validateProductionComposeOutput` or read the
[Production JSON Contract](docs/PRODUCTION_JSON_CONTRACT.md).

## Integration Boundary

The harness standardizes the portable build layer. Your product still owns the
runtime semantics:

| The harness owns | Your project owns |
| --- | --- |
| Parse, validate, and resolve profiles | Interpret extension fields |
| Emit runtime-native artifacts | Compose scenarios and orchestrate agents |
| Validate generated contracts | Schedule lifecycle and bind skills to tools |

**The harness stores `extensions` but never interprets them.** Domain-specific
meaning stays in the consuming runtime.

Deep dive: [Integration Boundary](docs/INTEGRATION_BOUNDARY.md)

## Project Status and Updates

> **Status:** Pre-RC. The format and API are stabilizing but are not frozen.

Git tags and GitHub Releases are the primary version signal:

| Method | Best for |
| --- | --- |
| **Watch → Custom → Releases** | Lightweight human notification |
| [Dependabot](https://docs.github.com/en/code-security/dependabot) or [Renovate](https://docs.renovatebot.com/) | Automated upgrade pull requests |
| [`downstream.json`](downstream.json) | An issue in a registered downstream project on release |
| [Releases RSS](https://github.com/ERerGB/subagent-harness/releases.atom) | Feed readers and release automation |

## Documentation Index

| Document | Use it when you need to... |
| --- | --- |
| [5-Minute Quickstart](docs/QUICKSTART_5_MIN.md) | Reach a first successful compose |
| [Production JSON Contract](docs/PRODUCTION_JSON_CONTRACT.md) | Validate fidelity, target selection, and exit codes |
| [Quality Gates](docs/QUALITY_GATES.md) | Configure L1/L2/L3 and real-runtime probes |
| [Integration Boundary](docs/INTEGRATION_BOUNDARY.md) | Decide what belongs in the harness versus your runtime |
| [YAML Subset](docs/YAML_SUBSET.md) | Check parser-supported YAML features |
| [SDK Probe Contract](docs/SDK_PROBE_CONTRACT.md) | Implement an L3 SDK or process probe |
| [Samantha Quickstart](docs/SAMANTHA_QUICKSTART.md) | Inspect a small end-to-end integration |
| [Beta Feedback Form](docs/BETA_FEEDBACK.md) | Report structured tester feedback |

<details>
<summary><strong>Governance, operations, and research documents</strong></summary>

| Document | Purpose |
| --- | --- |
| [Governance Navigation](docs/GOVERNANCE.md) | Governance entry point |
| [Governance Agreement](docs/AGREEMENT.md) | Maintainer agreement and migration triggers |
| [Trusted Publishing](docs/TRUSTED_PUBLISHING.md) | npm publishing with GitHub Actions OIDC |
| [Protocol Iteration Principles](docs/PROTOCOL_ITERATION_PRINCIPLES.md) | Lean core-protocol evolution rules |
| [Project Structuring Worklog](docs/PROJECT_STRUCTURING_WORKLOG.md) | Import and protocol observations by project |
| [Developer-tool Visual Distribution Research](docs/research/developer-tool-visual-distribution.md) | Visual-system and share-card decisions |
| [Developer-product Research Route](docs/research/developer-product-research-route.md) | Repository-, CLI-, SDK-, and middleware-first research route |

</details>

## License

Apache-2.0
