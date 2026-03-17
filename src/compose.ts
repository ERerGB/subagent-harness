import type { RichAgentDocument, RuntimeTarget, ModelConfig } from "./types.js";

/**
 * Compose a rich agent document into a runtime-ready artifact.
 *
 * @param profile — Optional profile keyword to activate. When provided:
 *   - cursor/CC: merge the profile's model override into top-level model
 *   - production: emit a resolved single-profile JSON instead of full profiles
 */
export function composeSubagent(doc: RichAgentDocument, target: RuntimeTarget, profile?: string): string {
  switch (target) {
    case "cursor":
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

// ── Cursor adapter ───────────────────────────────────────────────

/** Cursor: minimal frontmatter — name + description + body. No model, no profiles. */
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

  const maxTurns = doc.frontmatter.config?.maxIdleTurns;
  if (maxTurns && maxTurns > 0) {
    lines.push(`maxTurns: ${maxTurns}`);
  }

  lines.push("---", "", doc.body.trim(), "");
  return lines.join("\n");
}

// ── Production adapter ───────────────────────────────────────────

function composeProductionJSON(doc: RichAgentDocument, profile?: string): string {
  const base: Record<string, unknown> = {
    name: doc.frontmatter.name,
    description: doc.frontmatter.description,
    archetype: doc.frontmatter.archetype,
    scenario: doc.frontmatter.scenario,
    adr: doc.frontmatter.adr,
  };

  if (profile) {
    // Resolved mode: emit a single active profile with merged model
    const resolved = resolveModel(doc, profile);
    base.model = resolved ?? "inherited";
    base.activeProfile = profile;
    const profileDef = doc.frontmatter.profiles?.profiles[profile];
    base.skills = profileDef?.skills ?? [];
  } else {
    // Full mode: emit all profiles for runtime dynamic selection
    base.model = doc.frontmatter.model ?? "inherited";
    if (doc.frontmatter.profiles) {
      base.profiles = doc.frontmatter.profiles;
    }
  }

  base.contentSchema = doc.frontmatter.contentSchema;
  base.config = doc.frontmatter.config;
  base.prompt = doc.body.trim();

  return JSON.stringify(base, null, 2) + "\n";
}
