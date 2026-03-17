import type { RichAgentDocument, RichAgentFrontmatter } from "./types.js";

const FM = /^---\n([\s\S]*?)\n---\n?([\s\S]*)$/;

export function parseRichAgentMarkdown(sourcePath: string, content: string): RichAgentDocument {
  const match = content.match(FM);
  if (!match) {
    throw new Error(`Invalid frontmatter in ${sourcePath}`);
  }
  const [, yaml, body] = match;
  const frontmatter = parseYamlLike(yaml);
  return { sourcePath, frontmatter, body: body.trimStart() };
}

/**
 * Read a top-level scalar value from YAML lines.
 * Handles plain scalars, quoted scalars, and folded/literal block scalars (> / |).
 */
function readScalar(lines: string[], key: string): string {
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(new RegExp(`^${key}:\\s*(.*)`));
    if (!m) continue;

    const value = m[1].trim();

    // Folded (>) or literal (|) block scalar — collect indented continuation lines
    if (value === ">" || value === "|") {
      const parts: string[] = [];
      for (let j = i + 1; j < lines.length; j++) {
        if (/^\s+/.test(lines[j])) {
          parts.push(lines[j].trim());
        } else {
          break;
        }
      }
      return parts.join(value === ">" ? " " : "\n");
    }

    if (!value) throw new Error(`Missing value for key: ${key}`);
    return value.replace(/^"|"$/g, "");
  }
  throw new Error(`Missing required key: ${key}`);
}

function parseYamlLike(yaml: string): RichAgentFrontmatter {
  const lines = yaml.split("\n");

  const name = readScalar(lines, "name");
  const description = readScalar(lines, "description");
  const archetype = readScalar(lines, "archetype");
  const scenario = readScalar(lines, "scenario") as "meeting" | "creator";
  const adr = readScalar(lines, "adr");

  // v0: nested fields (contentSchema, config, skills) use defaults.
  // Full nested YAML parsing is deferred to v1 when production runtime needs it.
  return {
    name,
    description,
    archetype,
    scenario,
    adr,
    contentSchema: {},
    config: {
      confidence: { high: 0.8, medium: 0.6, low: 0.4 },
      prefetch: { level: "L1_FAST", maxConcurrent: 1, maxHitDistance: 2 },
      maxIdleTurns: 5
    },
    skills: { pre_yield: [], post_yield: [] }
  };
}

