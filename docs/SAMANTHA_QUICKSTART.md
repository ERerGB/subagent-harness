# Samantha Mini-Test Quickstart

This is a small test integration of the [Samantha project](https://github.com/leilei926524-tech/samantha) personality and skills into subagent-harness structure.

Implements [issue #10](https://github.com/ERerGB/subagent-harness/issues/10) — skill bundling.

## Structure

```
subagent-harness/
├── agents/
│   ├── samantha.agent.md        # SSOT agent definition
│   ├── samantha.agent.ext.yaml  # Extensions (archetype, scenario)
│   └── personality_seeds/
│       └── README.md            # Reference to Samantha repo seeds
├── skills/                      # Skill sources (bundled on compose)
│   └── samantha/
│       └── SKILL.md
├── .cursor/
│   ├── agents/                  # Composed output (generated)
│   └── skills/                  # Bundled skills (generated)
└── subagent.config.json         # Compose config
```

## Run the Mini-Test

### 1. Build subagent-harness

```bash
pnpm install
pnpm build
```

### 2. Compose (dry-run first)

```bash
pnpm compose --dry-run
```

### 3. Apply compose

```bash
pnpm compose --apply
```

### 4. Verify

- Reload Cursor window
- Open Subagents list → `samantha` should appear
- Open Skills → `samantha` should be discoverable

### 5. Smoke test

Invoke the Samantha agent and have a short emotional/conversational exchange. Expected: warm, brief, present responses — not technical or task-oriented.

## Profiles

| Profile | Skills | Use case |
|---------|--------|----------|
| `companion` (default) | samantha | General emotional companionship |
| `mbti` | samantha, mbti-coach | MBTI personality coaching (requires mbti-coach skill) |

## Install to OpenClaw

```bash
pnpm install:openclaw
```

Copies Samantha skill to `../openclaw/skills/samantha`. Override with `OPENCLAW_SKILLS_DST`.

## Adding mbti-coach

To enable the `mbti` profile, add the mbti-coach skill from Samantha:

```bash
git clone https://github.com/leilei926524-tech/samantha.git /tmp/samantha
cp -r /tmp/samantha/skills/mbti-coach skills/
# Re-run compose to bundle
pnpm compose --apply
```

## Reference

- Samantha project: https://github.com/leilei926524-tech/samantha
- Personality seeds: `assets/personality_seeds/` in Samantha repo
- subagent-harness: [5-Minute Quickstart](QUICKSTART_5_MIN.md)
