import type { RichAgentDocument, RichAgentFrontmatter } from "./types.js";

const FM = /^---\n([\s\S]*?)\n---\n?([\s\S]*)$/;

// Minimal parser for controlled .agent.md format.
export function parseRichAgentMarkdown(sourcePath: string, content: string): RichAgentDocument {
  const match = content.match(FM);
  if (!match) {
    throw new Error(`Invalid frontmatter in ${sourcePath}`);
  }
  const [, yaml, body] = match;
  const frontmatter = parseYamlLike(yaml);
  return { sourcePath, frontmatter, body: body.trimStart() };
}

function parseYamlLike(yaml: string): RichAgentFrontmatter {
  // Intentionally strict + small for v0; callers should keep source schema stable.
  const read = (key: string): string => {
    const m = yaml.match(new RegExp(`^${key}:\\s*(.+)$`, "m"));
    if (!m) throw new Error(`Missing required key: ${key}`);
    return m[1].trim().replace(/^"|"$/g, "");
  };
  const name = read("name");
  const description = read("description");
  const archetype = read("archetype");
  const scenario = read("scenario") as "meeting" | "creator";
  const adr = read("adr");
  // v0 parser keeps nested fields as defaults; full nested parsing handled in next iteration.
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

