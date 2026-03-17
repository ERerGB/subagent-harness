import { describe, it, expect, beforeAll } from "vitest";
import { join, resolve } from "node:path";
import { loadAgentFromDisk } from "../../src/parse.js";
import { composeSubagent } from "../../src/compose.js";

const TEMPLATE_PATH = join(resolve(import.meta.dirname), "template.agent.md");

function parseFrontmatter(md: string): Record<string, string> {
  const match = md.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return {};
  const result: Record<string, string> = {};
  for (const line of match[1].split("\n")) {
    const m = line.match(/^(\w[\w-]*):\s+(.*)/);
    if (m) result[m[1]] = m[2].trim();
  }
  return result;
}

describe("L2 Runtime Compliance", () => {
  let cursorOut = "";
  let claudeOut = "";
  let prodJson: Record<string, unknown> = {};

  beforeAll(() => {
    const doc = loadAgentFromDisk(TEMPLATE_PATH);
    cursorOut = composeSubagent(doc, "cursor");
    claudeOut = composeSubagent(doc, "claude-code");
    prodJson = JSON.parse(composeSubagent(doc, "production"));
  });

  it("cursor artifact uses minimal frontmatter contract", () => {
    const fm = parseFrontmatter(cursorOut);
    expect(fm.name).toBeTruthy();
    expect(fm.description).toBeTruthy();
    expect(Object.keys(fm).sort()).toEqual(["description", "name"]);
  });

  it("cursor artifact excludes runtime-specific fields", () => {
    expect(cursorOut).not.toContain("model:");
    expect(cursorOut).not.toContain("maxTurns:");
    expect(cursorOut).not.toContain("profiles:");
  });

  it("claude artifact includes required fields", () => {
    const fm = parseFrontmatter(claudeOut);
    expect(fm.name).toBeTruthy();
    expect(fm.description).toBeTruthy();
    expect(fm.model).toBeTruthy();
  });

  it("claude artifact maxTurns is numeric when present", () => {
    const fm = parseFrontmatter(claudeOut);
    if (fm.maxTurns) {
      expect(Number.isFinite(Number(fm.maxTurns))).toBe(true);
      expect(Number(fm.maxTurns)).toBeGreaterThan(0);
    }
  });

  it("production artifact has core runtime keys", () => {
    expect(typeof prodJson.name).toBe("string");
    expect(typeof prodJson.description).toBe("string");
    expect(typeof prodJson.prompt).toBe("string");
    expect(prodJson.model).toBeDefined();
  });

  it("production artifact keeps sidecar extensions", () => {
    expect(prodJson.archetype).toBe("tester");
    expect(prodJson.scenario).toBe("e2e");
    expect(prodJson.adr).toBe("ADR-E2E");
  });
});
