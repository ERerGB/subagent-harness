import type { RichAgentDocument, RuntimeTarget, ModelConfig, AgentDefinition } from "./types.js";

/**
 * Compose a rich agent document into a runtime-ready artifact.
 *
 * @param profile — Optional profile keyword to activate. When provided:
 *   - claude-code: merge the profile's model override into top-level model
 *   - production: emit a resolved single-profile JSON instead of full profiles
 *   - cursor / codex: profile is ignored (minimal markdown has no model slot)
 */
export function composeSubagent(doc: RichAgentDocument, target: RuntimeTarget, profile?: string): string {
  switch (target) {
    case "cursor":
    case "codex":
      // Codex CLI consumes the same name/description/body frontmatter shape as Cursor agents.
      return composeCursorMarkdown(doc);
    case "claude-code":
      return composeClaudeCodeMarkdown(doc, profile);
    case "production":
      return composeProductionJSON(doc, profile);
    default: {
      const _exhaustive: never = target;
      throw new Error(`Unsupported target: ${_exhaustive}`);
    }
  }
}

/** Resolve the effective model config by merging top-level default with profile override. */
export function resolveModel(doc: RichAgentDocument, profileName?: string): ModelConfig | undefined {
  const base = doc.frontmatter.model;
  if (!profileName) return base;

  const profileDef = doc.frontmatter.profiles?.profiles[profileName];
  if (!profileDef?.model) return base;

  // Shallow merge: profile overrides win, base fills gaps
  return { ...base, ...profileDef.model } as ModelConfig;
}

// ── Cursor / Codex adapter (minimal markdown) ───────────────────

/** Minimal frontmatter — name + description + body. No model, no profiles. */
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

// ── Claude Code adapter ──────────────────────────────────────────

function composeClaudeCodeMarkdown(doc: RichAgentDocument, profile?: string): string {
  const lines = [
    "---",
    `name: ${doc.frontmatter.name}`,
    `description: ${doc.frontmatter.description}`,
  ];

  const model = resolveModel(doc, profile);
  lines.push(`model: ${model?.name ?? "inherited"}`);

  // maxTurns comes from extensions (consumer-specific)
  const maxTurns = doc.extensions?.["maxIdleTurns"] ?? doc.extensions?.["config"]?.["maxIdleTurns" as never];
  if (maxTurns && Number(maxTurns) > 0) {
    lines.push(`maxTurns: ${maxTurns}`);
  }

  lines.push("---", "", doc.body.trim(), "");
  return lines.join("\n");
}

// ── Production adapter ───────────────────────────────────────────

/**
 * Return a fully-resolved, typed `AgentDefinition` from a rich agent document.
 *
 * This is the public API boundary: the harness owns "what an agent IS"
 * (identity, prompt, model, skills). Consumer projects own "what an agent DOES"
 * via the opaque `extensions` bag.
 *
 * @param doc    - Parsed rich agent document.
 * @param profile - Optional profile keyword. When set, resolves model override
 *                  and skill list from that profile; `activeProfile` is included.
 */
export function loadAgent(doc: RichAgentDocument, profile?: string): AgentDefinition {
  const skills: string[] = profile
    ? (doc.frontmatter.profiles?.profiles[profile]?.skills ?? [])
    : [];

  const model: ModelConfig | "inherited" = profile
    ? (resolveModel(doc, profile) ?? "inherited")
    : (doc.frontmatter.model ?? "inherited");

  const def: AgentDefinition = {
    name: doc.frontmatter.name,
    description: doc.frontmatter.description,
    model,
    skills,
    prompt: doc.body.trim(),
    extensions: { ...doc.extensions },
  };

  if (doc.frontmatter.version) {
    def.version = doc.frontmatter.version;
  }

  if (profile) {
    def.activeProfile = profile;
  }

  return def;
}

function composeProductionJSON(doc: RichAgentDocument, profile?: string): string {
  const def = loadAgent(doc, profile);

  // Build the JSON root: start with the AgentDefinition fields, then spread
  // extensions at the top level for backwards compatibility (consumers rely on
  // e.g. `archetype`, `contentSchema` at root rather than under `extensions`).
  const root: Record<string, unknown> = {};

  root["name"] = def.name;
  root["description"] = def.description;

  if (def.version !== undefined) {
    root["version"] = def.version;
  }

  // Spread opaque extensions at root level (consumer-defined fields).
  for (const [key, value] of Object.entries(def.extensions)) {
    root[key] = value;
  }

  root["model"] = def.model;

  if (def.activeProfile !== undefined) {
    root["activeProfile"] = def.activeProfile;
  } else if (doc.frontmatter.profiles) {
    // No profile requested: include full profiles block for runtime selection.
    root["profiles"] = doc.frontmatter.profiles;
  }

  root["skills"] = def.skills;
  root["prompt"] = def.prompt;

  return JSON.stringify(root, null, 2) + "\n";
}
