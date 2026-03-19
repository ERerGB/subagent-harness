import type { RichAgentDocument, ModelConfig, ProfilesConfig } from "./types.js";

/**
 * Serialize a RichAgentDocument back to `.agent.md` format.
 * Only emits core protocol fields — extensions are excluded.
 */
export function serializeAgent(doc: RichAgentDocument): string {
  const lines: string[] = ["---"];

  if (doc.frontmatter.schemaVersion) {
    lines.push(`schemaVersion: "${doc.frontmatter.schemaVersion}"`);
  }
  lines.push(`name: ${doc.frontmatter.name}`);
  lines.push(`description: ${doc.frontmatter.description}`);

  if (doc.frontmatter.model) {
    serializeModelBlock(doc.frontmatter.model, lines, 0);
  }

  if (doc.frontmatter.profiles) {
    serializeProfilesBlock(doc.frontmatter.profiles, lines);
  }

  lines.push("---");
  lines.push("");
  lines.push(doc.body.trim());
  lines.push("");

  return lines.join("\n");
}

/**
 * Serialize an extensions record to `.agent.ext.yaml` format.
 */
export function serializeExtensions(extensions: Record<string, unknown>): string {
  const keys = Object.keys(extensions);
  if (keys.length === 0) return "";

  const lines: string[] = [];

  for (const key of keys) {
    const value = extensions[key];
    if (value !== null && typeof value === "object" && !Array.isArray(value)) {
      lines.push(`${key}:`);
      for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
        lines.push(`  ${k}: ${v}`);
      }
    } else {
      lines.push(`${key}: ${value}`);
    }
  }

  lines.push("");
  return lines.join("\n");
}

// ── Internal helpers ─────────────────────────────────────────────

function serializeModelBlock(model: Partial<ModelConfig>, lines: string[], indent: number): void {
  const pad = " ".repeat(indent);
  lines.push(`${pad}model:`);
  const inner = " ".repeat(indent + 2);
  if (model.name !== undefined) lines.push(`${inner}name: ${model.name}`);
  if (model.temperature !== undefined) lines.push(`${inner}temperature: ${model.temperature}`);
  if (model.maxTokens !== undefined) lines.push(`${inner}maxTokens: ${model.maxTokens}`);
}

function serializeProfilesBlock(profiles: ProfilesConfig, lines: string[]): void {
  lines.push("profiles:");
  if (profiles.default) {
    lines.push(`  default: ${profiles.default}`);
  }

  for (const [name, profile] of Object.entries(profiles.profiles)) {
    lines.push(`  ${name}:`);
    if (profile.skills.length > 0) {
      lines.push(`    skills: [${profile.skills.join(", ")}]`);
    }
    if (profile.model) {
      serializeModelBlock(profile.model as ModelConfig, lines, 4);
    }
  }
}
