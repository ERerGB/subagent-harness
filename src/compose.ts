import type { RichAgentDocument, RuntimeTarget } from "./types.js";

/**
 * Compose a rich agent document into a runtime-ready artifact.
 *
 * Each runtime target gets a dedicated adapter:
 *   - cursor:      .md with minimal frontmatter (name + description)
 *   - claude-code: .md with CC-specific optional fields (maxTurns, model)
 *   - production:  .json with full frontmatter + body for programmatic consumption
 */
export function composeSubagent(doc: RichAgentDocument, target: RuntimeTarget): string {
  switch (target) {
    case "cursor":
      return composeCursorMarkdown(doc);
    case "claude-code":
      return composeClaudeCodeMarkdown(doc);
    case "production":
      return composeProductionJSON(doc);
    default: {
      const _exhaustive: never = target;
      throw new Error(`Unsupported target: ${_exhaustive}`);
    }
  }
}

/** Cursor: minimal frontmatter — name + description + body. */
function composeCursorMarkdown(doc: RichAgentDocument): string {
  return [
    "---",
    `name: ${doc.frontmatter.name}`,
    `description: ${doc.frontmatter.description}`,
    "---",
    "",
    doc.body.trim(),
    ""
  ].join("\n");
}

/**
 * Claude Code: CC supports optional frontmatter beyond name/description.
 * Map what we can from the rich source:
 *   - maxIdleTurns → maxTurns (closest semantic match)
 * Fields we intentionally skip:
 *   - skills: CC skills are file references, not runtime capability names
 *   - tools: would need per-agent tool ACL design
 *   - model: defaults to inherit, which is correct for subagents
 */
function composeClaudeCodeMarkdown(doc: RichAgentDocument): string {
  const lines = [
    "---",
    `name: ${doc.frontmatter.name}`,
    `description: ${doc.frontmatter.description}`,
  ];

  const maxTurns = doc.frontmatter.config?.maxIdleTurns;
  if (maxTurns && maxTurns > 0) {
    lines.push(`maxTurns: ${maxTurns}`);
  }

  lines.push("---", "", doc.body.trim(), "");
  return lines.join("\n");
}

/**
 * Production: JSON with the full parsed document.
 * Consumers can JSON.parse() to get frontmatter + body without re-parsing YAML.
 */
function composeProductionJSON(doc: RichAgentDocument): string {
  return JSON.stringify({
    name: doc.frontmatter.name,
    description: doc.frontmatter.description,
    archetype: doc.frontmatter.archetype,
    scenario: doc.frontmatter.scenario,
    adr: doc.frontmatter.adr,
    contentSchema: doc.frontmatter.contentSchema,
    config: doc.frontmatter.config,
    skills: doc.frontmatter.skills,
    prompt: doc.body.trim(),
  }, null, 2) + "\n";
}

