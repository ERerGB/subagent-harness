# First-pass observations

> Revision note: the active code-first and Figma previews are now v2. The v1
> files remain archived beside them. V2 replaces the abstract source card with
> a legible `.agent.md` editor and replaces the static environment list with an
> artifact fan-out using packet trails and live-state signals.

These are provisional operational scores, not the final human blind review. The
tool identities were known while recording workflow friction.

| Variant | Automatic gate | Visual fit / 60 | Overall / 100 | Initial read |
| --- | --- | ---: | ---: | --- |
| Figma MCP | Pass | **60** | 90 | Best first-pass visual fit; strongest native editability. |
| Code-first SVG + resvg | Pass | 57 | **91** | Best system baseline; deterministic, portable, and cheap to regenerate. |
| Canva candidate 1 | Fail | 36 | Ineligible | Closest Canva direction, but missing required content. |
| Penpot MCP | No output | — | — | Account, MCP key, live file, and plugin connection are prerequisites. |

`Visual fit / 60` is the weighted sum of two-second comprehension, developer
trust, and brand coherence. The overall score also includes editability,
reproducibility, workflow friction, and portability/legal safety.

## Gate notes

- Code-first and Figma exports are both 1280 × 640, under 1 MB, readable at
  README width, and contain every required label without vendor artwork.
- Canva generated four 711 × 400 candidate thumbnails. Every candidate changed
  or omitted fixed text, so none should be promoted to an editable Canva design
  without an explicit choice to continue iterating.
- Penpot is not assigned a quality score. Setup friction is observable; visual
  quality is not.

## Provisional decision

Use the code-first renderer as the repository source of truth and regression
baseline. Use Figma as the human/agent art-direction surface. Treat Canva as a
downstream adaptation channel after the composition and copy are locked, not as
the source generator for proof visuals with strict technical semantics.
