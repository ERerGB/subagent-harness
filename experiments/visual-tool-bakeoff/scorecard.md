# Blind review scorecard

Review previews without tool names. Score every criterion from 1–5, then apply
the weight. Do not award points for polish that weakens comprehension.

| Criterion | Weight | What good looks like |
| --- | ---: | --- |
| Two-second comprehension | 30 | A developer can paraphrase source → build → targets without reading supporting copy. |
| Developer trust | 15 | Feels precise, infrastructural, and technically honest rather than like generic SaaS promotion. |
| Brand coherence | 15 | Restrained palette, distinct silhouette, and room to grow into a durable visual system. |
| Native editability | 10 | Text and structural elements remain easy to change without reconstructing the asset. |
| Reproducibility | 10 | The same inputs can create a materially equivalent output again. |
| Agent workflow friction | 10 | Few manual corrections, context switches, and tool-specific recovery steps. |
| Portability and legal safety | 10 | Clean export, no vendor-logo dependency, and low lock-in. |
| **Total** | **100** | |

## Automatic gates

A variant is ineligible as the default system if any of these fail:

- Required label is misspelled or missing.
- Reading order is ambiguous at 640 px display width.
- Export is not 1280 × 640.
- Third-party brand artwork is embedded.
- Editable source cannot be retained or regenerated.

