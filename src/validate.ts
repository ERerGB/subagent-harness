import type { RichAgentDocument, ValidationIssue, ValidationResult } from "./types.js";

export function validateRichAgent(doc: RichAgentDocument): ValidationResult {
  const issues: ValidationIssue[] = [];
  const f = doc.frontmatter;

  if (!/^[a-z0-9-]+$/.test(f.name)) {
    issues.push({ code: "E_NAME", message: "name must be lowercase kebab-case", path: "name" });
  }
  if (!f.description || f.description.length < 3) {
    issues.push({ code: "E_DESC", message: "description is required", path: "description" });
  }
  if (!(f.scenario === "meeting" || f.scenario === "creator")) {
    issues.push({ code: "E_SCENARIO", message: "scenario must be meeting|creator", path: "scenario" });
  }
  if (!f.adr) {
    issues.push({ code: "E_ADR", message: "adr is required", path: "adr" });
  }
  if (!doc.body.trim()) {
    issues.push({ code: "E_BODY", message: "prompt body is required", path: "body" });
  }

  return { ok: issues.length === 0, issues };
}

