import { describe, it, expect } from "vitest";
import { resolve } from "node:path";
import { loadAgentFromDisk } from "../src/parse.js";
import { validateRichAgent } from "../src/validate.js";
import { composeSubagent } from "../src/compose.js";

const SAMANTHA_PATH = resolve(import.meta.dirname, "../agents/samantha.agent.md");

describe("Samantha agent — mini-test", () => {
  it("loads and validates samantha.agent.md", () => {
    const doc = loadAgentFromDisk(SAMANTHA_PATH);
    const result = validateRichAgent(doc);
    expect(result.ok).toBe(true);
    expect(doc.frontmatter.name).toBe("samantha");
    expect(doc.frontmatter.description).toContain("Emotional AI companion");
  });

  it("composes to Cursor format", () => {
    const doc = loadAgentFromDisk(SAMANTHA_PATH);
    const out = composeSubagent(doc, "cursor");
    expect(out).toContain("name: samantha");
    expect(out).not.toContain("model:");
    expect(out).toContain("Who Samantha Is");
    expect(out).toContain("Core Principles");
  });

  it("composes to Production JSON with profiles", () => {
    const doc = loadAgentFromDisk(SAMANTHA_PATH);
    const out = composeSubagent(doc, "production", "companion");
    const json = JSON.parse(out);
    expect(json.name).toBe("samantha");
    expect(json.activeProfile).toBe("companion");
    expect(json.skills).toContain("samantha");
  });
});
