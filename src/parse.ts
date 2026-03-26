import { readFileSync, existsSync } from "node:fs";
import { parse as parseYamlDocument } from "yaml";
import type { RichAgentDocument, RichAgentFrontmatter, ModelConfig, ProfilesConfig, AgentProfile } from "./types.js";

const FM = /^---\n([\s\S]*?)\n---\n?([\s\S]*)$/;

/**
 * Parse a `.agent.md` string into a RichAgentDocument (pure function).
 * Only extracts core protocol fields (name, description, model, profiles).
 * Extensions default to empty — use loadAgentFromDisk() for sidecar merge.
 */
export function parseRichAgentMarkdown(sourcePath: string, content: string): RichAgentDocument {
  const match = content.match(FM);
  if (!match) {
    throw new Error(`Invalid frontmatter in ${sourcePath}`);
  }
  const [, yaml, body] = match;
  const frontmatter = parseYamlLike(yaml);
  return { sourcePath, frontmatter, body: body.trimStart(), extensions: {} };
}

/**
 * Parse a `.agent.ext.yaml` string into an extensions record.
 * Uses the `yaml` package so flow mappings, deep nesting, and typed scalars match the YAML spec.
 */
export function parseExtensionsYaml(content: string): Record<string, unknown> {
  const trimmed = content.trim();
  if (!trimmed) {
    return {};
  }

  let parsed: unknown;
  try {
    parsed = parseYamlDocument(trimmed);
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : String(cause);
    throw new Error(`Failed to parse .agent.ext.yaml: ${message}`, { cause });
  }

  if (parsed === null || parsed === undefined) {
    return {};
  }
  if (typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error(".agent.ext.yaml root must be a YAML mapping (object), not an array or scalar");
  }

  return parsed as Record<string, unknown>;
}

/**
 * Load an agent from disk, merging the core .agent.md with its
 * optional sidecar .agent.ext.yaml.
 */
export function loadAgentFromDisk(mdPath: string): RichAgentDocument {
  const content = readFileSync(mdPath, "utf8");
  const doc = parseRichAgentMarkdown(mdPath, content);

  const extPath = mdPath.replace(/\.agent\.md$/, ".agent.ext.yaml");
  if (existsSync(extPath)) {
    const extContent = readFileSync(extPath, "utf8");
    doc.extensions = parseExtensionsYaml(extContent);
  }

  return doc;
}

// ── Scalar readers ───────────────────────────────────────────────

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

function parseInlineArray(value: string): string[] {
  const inner = value.replace(/^\[/, "").replace(/\]$/, "").trim();
  if (!inner) return [];
  return inner.split(",").map(s => s.trim()).filter(Boolean);
}

// ── Profiles parser ──────────────────────────────────────────────

function parseProfiles(lines: string[]): ProfilesConfig | undefined {
  let blockStart = -1;
  for (let i = 0; i < lines.length; i++) {
    if (/^profiles:\s*$/.test(lines[i])) {
      blockStart = i + 1;
      break;
    }
  }
  if (blockStart < 0) return undefined;

  const childIndentMatch = lines[blockStart]?.match(/^(\s+)/);
  if (!childIndentMatch) return undefined;
  const childIndent = childIndentMatch[1].length;

  let defaultProfile: string | undefined;
  const profiles: Record<string, AgentProfile> = {};

  let i = blockStart;
  while (i < lines.length) {
    const line = lines[i];
    if (!/^\s/.test(line)) break;

    const childMatch = line.match(new RegExp(`^\\s{${childIndent}}(\\w[\\w-]*):\\s*(.*)`));
    if (!childMatch) break;

    const key = childMatch[1];
    const value = childMatch[2].trim();

    if (key === "default") {
      defaultProfile = value;
      i++;
      continue;
    }

    const { _endLine, ...profile } = parseProfileBody(lines, i + 1, childIndent);
    profiles[key] = profile;
    i = _endLine;
  }

  if (Object.keys(profiles).length === 0) return undefined;

  return { default: defaultProfile, profiles };
}

interface ProfileParseResult extends AgentProfile {
  _endLine: number;
}

function parseProfileBody(lines: string[], start: number, parentIndent: number): ProfileParseResult {
  const subIndent = parentIndent + 2;
  let skills: string[] = [];
  let model: Partial<ModelConfig> | undefined;
  let i = start;

  while (i < lines.length) {
    const line = lines[i];
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

// ── Main parser (core fields only) ───────────────────────────────

function parseYamlLike(yaml: string): RichAgentFrontmatter {
  const lines = yaml.split("\n");

  const schemaVersion = readOptionalScalar(lines, "schemaVersion");
  const version = readOptionalScalar(lines, "version");
  const name = readScalar(lines, "name");
  const description = readScalar(lines, "description");
  const model = parseModelConfig(lines);
  const profiles = parseProfiles(lines);

  const fm: RichAgentFrontmatter = { name, description, model, profiles };
  if (schemaVersion !== undefined) fm.schemaVersion = schemaVersion;
  if (version !== undefined) fm.version = version;
  return fm;
}
