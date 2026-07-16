# Developer-tool visual distribution research

Date: 2026-07-16

## Decision in scope

Define an early-stage visual distribution system for `subagent-harness` that:

- helps a developer understand the product within seconds;
- remains memorable outside the README;
- can be copied and shared without losing repository attribution;
- works as both a serious middleware identity and a community object.

This is not a claim that branding causes adoption. The evidence supports design
mechanisms and testable hypotheses, not a causal star or install uplift.

## Evidence summary

| Evidence | Class | What it supports | Limitation |
|---|---|---|---|
| The Go gopher was used for the 2009 open-source launch and later expanded into shirts, figurines, and many community forms. | Product claim | A character can become a durable, remixable community object. | First-party retrospective; does not isolate mascot impact. |
| Deno kept its dinosaur but simplified the Deno 2 mark because the rainy scene was inconsistent and too busy at small sizes. | Product claim | Mascot and scalable mark should be separate layers. | Mature-project redesign, not an early-stage controlled test. |
| Deno maintains a community artwork gallery with multiple licensed reinterpretations of the mascot. | Observed | A recognizable character creates a surface for community contribution. | Selection-biased toward artwork that was submitted and accepted. |
| Dolt introduced a mascot because its serious enterprise styling was memorable neither visually nor emotionally; it commissioned multiple character moods for documentation stories. | Product claim | A mascot needs semantic fit and an expression system, not one isolated drawing. | The team explicitly did not know whether the mascot would become permanent. |
| OpenClaw's lobster became naming lore, community language, generated icon iterations, and third-party remixes. | Product claim + community signal | A specific character can turn product changes into participatory stories. | Exceptional, personality-led project; also attracted impersonation and crypto abuse. |
| `uv` places a benchmark chart directly below its one-line description. | Observed | A proof image can reduce adoption uncertainty faster than decorative art. | Current README, not proof of the image's independent effect. |
| Show HN asks makers to make projects easy to try and says early work need not look slick. | Community policy | Developer launch media must support a runnable artifact rather than replace it. | HN norms do not represent all developer communities. |
| A developer community discussion praised mascots that can appear in many forms; a separate LLVM redesign discussion preferred a characterful old mascot over a cleaner mark when the mark lost project meaning. | Community signal | Versatility and project-specific character matter more than generic polish. | Self-selected anecdotes, not representative research. |

## Durable model

Early middleware has three different visual jobs. One asset should not be forced
to perform all three.

| Layer | Job | Success test |
|---|---|---|
| **Mark** | Recognition at favicon, avatar, badge, and sticker scale | Distinct at 16–32 px and in one color |
| **Mascot** | Memory, personality, release stories, and community remixing | Can express several situations without changing identity |
| **Proof visual** | Explain the product mechanism and reduce technical uncertainty | A developer can accurately paraphrase the system after a two-second scan |

The README hero should remain a proof visual. A mascot may make it memorable,
but must not displace the `source → build → native targets` explanation.

## Recommended direction

### Adapt: a two-layer identity

Use a **tailorbird** as the community character and derive an abstract woven
loop as the small-scale mark.

Why a tailorbird:

- it uses one repeatable craft to build native structures in different
  environments;
- sewing and weaving map to deterministic composition better than generic
  "AI magic";
- thread, loop, nest, and harness geometry can collapse into a restrained
  abstract icon;
- a small bird is specific and expressive without requiring a colorful palette.

The visual metaphor is:

```text
one pattern → deterministic composition → a native fit for each environment
```

This complements the Docker positioning instead of replacing it. Docker remains
the developer-facing mental model; the tailorbird becomes the project's own
community memory device.

### Reject for now: hermit crab

The core-versus-shell metaphor is exceptionally strong, but a current collision
scan found nearby agent products already using hermit-crab identity, including
Herm and OpenHermit. OpenClaw and Rust also make crustacean territory crowded.

### Defer: final mascot name and trademark clearance

The collision scan was directional, not a legal trademark search. Naming and
formal mark adoption should wait until the visual survives small-scale and
community comprehension tests.

## Share-card specification

| Property | Requirement |
|---|---|
| Canvas | `1280×640` PNG, GitHub's recommended social-preview size |
| Weight | Under `1 MB` |
| Palette | Charcoal, slate blue, one cyan accent, off-white type |
| Message | One source definition becomes several runtime-native artifacts |
| Text | Only product-critical labels; readable around 900 px rendered width |
| Click destination | One canonical repository URL |
| Embedded attribution | PNG `Repository` text metadata containing the canonical URL once |
| Copy surface | A fenced Markdown block in the README so GitHub exposes its native copy affordance |

PNG textual metadata is attribution only. The PNG specification defines `tEXt`,
`iTXt`, and `zTXt` as plain textual information, not interactive hyperlinks.
The clickable behavior must therefore come from the surrounding Markdown link.

## Minimum developer journey

```text
community post or repository card
  → understand the promise
  → open the canonical repository
  → copy the preview command
  → complete a successful dry run
  → decide whether to star, share, adopt, or contribute
```

The first credible value moment is the successful dry run, not an image click.
The image earns attention; the copyable command earns trust.

## Cheapest next probes

1. Generate one restrained tailorbird hybrid that preserves the current
   left-to-right build explanation.
2. At 32 px, compare an abstract woven-loop mark against a simplified bird head.
3. Show both the current technical card and the hybrid card without explanation;
   ask developers to describe what the tool does in one sentence.
4. Publish only the better-paraphrased card, with the canonical repository URL
   and no tracking redirect; inspect GitHub traffic referrers and local dry-run
   feedback during the release window.

## Sources

- [The Go Gopher](https://go.dev/blog/gopher)
- [Announcing Deno 2](https://deno.com/blog/v2.0)
- [Deno community artwork](https://deno.com/artwork)
- [Getting a Mascot for Dolt](https://www.dolthub.com/blog/2020-12-07-a-mascot-for-dolt/)
- [OpenClaw lore](https://docs.openclaw.ai/start/lore)
- [`uv` README](https://github.com/astral-sh/uv)
- [Show HN guidelines](https://news.ycombinator.com/showhn.html)
- [Community discussion: open-source mascots](https://www.reddit.com/r/ProgrammerHumor/comments/1db84v3/screwzodiakchooseyouropensourcemascot/)
- [Community discussion: LLVM logo redesign](https://www.reddit.com/r/programming/comments/oabtzs/i_redesigned_the_llvm_logo/)
- [GitHub social-preview guidance](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/customizing-your-repositorys-social-media-preview)
- [GitHub image and link syntax](https://docs.github.com/en/get-started/writing-on-github/getting-started-with-writing-and-formatting-on-github/basic-writing-and-formatting-syntax)
- [PNG textual-information specification](https://libpng.org/pub/png/spec/iso/index-object.html#11textinfo)
