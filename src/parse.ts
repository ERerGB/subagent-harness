import type { RichAgentDocument, RichAgentFrontmatter, ModelConfig, ProfilesConfig, AgentProfile } from "./types.js";

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

// ── Scalar readers ───────────────────────────────────────────────

/**
 * Read a top-level scalar value from YAML lines.
 * Handles plain scalars, quoted scalars, and folded/literal block scalars (> / |).
 */
function readScalar(lines: string[], key: string): string {
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(new RegExp(`^${key}:\\s*(.*)`));
    if (!m) continue;

    const value = m[1].trim();

    // Folded (>) or literal (|) block scalar
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

function readOptionalScalar(lines: string[], key: string): string | undefined {
  try {
    return readScalar(lines, key);
  } catch {
    return undefined;
  }
}

// ── Nested block reader ──────────────────────────────────────────

/**
 * Parse a shallow nested YAML block. Returns key-value pairs for
 * immediate children at the given indent level.
 */
function readNestedBlock(lines: string[], key: string): Record<string, string> | undefined {
  let blockStart = -1;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].match(new RegExp(`^${key}:\\s*$`))) {
      blockStart = i + 1;
      break;
    }
  }
  if (blockStart < 0) return undefined;

  const result: Record<string, string> = {};
  for (let j = blockStart; j < lines.length; j++) {
    const child = lines[j].match(/^\s+(\w+):\s*(.*)/);
    if (!child) break;
    result[child[1]] = child[2].trim();
  }

  return Object.keys(result).length > 0 ? result : undefined;
}

// ── Model config parser ──────────────────────────────────────────

function buildModelFromBlock(block: Record<string, string>): ModelConfig {
  const config: ModelConfig = { name: block["name"] ?? "" };
  if (block["temperature"] !== undefined) {
    config.temperature = parseFloat(block["temperature"]);
  }
  if (block["maxTokens"] !== undefined) {
    config.maxTokens = parseInt(block["maxTokens"], 10);
  }
  return config;
}

function parseModelConfig(lines: string[]): ModelConfig | undefined {
  const block = readNestedBlock(lines, "model");
  if (!block) return undefined;
  return buildModelFromBlock(block);
}

// ── Inline array parser ──────────────────────────────────────────

/** Parse `[item1, item2, item3]` into string array. */
function parseInlineArray(value: string): string[] {
  const inner = value.replace(/^\[/, "").replace(/\]$/, "").trim();
  if (!inner) return [];
  return inner.split(",").map(s => s.trim()).filter(Boolean);
}

// ── Profiles parser ──────────────────────────────────────────────

/**
 * Parse the profiles block. Structure:
 *
 *   profiles:
 *     default: live
 *     live:
 *       skills: [fact-check, real-time-cite]
 *     review:
 *       skills: [deep-analysis, citation-gen]
 *       model:
 *         name: opus
 *         temperature: 0.7
 */
function parseProfiles(lines: string[]): ProfilesConfig | undefined {
  // Find the `profiles:` top-level block
  let blockStart = -1;
  for (let i = 0; i < lines.length; i++) {
    if (/^profiles:\s*$/.test(lines[i])) {
      blockStart = i + 1;
      break;
    }
  }
  if (blockStart < 0) return undefined;

  // Detect the indent of the first child (should be 2 spaces)
  const childIndentMatch = lines[blockStart]?.match(/^(\s+)/);
  if (!childIndentMatch) return undefined;
  const childIndent = childIndentMatch[1].length;

  let defaultProfile: string | undefined;
  const profiles: Record<string, AgentProfile> = {};

  let i = blockStart;
  while (i < lines.length) {
    const line = lines[i];

    // Stop if we hit a line at top-level indent (not indented or less indented)
    if (!/^\s/.test(line)) break;

    // Match child-level keys (e.g., `  default: live` or `  live:`)
    const childMatch = line.match(new RegExp(`^\\s{${childIndent}}(\\w[\\w-]*):\\s*(.*)`));
    if (!childMatch) break;

    const key = childMatch[1];
    const value = childMatch[2].trim();

    if (key === "default") {
      defaultProfile = value;
      i++;
      continue;
    }

    // This is a profile name. Parse its children.
    const profile = parseProfileBody(lines, i + 1, childIndent);
    profiles[key] = profile;
    i = profile._endLine;
  }

  if (Object.keys(profiles).length === 0) return undefined;

  return { default: defaultProfile, profiles };
}

interface ProfileParseResult extends AgentProfile {
  _endLine: number;
}

/** Parse the body of a single profile (skills + optional model). */
function parseProfileBody(lines: string[], start: number, parentIndent: number): ProfileParseResult {
  const subIndent = parentIndent + 2;
  let skills: string[] = [];
  let model: Partial<ModelConfig> | undefined;
  let i = start;

  while (i < lines.length) {
    const line = lines[i];

    // Must be indented deeper than parent
    const indentMatch = line.match(/^(\s+)/);
    if (!indentMatch || indentMatch[1].length < subIndent) break;

    const subMatch = line.match(new RegExp(`^\\s{${subIndent}}(\\w+):\\s*(.*)`));
    if (!subMatch) break;

    const key = subMatch[1];
    const value = subMatch[2].trim();

    if (key === "skills") {
      skills = parseInlineArray(value);
      i++;
    } else if (key === "model") {
      // Parse nested model block
      const modelBlock = parseSubModelBlock(lines, i + 1, subIndent);
      model = modelBlock.config;
      i = modelBlock.endLine;
    } else {
      i++;
    }
  }

  return { skills, model, _endLine: i };
}

function parseSubModelBlock(lines: string[], start: number, parentIndent: number): { config: Partial<ModelConfig>; endLine: number } {
  const subIndent = parentIndent + 2;
  const block: Record<string, string> = {};
  let i = start;

  while (i < lines.length) {
    const line = lines[i];
    const indentMatch = line.match(/^(\s+)/);
    if (!indentMatch || indentMatch[1].length < subIndent) break;

    const m = line.match(new RegExp(`^\\s{${subIndent}}(\\w+):\\s*(.*)`));
    if (!m) break;

    block[m[1]] = m[2].trim();
    i++;
  }

  const config: Partial<ModelConfig> = {};
  if (block["name"]) config.name = block["name"];
  if (block["temperature"] !== undefined) config.temperature = parseFloat(block["temperature"]);
  if (block["maxTokens"] !== undefined) config.maxTokens = parseInt(block["maxTokens"], 10);

  return { config: Object.keys(config).length > 0 ? config : undefined as unknown as Partial<ModelConfig>, endLine: i };
}

// ── Main parser ──────────────────────────────────────────────────

function parseYamlLike(yaml: string): RichAgentFrontmatter {
  const lines = yaml.split("\n");

  const name = readScalar(lines, "name");
  const description = readScalar(lines, "description");
  const archetype = readOptionalScalar(lines, "archetype") ?? "";
  const scenario = readScalar(lines, "scenario") as "meeting" | "creator";
  const adr = readOptionalScalar(lines, "adr") ?? "";

  const model = parseModelConfig(lines);
  const profiles = parseProfiles(lines);

  return {
    name,
    description,
    archetype,
    scenario,
    adr,
    model,
    profiles,
    contentSchema: {},
    config: {
      confidence: { high: 0.8, medium: 0.6, low: 0.4 },
      prefetch: { level: "L1_FAST", maxConcurrent: 1, maxHitDistance: 2 },
      maxIdleTurns: 5
    },
  };
}
