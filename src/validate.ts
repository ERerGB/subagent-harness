import type { RichAgentDocument, ValidationIssue, ValidationResult, ModelConfig, ValidateOptions } from "./types.js";

export const SUPPORTED_SCHEMA_VERSIONS = ["1"] as const;

export function validateRichAgent(doc: RichAgentDocument, options?: ValidateOptions): ValidationResult {
  const issues: ValidationIssue[] = [];
  const f = doc.frontmatter;

  // ── Schema version ───────────────────────────────────────────
  if (f.schemaVersion && !(SUPPORTED_SCHEMA_VERSIONS as readonly string[]).includes(f.schemaVersion)) {
    issues.push({
      code: "W_SCHEMA_VERSION_UNKNOWN",
      message: `schemaVersion "${f.schemaVersion}" is not recognized (supported: ${SUPPORTED_SCHEMA_VERSIONS.join(", ")})`,
      level: "warning",
      path: "schemaVersion",
    });
  }

  // ── Required scalars ─────────────────────────────────────────
  if (!/^[a-z0-9-]+$/.test(f.name)) {
    issues.push({ code: "E_NAME", message: "name must be lowercase kebab-case", level: "error", path: "name" });
  }
  if (!f.description || f.description.length < 3) {
    issues.push({ code: "E_DESC", message: "description is required", level: "error", path: "description" });
  }
  if (!doc.body.trim()) {
    issues.push({ code: "E_BODY", message: "prompt body is required", level: "error", path: "body" });
  }

  // ── Model Config pillar ──────────────────────────────────────
  if (!f.model) {
    issues.push({
      code: "W_NO_MODEL",
      message: "no model config — runtime will use inherited defaults",
      level: "warning",
      path: "model",
    });
  } else {
    validateModelConfig(f.model, "model", issues);
  }

  // ── Profiles pillar ──────────────────────────────────────────
  if (!f.profiles) {
    issues.push({
      code: "W_NO_PROFILES",
      message: "no profiles defined — agent has no skill states",
      level: "warning",
      path: "profiles",
    });
  } else {
    const { profiles, default: defaultProfile } = f.profiles;

    if (defaultProfile && !(defaultProfile in profiles)) {
      issues.push({
        code: "E_PROFILE_DEFAULT",
        message: `default profile "${defaultProfile}" does not exist in profiles`,
        level: "error",
        path: "profiles.default",
      });
    }

    for (const [name, profile] of Object.entries(profiles)) {
      // Explicit empty skills (`[]`) is valid for terminal/no-op profiles.
      if (!profile.skills) {
        issues.push({
          code: "E_PROFILE_SKILLS",
          message: `profile "${name}" must define skills array`,
          level: "error",
          path: `profiles.${name}.skills`,
        });
      }

      if (profile.model) {
        validateModelConfig(profile.model as ModelConfig, `profiles.${name}.model`, issues);
      }
    }
  }

  // ── Extension validation (consumer-supplied hook) ───────────
  if (options?.extensionValidator) {
    issues.push(...options.extensionValidator(doc.extensions));
  }

  const hasErrors = issues.some(i => i.level === "error");
  return { ok: !hasErrors, issues };
}

function validateModelConfig(model: Partial<ModelConfig>, basePath: string, issues: ValidationIssue[]): void {
  if ("name" in model && !model.name) {
    issues.push({ code: "E_MODEL_NAME", message: "model.name is required when model block is present", level: "error", path: `${basePath}.name` });
  }
  if (model.temperature !== undefined && (model.temperature < 0 || model.temperature > 2)) {
    issues.push({ code: "E_MODEL_TEMPERATURE", message: "model.temperature must be between 0 and 2", level: "error", path: `${basePath}.temperature` });
  }
  if (model.maxTokens !== undefined && (!Number.isInteger(model.maxTokens) || model.maxTokens <= 0)) {
    issues.push({ code: "E_MODEL_MAX_TOKENS", message: "model.maxTokens must be a positive integer", level: "error", path: `${basePath}.maxTokens` });
  }
}
