import { stringify } from "yaml";
import type { RichAgentDocument } from "./types.js";

/** Serialize protocol fields with YAML types and nested values preserved. */
export function serializeAgent(doc: RichAgentDocument): string {
  const { profiles, ...core } = doc.frontmatter;
  const frontmatter = profiles
    ? { ...core, profiles: { default: profiles.default, ...profiles.profiles } }
    : core;
  return `---\n${stringify(frontmatter)}---\n\n${doc.body.trim()}\n`;
}

export function serializeExtensions(extensions: Record<string, unknown>): string {
  return Object.keys(extensions).length ? stringify(extensions) : "";
}
