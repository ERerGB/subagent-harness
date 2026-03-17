# subagent-harness

> **Stop rewriting agents per runtime. Define once as SSOT, compose everywhere.**

Portable harness to parse, validate, and compose rich sub-agent definitions into runtime-specific agent files (Cursor, Claude Code, embedded production engines).

---

## 1) The Problem: The "Living Agent" Nightmare

In modern AI engineering, agents are not static scripts—they are **living artifacts**. Their prompts, configurations, and required skills evolve constantly.

When you maintain an agent across different environments (IDE, CLI, Production Pipeline), this evolution causes fatal "Definition Drift".

### A Ground-Truth Story: Bob's `changelog-extractor`

Bob builds a simple, focused sub-agent to automate release notes.
It requires only:
- **Prompt:** *"Read recent commits, group them by feature/fix, and output a markdown list."*
- **Skills (2):** `read_git_log` and `read_jira_ticket`.

He deploys this agent in two places:
1. **The IDE (Cursor):** A minimal markdown file in `.cursor/agents/` so developers can run it locally before pushing.
2. **The CI Pipeline:** A rich JSON configuration running in the production backend to auto-generate GitHub releases.

**Then the iteration begins (The Drift):**

- **Iteration 1 (Format change):** Marketing says the changelog is too technical. Bob updates the prompt to demand: *"Translate commit messages into customer-facing benefits."*
- **Iteration 2 (New Skill):** To get the customer context, Bob adds a new skill: `fetch_pr_description`.
- **Iteration 3 (Config change):** The LLM is hallucinating features. Bob lowers the `temperature` config to `0.1` and adds a hard constraint: *"If no Jira ticket is found, skip the commit."*

**The Result: A Fractured DX**

Because Bob had to maintain two separate definitions, he updated the **CI Pipeline** but forgot to sync the **Cursor IDE** version.
Now, when developers run `changelog-extractor` locally, the agent hallucinates, misses PR contexts, and generates highly technical jargon.

> **The Root Cause:** Without a Single Source of Truth (SSOT) and an automated composition pipeline, iterating on an agent guarantees environment drift. Your local IDE agent becomes a liar compared to your production agent.

---

## 2) The Solution: A Governance Pipeline

`subagent-harness` transforms agent lifecycle management from manual copy-pasting into a standardized pipeline: **Source -> Audit -> Compose -> Smoke**.

### How it closes the DX Loop

1. **True SSOT (Rich Source):**
   Bob deletes the scattered configs. He writes one rich `changelog-extractor.agent.md` file. It contains the exact prompt, the temperature config (`0.1`), and the required skills (`read_git_log`, `fetch_pr_description`).

2. **Automated Validation (Audit):**
   When Bob commits changes, the harness validates that the file structure is sound and all required fields exist.

3. **Adapter-based Generation (Compose):**
   Bob runs a single command. The harness reads the SSOT. For the CI pipeline, it parses the full YAML frontmatter. For local IDEs, it safely strips the proprietary configs and generates a perfectly clean `~/.cursor/agents/changelog-extractor.md`.

4. **Synchronized Migration:**
   When Bob tunes the prompt to "translate to customer benefits," he changes it in **one place**. The next `compose` run instantly updates both the CI and the developers' local IDEs.

**Direct DX Impact:**
- **Zero Drift:** Local development behavior matches production CI behavior precisely.
- **Portable by design:** Adding Claude Code or a new IDE tomorrow? Just add a new compose adapter; the source remains untouched.
- **Fail Fast:** Schema errors are caught during the `audit` phase, not during a live engineering workflow.

---

## 3) 5-Minute Quickstart

Let's convert your custom agents into the SSOT model.

### Step A: Prepare your SSOT Directory

Gather your agent source files into a central directory (e.g., `~/my-custom-agents/`). Ensure they follow the rich `*.agent.md` format (YAML frontmatter + markdown body).

### Step B: Install the Harness

In your Node.js project:

```bash
pnpm add -D subagent-harness
```

### Step C: Dry-Run (Safe Preview)

See how the harness parses and strips your rich source without modifying any files:

```bash
pnpm exec subagent-compose \
  --src ~/my-custom-agents \
  --dst ~/.cursor/agents \
  --dry-run
```

*(Notice how it accurately extracts `name` and `description` while safely discarding runtime-irrelevant metadata.)*

### Step D: Apply (Generate Runtime Files)

Generate the clean, runtime-ready files into your target directory:

```bash
pnpm exec subagent-compose \
  --src ~/my-custom-agents \
  --dst ~/.cursor/agents \
  --apply
```

### Step E: Idempotence Check

Run the `--apply` command one more time. The harness is deterministic; no files should change.

### Step F: Smoke Test

Return to your IDE (you may need to Reload Window). Open your Subagents list. Your agent is now fully discovered, perfectly formatted, and guaranteed to be in sync with your SSOT.

---

## 📚 References & Prior Art

The design of `subagent-harness` is heavily inspired by ongoing industry challenges in AgentOps and Prompt Engineering:

- **The "Prompt Drift" Problem**: As discussed in [*Designing AI Features Without Prompt Drift*](https://dev.to/zywrap/designing-ai-features-without-prompt-drift-105b), maintaining prompts across fragmented services leads to unpredictable degradation. `subagent-harness` solves this by forcing a Single Source of Truth (SSOT).
- **Git-as-Source-of-Truth**: While many PromptOps platforms push for UI-based API delivery, tools like [*Agentsmith*](https://agentsmith.dev/docs/core-concepts/architecture) highlight the necessity of keeping prompts version-controlled alongside code. We believe agents are code, and their definitions belong in Git.
- **The IDE Formatting Gap**: The community is actively exploring how to break out of proprietary IDE formats (see [*Migrating Cursor Rules to AGENTS.md*](https://www.adithyan.io/blog/migrating-cursor-rules-to-agents)). `subagent-harness` bridges this exact gap—allowing you to leverage rich, IDE-specific features (like `.cursor/agents/`) without surrendering your universal SSOT.

---

## Docs

- [5-Minute Quickstart](docs/QUICKSTART_5_MIN.md)
- [Beta Feedback Form](docs/BETA_FEEDBACK.md)
- [Governance Agreement](docs/AGREEMENT.md)
- [Governance Navigation](docs/GOVERNANCE.md)
- [Trusted Publishing Setup](docs/TRUSTED_PUBLISHING.md)

## License

Apache-2.0
