import type { RichAgentDocument, RuntimeTarget } from "./types.js";

export function composeSubagent(doc: RichAgentDocument, target: RuntimeTarget): string {
  if (target !== "cursor") {
    throw new Error(`Unsupported target: ${target}`);
  }
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

