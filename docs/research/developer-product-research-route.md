# Developer-product research route

Status: ready to sync into `product-research/references/` after the owning
repository's issue-lifecycle gate is available.

## When to select this route

Use this route when credible value is realized primarily through source code,
a package manager, a terminal, an API, or a repository rather than through a
browser product journey.

Typical surfaces include:

- CLIs and local developer tools;
- libraries, SDKs, and frameworks;
- middleware, protocols, runtimes, and infrastructure;
- open-source services with a self-hosted path;
- agent tools whose durable object is code, configuration, an artifact, or an
  execution trace.

For a hybrid product, trace the developer route and browser route separately,
then record the handoff between them. Do not treat a successful web signup as a
successful developer journey.

## Start with the developer decision

State which decision the research must improve:

- try or ignore;
- install or avoid;
- adopt for one project or standardize across a team;
- self-host or use a managed service;
- integrate, migrate, extend, contribute, or replace;
- trust a benchmark, compatibility claim, or security boundary.

Define the current substitute and switching cost. A tool can be attractive in
isolation while remaining non-viable inside an existing build, runtime, or
deployment system.

## Define the first credible value moment

The first credible value moment is the smallest local or remote execution that
proves the core promise in the user's real operating surface.

Examples of proof shapes:

- a CLI transforms a real input and emits the promised artifact;
- a library is imported into a minimal program and returns a valid result;
- middleware is placed between two real components and changes the observable
  system behavior;
- an SDK completes one authenticated request and exposes the expected object;
- an agent tool performs one bounded task and leaves an inspectable trace;
- a self-hosted service starts, passes a health check, and completes one core
  request.

An install, signup, dashboard view, star, or successful build is not sufficient
unless that event is itself the product's core promise.

## Build the coverage map

### Positioning and entry artifacts

Inspect the surfaces developers actually encounter:

- repository social preview and README first viewport;
- package registry page and install command;
- launch post, changelog, release notes, and examples;
- documentation quickstart and API reference;
- generated search result, community link preview, and copied code snippet.

Record whether a developer can answer within ten seconds:

1. What problem does this solve?
2. What does it replace or sit between?
3. What durable object or behavior does it create?
4. What command produces the first proof?
5. What boundary does the project explicitly not own?

### Install and supply-chain boundary

Capture:

- runtime, OS, architecture, package-manager, and version prerequisites;
- binary, source, container, package, and hosted install paths;
- network downloads, install scripts, elevated permissions, and code execution;
- lockfile and dependency effects;
- default telemetry, update behavior, and generated files;
- cleanup and rollback path.

Treat `curl | sh`, global installs, credential writes, daemon startup, Docker
socket access, and shell-profile mutation as trust boundaries. Inspect before
executing when possible. Use a disposable or isolated environment for probes
that can alter host state.

### Product and object model

Identify the smallest durable concepts that explain the tool:

```text
source or intent
  → configuration / API / command
  → build or execution boundary
  → artifact / service / trace
  → downstream consumer
  → observable outcome
```

Record provenance, version, schema, compatibility, and deletion or rollback
semantics for each durable artifact. Separate build-time, run-time, control-
plane, and data-plane responsibilities.

### Compatibility and ecosystem

Map claimed and observed support across:

- languages, runtimes, frameworks, editors, and operating systems;
- providers, APIs, protocols, and artifact formats;
- CI, deployment, observability, security, and package ecosystems;
- supported versions versus community workarounds;
- extension points and the boundary between core and project-specific logic.

Do not turn a logo grid into compatibility evidence. Look for a documented
contract, test matrix, example, release note, or reproducible probe.

## Trace the minimum developer journey

Use the shortest route from a public entry artifact to first credible value:

| Stage | Evidence to capture |
|---|---|
| Discover | Exact entry surface, preview image, claim, referrer, and version/date |
| Understand | Problem, substitute, boundary, and expected result inferred by a new reader |
| Evaluate trust | License, maintenance, security posture, install effects, and evidence quality |
| Install or invoke | Exact command, prerequisites, duration, mutations, warnings, and recovery |
| Configure | Minimum required file, secret, flag, or API object and its provenance |
| Execute | Real input, observable transition, logs, exit status, and retained artifacts |
| Verify value | Expected versus actual output and the proof that the core promise occurred |
| Integrate | Change required in an existing project and the downstream compatibility surface |
| Return | Upgrade, debug, uninstall, share, star, file an issue, or contribute |

Record cold-start and repeat-run behavior separately. Idempotence, caching, and
incremental behavior often determine whether a developer tool remains useful
after the demo.

## Evaluate proof and benchmark claims

For performance, quality, cost, or compatibility claims, capture:

- tool and competitor versions;
- hardware, operating system, runtime, and dependency versions;
- dataset or fixture and how it was selected;
- warm versus cold state, cache state, concurrency, and repetitions;
- command or harness used to reproduce the result;
- variance, failure cases, and excluded scenarios;
- whether the benchmark measures the product or only one internal component.

Label unreproducible benchmark graphics as **Product claim**, not Observed.
A visually persuasive chart is not stronger evidence than its methodology.

## Research developer-facing visual distribution

Treat visual assets as part of the entry journey, not decoration.

### Separate the asset jobs

| Asset | Primary job | Test |
|---|---|---|
| Mark or icon | Recognition at tiny sizes | Distinct at 16–32 px and in one color |
| Mascot or character | Memory, personality, and community remixing | Supports several situations without losing identity |
| Proof visual | Explain architecture, workflow, output, or performance | A developer accurately paraphrases the product after a short scan |
| Demo media | Show interaction and result | Viewer can identify the triggering action and outcome |
| Social card | Survive link previews and reposts | Readable when cropped and still attributable to the canonical source |

Check:

- small-size silhouette and light/dark backgrounds;
- palette restraint and text legibility;
- whether the metaphor maps to the actual product mechanic;
- whether the asset can be cropped, remixed, stickered, or animated;
- collision with neighboring developer-product identities;
- repository attribution after the asset leaves the README;
- a single canonical click destination;
- a copyable embed or command adjacent to the asset.

Do not infer adoption from polish. Pair the image with a runnable proof and
compare whether readers can explain the product, not merely whether they like
the artwork.

## Collect historical and community evidence

Look for:

- launch README and launch-post changes, not only the mature current surface;
- naming, mascot, icon, and positioning iterations;
- copied snippets, third-party tutorials, stickers, memes, and community art;
- migration stories, compatibility gaps, and support workarounds;
- issue patterns around install, upgrade, trust, and integration;
- maintainer response to confusion or misuse;
- signs that community language has adopted the project's own objects and
  metaphors.

Stars, forks, downloads, package dependents, and social reactions are
directional signals. Preserve time windows and selection bias; do not use them
as causal proof of product value or visual effectiveness.

## Direct-probe safety

Before running a tool, record:

- machine, OS, architecture, shell, runtime, and package-manager versions;
- repository state and whether the environment is disposable;
- network, credential, filesystem, process, container, and port effects;
- the command that marks the external-effect boundary.

Stop before publishing a package, pushing code, deploying, creating paid
resources, sending data, installing privileged services, or authorizing an
integration unless the user explicitly authorized that consequence.

Retain logs and generated artifacts only when they are needed as evidence.
Report every mutation that remains.

## Decision handoff

End with:

- one-sentence product model;
- first credible value moment and exact proof command;
- minimum developer journey and material gates;
- strongest observed evidence and strongest counter-signal;
- trust, compatibility, and supply-chain boundaries;
- visual-distribution implications when entry media was in scope;
- explicit **Borrow**, **Adapt**, **Reject**, and **Defer** calls;
- consequential unknowns and the cheapest reproducible next probe.

Stop when another repository, issue thread, benchmark, or execution is unlikely
to change the adoption decision. Do not stop at feature coverage or a successful
installation.
