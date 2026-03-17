/**
 * E2E round-trip tests: compose a template agent to all three runtime
 * targets, write to disk, then reload and verify in the target-native way.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { readFileSync, writeFileSync, mkdtempSync, rmSync, mkdirSync } from "node:fs";
import { resolve, join } from "node:path";
import { tmpdir } from "node:os";
import { parseRichAgentMarkdown } from "../../src/parse.js";
import { composeSubagent, resolveModel } from "../../src/compose.js";
import type { RichAgentDocument } from "../../src/types.js";

// ── Shared setup ─────────────────────────────────────────────────

const TEMPLATE_PATH = resolve(import.meta.dirname, "template.agent.md");
let doc: RichAgentDocument;
let tmpRoot: string;
let cursorDir: string;
let ccDir: string;
let prodDir: string;

/** Parse YAML frontmatter from a composed runtime .md file (minimal parser). */
function parseFrontmatter(content: string): Record<string, string> {
  const fmMatch = content.match(/^---\n([\s\S]*?)\n---/);
  if (!fmMatch) return {};
  const result: Record<string, string> = {};
  for (const line of fmMatch[1].split("\n")) {
    const m = line.match(/^(\w[\w-]*):\s*(.*)/);
    if (m) result[m[1]] = m[2].trim();
  }
  return result;
}

/** Extract body (everything after the second ---) from a composed .md file. */
function extractBody(content: string): string {
  const match = content.match(/^---\n[\s\S]*?\n---\n?([\s\S]*)$/);
  return match ? match[1].trim() : "";
}

beforeAll(() => {
  const raw = readFileSync(TEMPLATE_PATH, "utf8");
  doc = parseRichAgentMarkdown(TEMPLATE_PATH, raw);

  tmpRoot = mkdtempSync(join(tmpdir(), "subagent-e2e-"));
  cursorDir = join(tmpRoot, "cursor");
  ccDir = join(tmpRoot, "claude-code");
  prodDir = join(tmpRoot, "production");
  mkdirSync(cursorDir, { recursive: true });
  mkdirSync(ccDir, { recursive: true });
  mkdirSync(prodDir, { recursive: true });

  writeFileSync(join(cursorDir, "e2e-template.md"), composeSubagent(doc, "cursor"), "utf8");
  writeFileSync(join(ccDir, "e2e-template.md"), composeSubagent(doc, "claude-code"), "utf8");
  writeFileSync(join(prodDir, "e2e-template.json"), composeSubagent(doc, "production"), "utf8");
  writeFileSync(join(prodDir, "e2e-template-fast.json"), composeSubagent(doc, "production", "fast"), "utf8");
  writeFileSync(join(prodDir, "e2e-template-deep.json"), composeSubagent(doc, "production", "deep"), "utf8");
});

afterAll(() => {
  rmSync(tmpRoot, { recursive: true, force: true });
});

// ═══════════════════════════════════════════════════════════════════
// Cursor: load composed .md and verify runtime format
// ═══════════════════════════════════════════════════════════════════

describe("E2E — Cursor runtime", () => {
  it("composed file is valid markdown with YAML frontmatter", () => {
    const content = readFileSync(join(cursorDir, "e2e-template.md"), "utf8");
    const fm = parseFrontmatter(content);
    expect(fm["name"]).toBe("e2e-template");
    expect(fm["description"]).toBeTruthy();
  });

  it("frontmatter contains only name and description", () => {
    const content = readFileSync(join(cursorDir, "e2e-template.md"), "utf8");
    const fm = parseFrontmatter(content);
    const keys = Object.keys(fm);
    expect(keys).toContain("name");
    expect(keys).toContain("description");
    expect(keys).not.toContain("model");
    expect(keys).not.toContain("profiles");
    expect(keys).not.toContain("skills");
    expect(keys).not.toContain("temperature");
  });

  it("body matches original prompt content", () => {
    const content = readFileSync(join(cursorDir, "e2e-template.md"), "utf8");
    const body = extractBody(content);
    expect(body).toContain("You are an end-to-end verification agent");
    expect(body).toContain("## Instructions");
    expect(body).toContain("## Output Format");
  });
});

// ═══════════════════════════════════════════════════════════════════
// Claude Code: load composed .md and verify CC-specific fields
// ═══════════════════════════════════════════════════════════════════

describe("E2E — Claude Code runtime", () => {
  it("composed file is valid markdown with CC frontmatter", () => {
    const content = readFileSync(join(ccDir, "e2e-template.md"), "utf8");
    const fm = parseFrontmatter(content);
    expect(fm["name"]).toBe("e2e-template");
    expect(fm["description"]).toBeTruthy();
  });

  it("frontmatter includes model field", () => {
    const content = readFileSync(join(ccDir, "e2e-template.md"), "utf8");
    const fm = parseFrontmatter(content);
    expect(fm["model"]).toBe("sonnet");
  });

  it("frontmatter includes maxTurns field", () => {
    const content = readFileSync(join(ccDir, "e2e-template.md"), "utf8");
    const fm = parseFrontmatter(content);
    expect(fm["maxTurns"]).toBeDefined();
    expect(parseInt(fm["maxTurns"])).toBeGreaterThan(0);
  });

  it("body matches original prompt content", () => {
    const content = readFileSync(join(ccDir, "e2e-template.md"), "utf8");
    const body = extractBody(content);
    expect(body).toContain("You are an end-to-end verification agent");
  });
});

// ═══════════════════════════════════════════════════════════════════
// Production (Node.js): JSON.parse + programmatic verification
// ═══════════════════════════════════════════════════════════════════

describe("E2E — Production runtime (Node.js)", () => {
  // ── Full-profiles output (no profile selection) ────────────────

  it("composed JSON is valid and parseable", () => {
    const raw = readFileSync(join(prodDir, "e2e-template.json"), "utf8");
    expect(() => JSON.parse(raw)).not.toThrow();
  });

  it("contains all core identity fields", () => {
    const json = JSON.parse(readFileSync(join(prodDir, "e2e-template.json"), "utf8"));
    expect(json.name).toBe("e2e-template");
    expect(json.archetype).toBe("verifier");
    expect(json.scenario).toBe("meeting");
    expect(json.adr).toBe("ADR-E2E");
  });

  it("contains top-level model config", () => {
    const json = JSON.parse(readFileSync(join(prodDir, "e2e-template.json"), "utf8"));
    expect(json.model).toEqual({ name: "sonnet", temperature: 0.2, maxTokens: 2048 });
  });

  it("contains all profiles for runtime dynamic selection", () => {
    const json = JSON.parse(readFileSync(join(prodDir, "e2e-template.json"), "utf8"));
    expect(json.profiles).toBeDefined();
    expect(json.profiles.default).toBe("fast");
    expect(json.profiles.profiles["fast"].skills).toEqual(["detect", "respond"]);
    expect(json.profiles.profiles["deep"].skills).toEqual(["analyze", "synthesize", "cite"]);
  });

  it("contains prompt as string field", () => {
    const json = JSON.parse(readFileSync(join(prodDir, "e2e-template.json"), "utf8"));
    expect(json.prompt).toContain("You are an end-to-end verification agent");
    expect(json.prompt).toContain("## Output Format");
  });

  // ── Profile-resolved output: "fast" (with model override) ─────

  it("resolved 'fast' profile merges model override", () => {
    const json = JSON.parse(readFileSync(join(prodDir, "e2e-template-fast.json"), "utf8"));
    expect(json.activeProfile).toBe("fast");
    expect(json.skills).toEqual(["detect", "respond"]);
    expect(json.model.name).toBe("haiku");
    expect(json.model.temperature).toBe(0.0);
    expect(json.model.maxTokens).toBe(2048);
  });

  // ── Profile-resolved output: "deep" (no model override) ───────

  it("resolved 'deep' profile inherits top-level model", () => {
    const json = JSON.parse(readFileSync(join(prodDir, "e2e-template-deep.json"), "utf8"));
    expect(json.activeProfile).toBe("deep");
    expect(json.skills).toEqual(["analyze", "synthesize", "cite"]);
    expect(json.model).toEqual({ name: "sonnet", temperature: 0.2, maxTokens: 2048 });
  });

  // ── resolveModel() public API verification ────────────────────

  it("resolveModel() merges profile override with top-level default", () => {
    const resolved = resolveModel(doc, "fast");
    expect(resolved).toEqual({ name: "haiku", temperature: 0.0, maxTokens: 2048 });
  });

  it("resolveModel() returns top-level model when profile has no override", () => {
    const resolved = resolveModel(doc, "deep");
    expect(resolved).toEqual({ name: "sonnet", temperature: 0.2, maxTokens: 2048 });
  });

  it("resolveModel() returns top-level model when no profile specified", () => {
    const resolved = resolveModel(doc);
    expect(resolved).toEqual({ name: "sonnet", temperature: 0.2, maxTokens: 2048 });
  });
});
