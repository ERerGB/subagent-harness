# Visual tool bake-off

> **Status: retired production route, retained provenance.** The Figma v2 output
> is promoted as the current README proof visual, but the earlier “build once”
> brief must not be reused to generate new repository assets.

This experiment compared first-pass visual production workflows for the same
developer-facing proof visual. It was intentionally not a comparison of four
different creative briefs.

## Historical run contract

- Variants used the now-retired [`brief.md`](./brief.md).
- The message, labels, palette, and legal constraints remained fixed.
- Editable source and a 1280×640 PNG were stored in `outputs/<tool>/`.
- Provenance and workflow friction were recorded in [`manifest.json`](./manifest.json).
- Scoring happened after every available first pass was exported.

The existing README share card is a reference, not a contestant. Variants must
be produced from the brief rather than traced from that image.

## Historical production order

1. Code-first SVG + resvg baseline
2. Figma MCP native layers
3. Penpot MCP native layers
4. Canva generated template

Cloudinary is excluded because it is a delivery/transformation layer, not an
authoring competitor. Tokens Studio is excluded because it supplies tokens to
authoring tools rather than producing the visual itself.
