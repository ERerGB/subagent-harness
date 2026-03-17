import type { RichAgentDocument, RichAgentFrontmatter, ModelConfig } from "./types.js";

export interface PatchOp {
  path: string;
  value: unknown;
}

/**
 * Apply a single-field mutation to a RichAgentDocument.
 * Returns a new document — the original is never mutated.
 *
 * Supported paths:
 *   - "name", "description"       → frontmatter scalars
 *   - "model.name", "model.temperature", "model.maxTokens" → model config
 *   - "body"                       → prompt body
 *   - "extensions.<key>"           → extension fields
 */
export function patchAgent(doc: RichAgentDocument, op: PatchOp): RichAgentDocument {
  const [head, ...rest] = op.path.split(".");

  switch (head) {
    case "name":
    case "description":
      return patchFrontmatterScalar(doc, head, op.value as string);

    case "model":
      return patchModel(doc, rest, op.value);

    case "body":
      return { ...doc, body: op.value as string };

    case "extensions":
      return patchExtensions(doc, rest[0], op.value);

    default:
      throw new Error(`unsupported patch path: "${op.path}"`);
  }
}

function patchFrontmatterScalar(doc: RichAgentDocument, key: keyof RichAgentFrontmatter, value: string): RichAgentDocument {
  return {
    ...doc,
    frontmatter: { ...doc.frontmatter, [key]: value },
  };
}

function patchModel(doc: RichAgentDocument, subPath: string[], value: unknown): RichAgentDocument {
  const existing: ModelConfig = doc.frontmatter.model
    ? { ...doc.frontmatter.model }
    : { name: "" };

  if (subPath.length === 0) {
    return {
      ...doc,
      frontmatter: { ...doc.frontmatter, model: value as ModelConfig },
    };
  }

  const field = subPath[0] as keyof ModelConfig;
  (existing as unknown as Record<string, unknown>)[field] = value;

  return {
    ...doc,
    frontmatter: { ...doc.frontmatter, model: existing },
  };
}

function patchExtensions(doc: RichAgentDocument, key: string, value: unknown): RichAgentDocument {
  return {
    ...doc,
    extensions: { ...doc.extensions, [key]: value },
  };
}
