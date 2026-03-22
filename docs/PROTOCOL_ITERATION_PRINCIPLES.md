# Protocol Iteration Principles

This repository iterates protocol design with a strict lean-first approach.

## Core Principles

1. Keep the core protocol minimal.
2. Promote fields to core only with repeated evidence across projects.
3. Keep `.agent.md` as the single source of runtime protocol truth.
4. Use `.agent.ext.yaml` only for project-specific extensions.
5. Treat each imported project as a protocol stress test, not just content ingestion.

## Core vs Extension Boundary

### `.agent.md` (core protocol)

Core fields are cross-project, runtime-relevant, and validation-worthy:

- `schemaVersion`
- `version` (optional, content/runtime version)
- `name`
- `description`
- `model`
- `profiles`
- prompt body

### `.agent.ext.yaml` (project extension)

Extension fields are project-based and not guaranteed to generalize:

- project-specific knobs
- downstream custom metadata
- temporary migration flags

If a field appears in multiple independent projects and affects compose/validate/run semantics, it becomes a promotion candidate for core.

## Promotion Rule (Rule of Three)

A field is promoted to core only when all conditions are true:

1. It appears in at least three independent project imports.
2. It affects runtime behavior or testable contract semantics.
3. It remains stable across at least two iteration cycles.

## Iteration Loop

1. Import one external project into `.agent.md` + `.agent.ext.yaml`.
2. Run L1/L2/L3 and matrix probes.
3. Collect recurring field patterns.
4. Promote only proven fields.
5. Repeat with the next project.

## Current Decision

- `version` is now an optional core field in `.agent.md`.
- The repository continues to keep the core protocol lean while expanding structured imports.
