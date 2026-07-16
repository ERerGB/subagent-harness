# Shared creative brief

> [!CAUTION]
> **Retired on 2026-07-17. Do not use this as a production prompt.** It predates
> the project's shared interoperability-layer framing and uses the now-ambiguous
> “Build once” claim. It remains here only to preserve the provenance of the v1
> visual-tool bake-off outputs.

## Job to be done

Create a developer-facing README/social proof visual that explains the project
in two seconds:

> One portable agent definition is compiled into native artifacts for multiple
> agentic environments.

The narrative shorthand is **Docker for agentic environments**, but the image
must demonstrate the mechanism rather than lean on a Docker imitation.

## Fixed content

- Canvas: 1280 × 640 px
- Eyebrow: `PORTABLE AGENT DEFINITIONS`
- Headline: `Build once. Run in every agentic environment.`
- Source label: `*.agent.md`
- Compiler label: `subagent-compose`
- Output labels: `Cursor`, `Codex`, `Claude Code`, `Production`
- Footer: `github.com/ERerGB/subagent-harness`

## Fixed visual grammar

- Reading direction: source → compiler → native outputs
- Source must look like a real developer-authored `.agent.md` file: filename
  tab, line numbers, YAML frontmatter, and a Markdown instruction body
- Destinations must read as active fan-out rather than a compatibility list:
  show in-flight artifact packets, directional trails, and live status signals
- Background: near-black charcoal
- Primary text: warm off-white
- Secondary text: slate
- One accent family only: restrained cyan/teal
- Mostly flat 2D geometry; subtle depth is allowed, decorative 3D is not
- Static motion cues are preferred over GIF-only meaning; the pipeline must
  remain understandable in a PNG
- Generous negative space and a clear silhouette at README width
- All labels remain live/editable text in authoring tools that support it

## Constraints

- Do not use Docker's whale or imitate Docker trade dress.
- Do not use Cursor, OpenAI, Anthropic, or other third-party logos.
- Product names may appear as plain text for compatibility explanation.
- Do not introduce a mascot in this bake-off; mascot exploration is a separate
  asset class and would confound the authoring-tool comparison.
- No generated pseudo-text, stock-photo aesthetic, rainbow gradients, glow
  overload, tiny annotations, or diagram legends.
- The final PNG should be under 1 MB when practical.

## Required deliverables

Each variant should include:

1. Editable source
2. `preview.png` at 1280 × 640
3. `provenance.json` with tool, model/plugin, date, input brief, output size,
   elapsed hands-on steps, and known limitations
