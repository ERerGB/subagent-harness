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

// ── Frontmatter parser (core fields only) ────────────────────────

type YamlMapping = Record<string, unknown>;

function parseYamlLike(yaml: string): RichAgentFrontmatter {
  const root = parseYamlMapping(yaml, "frontmatter");

  const fm: RichAgentFrontmatter = {
    name: readRequiredString(root, "name"),
    description: readRequiredString(root, "description"),
  };

  const schemaVersion = readOptionalString(root, "schemaVersion");
  if (schemaVersion !== undefined) fm.schemaVersion = schemaVersion;

  const version = readOptionalString(root, "version");
  if (version !== undefined) fm.version = version;

  const model = parseModelConfig(root["model"], "model");
  if (model !== undefined) fm.model = model;

  const profiles = parseProfiles(root["profiles"], "profiles");
  if (profiles !== undefined) fm.profiles = profiles;

  return fm;
}

function parseYamlMapping(yaml: string, path: string): YamlMapping {
  let parsed: unknown;
  try {
    parsed = parseYamlDocument(yaml);
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : String(cause);
    throw new Error(`Failed to parse .agent.md frontmatter: ${message}`, { cause });
  }

  return asMapping(parsed, path);
}

function asMapping(value: unknown, path: string): YamlMapping {
  if (value !== null && typeof value === "object" && !Array.isArray(value)) {
    return value as YamlMapping;
  }
  throw new Error(`${path} must be a YAML mapping (object), not an array or scalar`);
}

function readRequiredString(map: YamlMapping, key: string): string {
  if (!Object.prototype.hasOwnProperty.call(map, key)) {
    throw new Error(`Missing required key: ${key}`);
  }
  return scalarToString(map[key], key);
}

function readOptionalString(map: YamlMapping, key: string): string | undefined {
  if (!Object.prototype.hasOwnProperty.call(map, key) || map[key] === undefined) {
    return undefined;
  }
  return scalarToString(map[key], key);
}

function scalarToString(value: unknown, path: string): string {
  if (value === null) return "";
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  throw new Error(`${path} must be a scalar string`);
}

function readOptionalNumber(map: YamlMapping, key: string, path: string): number | undefined {
  if (!Object.prototype.hasOwnProperty.call(map, key) || map[key] === undefined || map[key] === null) {
    return undefined;
  }

  const value = map[key];
  const n = typeof value === "number"
    ? value
    : typeof value === "string"
      ? Number(value)
      : Number.NaN;

  if (!Number.isFinite(n)) {
    throw new Error(`${path}.${key} must be a finite number`);
  }
  return n;
}

function parseModelConfig(value: unknown, path: string): ModelConfig | undefined {
  if (value === undefined || value === null) return undefined;

  const block = asMapping(value, path);
  const config: ModelConfig = {
    name: Object.prototype.hasOwnProperty.call(block, "name")
      ? scalarToString(block["name"], `${path}.name`)
      : "",
  };

  const temperature = readOptionalNumber(block, "temperature", path);
  if (temperature !== undefined) config.temperature = temperature;

  const maxTokens = readOptionalNumber(block, "maxTokens", path);
  if (maxTokens !== undefined) config.maxTokens = maxTokens;

  return config;
}

function parsePartialModelConfig(value: unknown, path: string): Partial<ModelConfig> | undefined {
  if (value === undefined || value === null) return undefined;

  const block = asMapping(value, path);
  const config: Partial<ModelConfig> = {};

  if (Object.prototype.hasOwnProperty.call(block, "name")) {
    config.name = scalarToString(block["name"], `${path}.name`);
  }

  const temperature = readOptionalNumber(block, "temperature", path);
  if (temperature !== undefined) config.temperature = temperature;

  const maxTokens = readOptionalNumber(block, "maxTokens", path);
  if (maxTokens !== undefined) config.maxTokens = maxTokens;

  return Object.keys(config).length > 0 ? config : undefined;
}

function parseProfiles(value: unknown, path: string): ProfilesConfig | undefined {
  if (value === undefined || value === null) return undefined;

  const block = asMapping(value, path);
  const profiles: Record<string, AgentProfile> = {};
  let defaultProfile: string | undefined;

  for (const [name, rawProfile] of Object.entries(block)) {
    if (name === "default") {
      defaultProfile = scalarToString(rawProfile, `${path}.default`);
      continue;
    }

    const profileBlock = asMapping(rawProfile, `${path}.${name}`);
    const profile: AgentProfile = {
      skills: parseSkills(profileBlock["skills"], `${path}.${name}.skills`),
    };

    const model = parsePartialModelConfig(profileBlock["model"], `${path}.${name}.model`);
    if (model !== undefined) {
      profile.model = model;
    }

    profiles[name] = profile;
  }

  if (Object.keys(profiles).length === 0) return undefined;

  const result: ProfilesConfig = { profiles };
  if (defaultProfile !== undefined) {
    result.default = defaultProfile;
  }
  return result;
}

function parseSkills(value: unknown, path: string): string[] {
  if (value === undefined || value === null) return [];

  if (Array.isArray(value)) {
    return value.map((item, index) => scalarToString(item, `${path}[${index}]`));
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return [];
    return trimmed.split(",").map(s => s.trim()).filter(Boolean);
  }

  throw new Error(`${path} must be a YAML sequence or comma-separated string`);
}
