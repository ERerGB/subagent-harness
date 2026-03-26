import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { mkdtempSync, writeFileSync, readFileSync, rmSync, existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";

import { loadAgentFromDisk } from "../../src/parse.js";
import { composeSubagent } from "../../src/compose.js";
import { validateRichAgent } from "../../src/validate.js";
import type { RichAgentDocument } from "../../src/types.js";

const TEMPLATE_DIR = resolve(import.meta.dirname);
const TEMPLATE_PATH = join(TEMPLATE_DIR, "template.agent.md");

// ── Lightweight parsers for verifying composed output ──────────────
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

function extractBody(md: string): string {
  const match = md.match(/^---\n[\s\S]*?\n---\n?([\s\S]*)$/);
  return match ? match[1].trim() : "";
}

// ── Test state ─────────────────────────────────────────────────────
let tmpDir: string;
let doc: RichAgentDocument;

beforeAll(() => {
  tmpDir = mkdtempSync(join(tmpdir(), "subagent-e2e-"));
  doc = loadAgentFromDisk(TEMPLATE_PATH);
});

afterAll(() => {
  if (tmpDir && existsSync(tmpDir)) {
    rmSync(tmpDir, { recursive: true, force: true });
  }
});

// ═══════════════════════════════════════════════════════════════════
// Validation gate
// ═══════════════════════════════════════════════════════════════════

describe("E2E — Validation gate", () => {
  it("template passes validation with no errors", () => {
    const result = validateRichAgent(doc);
    expect(result.ok).toBe(true);
  });

  it("loads extensions from sidecar", () => {
    expect(doc.extensions.archetype).toBe("tester");
    expect(doc.extensions.scenario).toBe("e2e");
  });
});

// ═══════════════════════════════════════════════════════════════════
// Cursor runtime
// ═══════════════════════════════════════════════════════════════════

describe("E2E — Cursor runtime", () => {
  let cursorPath: string;
  let cursorOutput: string;

  beforeAll(() => {
    cursorOutput = composeSubagent(doc, "cursor");
    cursorPath = join(tmpDir, "cursor.md");
    writeFileSync(cursorPath, cursorOutput, "utf8");
  });

  it("writes Cursor-format Markdown file", () => {
    expect(existsSync(cursorPath)).toBe(true);
  });

  it("Cursor frontmatter contains name and description", () => {
    const fm = parseFrontmatter(cursorOutput);
    expect(fm.name).toBe("e2e-template");
    expect(fm.description).toBeTruthy();
  });

  it("Cursor output does not contain model or profiles", () => {
    expect(cursorOutput).not.toContain("model:");
    expect(cursorOutput).not.toContain("profiles:");
  });

  it("Cursor output contains prompt body", () => {
    const body = extractBody(cursorOutput);
    expect(body).toContain("end-to-end test agent");
  });

  it("re-read matches written content", () => {
    expect(readFileSync(cursorPath, "utf8")).toBe(cursorOutput);
  });
});

// ═══════════════════════════════════════════════════════════════════
// Codex runtime (same markdown contract as Cursor — issue #13)
// ═══════════════════════════════════════════════════════════════════

describe("E2E — Codex runtime", () => {
  let codexPath: string;
  let codexOutput: string;

  beforeAll(() => {
    codexOutput = composeSubagent(doc, "codex");
    codexPath = join(tmpDir, "codex.md");
    writeFileSync(codexPath, codexOutput, "utf8");
  });

  it("writes Codex-format Markdown file (minimal frontmatter)", () => {
    expect(existsSync(codexPath)).toBe(true);
  });

  it("Codex frontmatter contains name and description", () => {
    const fm = parseFrontmatter(codexOutput);
    expect(fm.name).toBe("e2e-template");
    expect(fm.description).toBeTruthy();
  });

  it("Codex output does not contain model or profiles", () => {
    expect(codexOutput).not.toContain("model:");
    expect(codexOutput).not.toContain("profiles:");
  });

  it("Codex output contains prompt body", () => {
    const body = extractBody(codexOutput);
    expect(body).toContain("end-to-end test agent");
  });

  it("re-read matches written content", () => {
    expect(readFileSync(codexPath, "utf8")).toBe(codexOutput);
  });

  it("matches Cursor adapter output byte-for-byte", () => {
    const cursorOutput = composeSubagent(doc, "cursor");
    expect(codexOutput).toBe(cursorOutput);
  });
});

// ═══════════════════════════════════════════════════════════════════
// Claude Code runtime
// ═══════════════════════════════════════════════════════════════════

describe("E2E — Claude Code runtime", () => {
  let ccPath: string;
  let ccOutput: string;

  beforeAll(() => {
    ccOutput = composeSubagent(doc, "claude-code");
    ccPath = join(tmpDir, "claude-code.md");
    writeFileSync(ccPath, ccOutput, "utf8");
  });

  it("writes Claude Code format Markdown file", () => {
    expect(existsSync(ccPath)).toBe(true);
  });

  it("frontmatter includes model field", () => {
    const fm = parseFrontmatter(ccOutput);
    expect(fm.model).toBe("sonnet");
  });

  it("includes maxTurns from sidecar extensions", () => {
    const fm = parseFrontmatter(ccOutput);
    expect(fm.maxTurns).toBe("3");
  });

  it("body contains prompt", () => {
    const body = extractBody(ccOutput);
    expect(body).toContain("end-to-end test agent");
  });

  it("re-read matches written content", () => {
    expect(readFileSync(ccPath, "utf8")).toBe(ccOutput);
  });
});

// ═══════════════════════════════════════════════════════════════════
// Production runtime
// ═══════════════════════════════════════════════════════════════════

describe("E2E — Production runtime", () => {
  let prodPath: string;
  let prodJson: Record<string, unknown>;

  beforeAll(() => {
    const out = composeSubagent(doc, "production");
    prodPath = join(tmpDir, "production.json");
    writeFileSync(prodPath, out, "utf8");
    prodJson = JSON.parse(out);
  });

  it("writes valid JSON file", () => {
    expect(existsSync(prodPath)).toBe(true);
    expect(() => JSON.parse(readFileSync(prodPath, "utf8"))).not.toThrow();
  });

  it("JSON includes core fields", () => {
    expect(prodJson.name).toBe("e2e-template");
    expect(prodJson.description).toBeTruthy();
    expect(prodJson.prompt).toBeTruthy();
  });

  it("JSON includes model config", () => {
    const model = prodJson.model as Record<string, unknown>;
    expect(model.name).toBe("sonnet");
    expect(model.temperature).toBe(0.5);
    expect(model.maxTokens).toBe(2048);
  });

  it("JSON includes profiles", () => {
    expect(prodJson.profiles).toBeDefined();
  });

  it("JSON includes extension fields from sidecar", () => {
    expect(prodJson.archetype).toBe("tester");
    expect(prodJson.scenario).toBe("e2e");
    expect(prodJson.adr).toBe("ADR-E2E");
  });

  it("JSON round-trips correctly", () => {
    const reloaded = JSON.parse(readFileSync(prodPath, "utf8"));
    expect(reloaded).toEqual(prodJson);
  });
});
