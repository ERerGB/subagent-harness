import { resolveModel } from "./compose.js";
import type { RichAgentDocument, ValidationIssue, ValidationResult } from "./types.js";

/**
 * Build-time checks that production JSON still reflects SSOT (.agent.md + .agent.ext.yaml).
 * Structural only: no business rules about which model strings are valid (see issue #15).
 */
export function validateProductionComposeOutput(
  doc: RichAgentDocument,
  jsonRoot: unknown,
  profile?: string,
): ValidationResult {
  const issues: ValidationIssue[] = [];

  if (jsonRoot === null || typeof jsonRoot !== "object" || Array.isArray(jsonRoot)) {
    return {
      ok: false,
      issues: [
        {
          code: "E_CONTRACT_JSON_ROOT",
          message: "production output must be a JSON object",
          level: "error",
        },
      ],
    };
  }

  const j = jsonRoot as Record<string, unknown>;

  const prompt = j["prompt"];
  if (typeof prompt !== "string" || !prompt.trim()) {
    issues.push({
      code: "E_CONTRACT_PROMPT",
      message: "composed JSON must include non-empty string prompt",
      level: "error",
      path: "prompt",
    });
  }

  const effective = profile ? resolveModel(doc, profile) : doc.frontmatter.model;
  const wantsModelName = Boolean(effective?.name && String(effective.name).trim().length > 0);

  if (wantsModelName) {
    const m = j["model"];
    if (m === null || typeof m !== "object" || Array.isArray(m)) {
      issues.push({
        code: "E_CONTRACT_MODEL",
        message: "composed JSON model must be an object with name when source declares model",
        level: "error",
        path: "model",
      });
    } else {
      const name = (m as Record<string, unknown>)["name"];
      if (typeof name !== "string" || !name.trim()) {
        issues.push({
          code: "E_CONTRACT_MODEL_NAME",
          message: "composed JSON model.name must be non-empty when source declares model",
          level: "error",
          path: "model.name",
        });
      } else if (name !== effective!.name) {
        issues.push({
          code: "E_CONTRACT_MODEL_DRIFT",
          message: `composed model.name "${name}" does not match source "${effective!.name}"`,
          level: "error",
          path: "model.name",
        });
      }
    }
  }

  const extCs = doc.extensions["contentSchema"];
  if (extCs !== undefined && extCs !== null) {
    if (typeof extCs !== "object" || Array.isArray(extCs)) {
      issues.push({
        code: "E_CONTRACT_EXT_CONTENTSCHEMA",
        message: "extensions.contentSchema must be a mapping object in .agent.ext.yaml",
        level: "error",
        path: "contentSchema",
      });
    } else {
      const outCs = j["contentSchema"];
      if (outCs === undefined || outCs === null) {
        issues.push({
          code: "E_CONTRACT_CONTENTSCHEMA_MISSING",
          message: "composed JSON must include contentSchema when source extension defines it",
          level: "error",
          path: "contentSchema",
        });
      } else if (typeof outCs !== "object" || Array.isArray(outCs)) {
        issues.push({
          code: "E_CONTRACT_CONTENTSCHEMA_SHAPE",
          message: "composed contentSchema must be a JSON object",
          level: "error",
          path: "contentSchema",
        });
      } else {
        const srcKeys = sortedKeys(extCs as Record<string, unknown>);
        const dstKeys = sortedKeys(outCs as Record<string, unknown>);
        if (!keySetsEqual(srcKeys, dstKeys)) {
          issues.push({
            code: "E_CONTRACT_CONTENTSCHEMA_KEYS",
            message: `contentSchema top-level keys mismatch: source [${srcKeys.join(", ")}] vs output [${dstKeys.join(", ")}]`,
            level: "error",
            path: "contentSchema",
          });
        }
      }
    }
  }

  const hasErrors = issues.some(i => i.level === "error");
  return { ok: !hasErrors, issues };
}

function sortedKeys(o: Record<string, unknown>): string[] {
  return Object.keys(o).sort();
}

function keySetsEqual(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  return a.every((k, i) => k === b[i]);
}
