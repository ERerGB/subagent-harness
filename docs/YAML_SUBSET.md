# Supported YAML Subset

`subagent-harness` uses a **purpose-built YAML parser** (zero dependencies) optimized for
`.agent.md` frontmatter and `.agent.ext.yaml` sidecar files. It intentionally supports only
the YAML features needed by the agent definition format.

## Supported Features

| Feature | Syntax | Example |
|---------|--------|---------|
| Scalar key-value | `key: value` | `name: my-agent` |
| Quoted strings | `key: "value"` | `description: "A cool agent"` |
| Folded block scalar | `key: >` | Multi-line → single line (spaces) |
| Literal block scalar | `key: \|` | Multi-line → preserved newlines |
| Nested block (1 level) | `parent:` + indented children | `model:` / `  name: sonnet` |
| Multi-level nesting | Up to 3 levels | `profiles:` / `  live:` / `    skills: [...]` |
| Inline arrays | `[a, b, c]` | `skills: [fact-check, cite]` |
| Comments | `# comment` | Skipped in `.ext.yaml` parsing |

## Unsupported Features

These standard YAML features are **not supported** and will be silently ignored or cause
parse errors:

| Feature | Syntax | Reason |
|---------|--------|--------|
| Anchors & aliases | `&anchor` / `*anchor` | No reuse pattern in agent definitions |
| Multi-document streams | `---` / `...` as doc separators | `---` is reserved for frontmatter delimiters |
| Merge keys | `<<: *base` | Not needed; profiles handle overrides |
| Type tags | `!!str`, `!!int` | Values are coerced by the parser |
| Flow mappings | `{key: value}` | Use block style instead |
| Block sequences | `- item` | Use inline array `[a, b]` syntax |
| Complex keys | `? key` | Not applicable |
| Deeply nested blocks (>3 levels) | — | Flatten structure or use extensions |

## Colons in Values

Unquoted values containing colons (`:`) may cause incorrect parsing.
When a value contains a colon, wrap it in double quotes:

```yaml
# Safe
description: "Handles HTTP responses: 200, 404, 500"

# Risky — may split at the first colon
description: Handles HTTP responses: 200, 404, 500
```

## Design Rationale

The hand-rolled parser keeps `subagent-harness` at **zero runtime dependencies**.
Agent definitions are a controlled format — the parser covers exactly the features
the format requires. For consumers needing full YAML spec compliance, we recommend
pre-processing files with a standard YAML library (`yaml` package) before passing
parsed content to the harness API.
