# YAML Support

`subagent-harness` parses `.agent.md` frontmatter and `.agent.ext.yaml` sidecars
with the `yaml` package. The parser accepts standard YAML syntax, then normalizes
only the fields owned by the harness protocol.

## `.agent.md` frontmatter

The frontmatter root must be a YAML mapping. The harness reads these core fields:

| Field | Shape | Notes |
|-------|-------|-------|
| `schemaVersion` | scalar | Optional; normalized to string |
| `version` | scalar | Optional agent content version |
| `name` | scalar | Required; validated as lowercase kebab-case |
| `description` | scalar | Required |
| `model` | mapping | Optional; `name`, `temperature`, `maxTokens` |
| `profiles` | mapping | Optional; `default` plus profile mappings |
| `profiles.<name>.skills` | sequence or comma-separated string | Empty sequence is allowed |
| `profiles.<name>.model` | mapping | Optional model override |

Standard YAML features such as quoted scalars, folded/literal block scalars,
flow mappings, block sequences, comments, anchors, and aliases are supported by
the parser.

```yaml
---
schemaVersion: 1
name: yaml-agent
description: "Handles HTTP responses: 200, 404, 500"
model: { name: sonnet, temperature: 0.2, maxTokens: 1024 }
profiles:
  default: live
  live:
    skills: &coreSkills
      - fact-check
      - real-time-cite
  review:
    skills: *coreSkills
    model: { name: opus, temperature: 0.7 }
---
```

## `.agent.ext.yaml` sidecars

Sidecar files also use the `yaml` package. The root must be a YAML mapping; the
harness keeps the resulting object opaque and passes it through as `extensions`
or spreads it into production JSON for backward compatibility.

```yaml
contentSchema:
  quote: string
  context: string
config:
  confidence: { high: 0.85, medium: 0.65, low: 0.45 }
  maxIdleTurns: 5
```

## Protocol limits

The parser accepts YAML, but the harness protocol is still intentionally small:

| Feature | Status | Reason |
|---------|--------|--------|
| Unknown frontmatter keys | Ignored | Core frontmatter stays portable across runtimes |
| YAML merge key `<<` | Not interpreted as profile inheritance | Profile inheritance belongs in explicit model/skill resolution |
| Multi-document streams inside frontmatter | Not supported | `---` is reserved for Markdown frontmatter delimiters |
| Domain validation for sidecars | Consumer-owned | Use `validateRichAgent(doc, { extensionValidator })` |

When values contain colons or other YAML-significant characters, quote them:

```yaml
description: "Handles HTTP responses: 200, 404, 500"
```
