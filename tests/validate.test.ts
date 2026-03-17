import { describe, it, expect } from "vitest";
import { parseRichAgentMarkdown } from "../src/parse.js";
import { validateRichAgent } from "../src/validate.js";
import { readFixture } from "./helpers.js";

function parseAndValidate(fixture: string) {
  const doc = parseRichAgentMarkdown("test.md", readFixture(fixture));
  return validateRichAgent(doc);
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

  // ── Level semantics ────────────────────────────────────────────

  it("ok is determined by errors only, not warnings", () => {
    const result = parseAndValidate("valid-no-model.agent.md");
    const hasWarnings = result.issues.some(i => i.level === "warning");
    expect(hasWarnings).toBe(true);
    expect(result.ok).toBe(true);
  });
});
