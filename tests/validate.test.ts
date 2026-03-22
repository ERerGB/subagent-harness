import { describe, it, expect } from "vitest";
import { parseRichAgentMarkdown } from "../src/parse.js";
import { validateRichAgent } from "../src/validate.js";
import { readFixture, loadFixture } from "./helpers.js";
import type { ValidateOptions, ValidationIssue } from "../src/types.js";

function parseAndValidate(fixture: string, options?: ValidateOptions) {
  const doc = parseRichAgentMarkdown("test.md", readFixture(fixture));
  return validateRichAgent(doc, options);
}

describe("validateRichAgent", () => {
  // ── Happy paths ────────────────────────────────────────────────

  it("passes validation for fully specified agent", () => {
    const result = parseAndValidate("valid-full.agent.md");
    expect(result.ok).toBe(true);
    expect(result.issues.filter(i => i.level === "error")).toHaveLength(0);
  });

  it("passes validation for agent without model config", () => {
    const result = parseAndValidate("valid-no-model.agent.md");
    expect(result.ok).toBe(true);
  });

  it("passes validation for minimal agent", () => {
    const result = parseAndValidate("valid-minimal.agent.md");
    expect(result.ok).toBe(true);
  });

  it("passes validation for versioned agent", () => {
    const result = parseAndValidate("valid-with-version.agent.md");
    expect(result.ok).toBe(true);
  });

  it("passes validation for profiles without model overrides", () => {
    const result = parseAndValidate("valid-profiles-no-override.agent.md");
    expect(result.ok).toBe(true);
  });

  it("passes validation for generic (non-Magpie) agent", () => {
    const result = parseAndValidate("valid-generic.agent.md");
    expect(result.ok).toBe(true);
    expect(result.issues.filter(i => i.level === "error")).toHaveLength(0);
  });

  // ── Warning: missing model config ──────────────────────────────

  it("emits W_NO_MODEL warning when model config is absent", () => {
    const result = parseAndValidate("valid-no-model.agent.md");
    const warnings = result.issues.filter(i => i.level === "warning");
    expect(warnings).toContainEqual(
      expect.objectContaining({ code: "W_NO_MODEL" })
    );
  });

  it("does not emit W_NO_MODEL when model config is present", () => {
    const result = parseAndValidate("valid-full.agent.md");
    const modelWarnings = result.issues.filter(i => i.code === "W_NO_MODEL");
    expect(modelWarnings).toHaveLength(0);
  });

  // ── Warning: missing profiles ──────────────────────────────────

  it("emits W_NO_PROFILES warning when profiles are absent", () => {
    const result = parseAndValidate("valid-minimal.agent.md");
    const warnings = result.issues.filter(i => i.code === "W_NO_PROFILES");
    expect(warnings).toHaveLength(1);
  });

  it("does not emit W_NO_PROFILES when profiles are present", () => {
    const result = parseAndValidate("valid-full.agent.md");
    const warnings = result.issues.filter(i => i.code === "W_NO_PROFILES");
    expect(warnings).toHaveLength(0);
  });

  // ── Error: missing required fields ─────────────────────────────

  it("fails on empty prompt body with E_BODY", () => {
    const result = parseAndValidate("invalid-no-body.agent.md");
    expect(result.ok).toBe(false);
    expect(result.issues).toContainEqual(
      expect.objectContaining({ code: "E_BODY", level: "error" })
    );
  });

  // ── Error: invalid model config values ─────────────────────────

  it("fails when temperature is out of range (0–2)", () => {
    const result = parseAndValidate("invalid-bad-temperature.agent.md");
    expect(result.ok).toBe(false);
    expect(result.issues).toContainEqual(
      expect.objectContaining({ code: "E_MODEL_TEMPERATURE", level: "error" })
    );
  });

  it("fails when model.name is empty", () => {
    const result = parseAndValidate("invalid-empty-model-name.agent.md");
    expect(result.ok).toBe(false);
    expect(result.issues).toContainEqual(
      expect.objectContaining({ code: "E_MODEL_NAME", level: "error" })
    );
  });

  // ── Error: invalid profiles ────────────────────────────────────

  it("fails when default references a non-existent profile", () => {
    const result = parseAndValidate("invalid-bad-default-profile.agent.md");
    expect(result.ok).toBe(false);
    expect(result.issues).toContainEqual(
      expect.objectContaining({ code: "E_PROFILE_DEFAULT", level: "error" })
    );
  });

  it("passes when a profile has empty skills array", () => {
    const result = parseAndValidate("invalid-empty-skills.agent.md");
    expect(result.ok).toBe(true);
    const profileErrors = result.issues.filter(i => i.code === "E_PROFILE_SKILLS");
    expect(profileErrors).toHaveLength(0);
  });

  // ── Schema version ─────────────────────────────────────────────

  it("passes when schemaVersion is a supported version", () => {
    const result = parseAndValidate("valid-with-schema-version.agent.md");
    const versionIssues = result.issues.filter(i => i.code === "W_SCHEMA_VERSION_UNKNOWN");
    expect(versionIssues).toHaveLength(0);
  });

  it("emits W_SCHEMA_VERSION_UNKNOWN for unsupported version", () => {
    const doc = parseRichAgentMarkdown("test.md", readFixture("valid-with-schema-version.agent.md"));
    doc.frontmatter.schemaVersion = "99";
    const result = validateRichAgent(doc);
    expect(result.ok).toBe(true);
    expect(result.issues).toContainEqual(
      expect.objectContaining({ code: "W_SCHEMA_VERSION_UNKNOWN", level: "warning" })
    );
  });

  // ── Level semantics ────────────────────────────────────────────

  it("ok is determined by errors only, not warnings", () => {
    const result = parseAndValidate("valid-no-model.agent.md");
    const hasWarnings = result.issues.some(i => i.level === "warning");
    expect(hasWarnings).toBe(true);
    expect(result.ok).toBe(true);
  });

  // ── Extension validator hook ──────────────────────────────────

  describe("extensionValidator hook", () => {
    it("merges extension validator issues into result", () => {
      const doc = loadFixture("valid-full.agent.md");
      const extensionValidator: ValidateOptions["extensionValidator"] = (ext) => {
        const issues: ValidationIssue[] = [];
        if (!ext["archetype"]) {
          issues.push({ code: "E_EXT_ARCHETYPE", message: "archetype is required", level: "error", path: "extensions.archetype" });
        }
        return issues;
      };
      // valid-full.agent.ext.yaml has archetype: analyzer → no errors expected
      const result = validateRichAgent(doc, { extensionValidator });
      expect(result.issues.filter(i => i.code === "E_EXT_ARCHETYPE")).toHaveLength(0);
    });

    it("extension validator errors make result.ok false", () => {
      const doc = loadFixture("valid-full.agent.md");
      // Override extensions to trigger the validator
      doc.extensions = {};
      const extensionValidator: ValidateOptions["extensionValidator"] = (ext) => {
        const issues: ValidationIssue[] = [];
        if (!ext["archetype"]) {
          issues.push({ code: "E_EXT_ARCHETYPE", message: "archetype is required", level: "error", path: "extensions.archetype" });
        }
        return issues;
      };
      const result = validateRichAgent(doc, { extensionValidator });
      expect(result.ok).toBe(false);
      expect(result.issues).toContainEqual(
        expect.objectContaining({ code: "E_EXT_ARCHETYPE", level: "error" })
      );
    });

    it("extension validator warnings do not affect ok status", () => {
      const doc = loadFixture("valid-full.agent.md");
      const extensionValidator: ValidateOptions["extensionValidator"] = () => [
        { code: "W_EXT_DEPRECATED", message: "field deprecated", level: "warning", path: "extensions.legacy" },
      ];
      const result = validateRichAgent(doc, { extensionValidator });
      expect(result.ok).toBe(true);
      expect(result.issues).toContainEqual(
        expect.objectContaining({ code: "W_EXT_DEPRECATED" })
      );
    });

    it("skips extension validation when no hook provided", () => {
      const doc = loadFixture("valid-full.agent.md");
      const result = validateRichAgent(doc);
      // No extension-related issues should exist
      const extIssues = result.issues.filter(i => i.code.startsWith("E_EXT_") || i.code.startsWith("W_EXT_"));
      expect(extIssues).toHaveLength(0);
    });
  });
});
