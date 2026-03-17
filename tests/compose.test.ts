import { describe, it, expect } from "vitest";
import { parseRichAgentMarkdown } from "../src/parse.js";
import { composeSubagent } from "../src/compose.js";
import { readFixture } from "./helpers.js";
import type { RichAgentDocument } from "../src/types.js";

function parseFixture(name: string): RichAgentDocument {
  return parseRichAgentMarkdown("test.md", readFixture(name));
}

// ═══════════════════════════════════════════════════════════════════
// Cursor target
// ═══════════════════════════════════════════════════════════════════

describe("composeSubagent — cursor", () => {
  it("emits markdown with name + description frontmatter", () => {
    const out = composeSubagent(parseFixture("valid-full.agent.md"), "cursor");
    expect(out).toMatch(/^---\n/);
    expect(out).toContain("name: test-agent");
    expect(out).toContain("description:");
    expect(out).toContain("---");
  });

  it("includes the full prompt body", () => {
    const out = composeSubagent(parseFixture("valid-full.agent.md"), "cursor");
    expect(out).toContain("You are a test agent");
    expect(out).toContain("## Rules");
  });

  it("never includes model or profile fields (Cursor does not support them)", () => {
    const out = composeSubagent(parseFixture("valid-full.agent.md"), "cursor");
    expect(out).not.toContain("model:");
    expect(out).not.toContain("temperature:");
    expect(out).not.toContain("profiles:");
    expect(out).not.toContain("skills:");
  });
});

// ═══════════════════════════════════════════════════════════════════
// Claude Code target
// ═══════════════════════════════════════════════════════════════════

describe("composeSubagent — claude-code", () => {
  it("emits model from top-level when no profile specified", () => {
    const out = composeSubagent(parseFixture("valid-full.agent.md"), "claude-code");
    expect(out).toContain("model: sonnet");
  });

  it("emits merged model when profile with model override is specified", () => {
    const out = composeSubagent(parseFixture("valid-full.agent.md"), "claude-code", "review");
    expect(out).toContain("model: opus");
  });

  it("emits top-level model when profile has no model override", () => {
    const out = composeSubagent(parseFixture("valid-full.agent.md"), "claude-code", "live");
    expect(out).toContain("model: sonnet");
  });

  it("emits 'model: inherited' when no model anywhere", () => {
    const out = composeSubagent(parseFixture("valid-no-model.agent.md"), "claude-code");
    expect(out).toContain("model: inherited");
  });

  it("includes name and description in frontmatter", () => {
    const out = composeSubagent(parseFixture("valid-full.agent.md"), "claude-code");
    expect(out).toContain("name: test-agent");
    expect(out).toContain("description:");
  });

  it("includes the full prompt body", () => {
    const out = composeSubagent(parseFixture("valid-full.agent.md"), "claude-code");
    expect(out).toContain("You are a test agent");
  });
});

// ═══════════════════════════════════════════════════════════════════
// Production target
// ═══════════════════════════════════════════════════════════════════

describe("composeSubagent — production", () => {
  it("emits valid JSON", () => {
    const out = composeSubagent(parseFixture("valid-full.agent.md"), "production");
    expect(() => JSON.parse(out)).not.toThrow();
  });

  // ── Without profile selection: emit all profiles ──────────────

  it("includes all profiles when no profile is specified", () => {
    const out = composeSubagent(parseFixture("valid-full.agent.md"), "production");
    const json = JSON.parse(out);
    expect(json.profiles).toBeDefined();
    expect(json.profiles.default).toBe("live");
    expect(json.profiles.profiles["live"].skills).toEqual(["fact-check", "real-time-cite"]);
    expect(json.profiles.profiles["review"].skills).toEqual(["deep-analysis", "citation-gen", "summary-format"]);
  });

  it("includes top-level model as default", () => {
    const out = composeSubagent(parseFixture("valid-full.agent.md"), "production");
    const json = JSON.parse(out);
    expect(json.model).toEqual({ name: "sonnet", temperature: 0.3, maxTokens: 4096 });
  });

  // ── With profile selection: emit resolved single profile ──────

  it("resolves profile and merges model when profile is specified", () => {
    const out = composeSubagent(parseFixture("valid-full.agent.md"), "production", "review");
    const json = JSON.parse(out);
    expect(json.activeProfile).toBe("review");
    expect(json.skills).toEqual(["deep-analysis", "citation-gen", "summary-format"]);
    // model = top-level merged with profile override
    expect(json.model.name).toBe("opus");
    expect(json.model.temperature).toBe(0.7);
    expect(json.model.maxTokens).toBe(4096); // inherited from top-level
  });

  it("resolves profile without model override, inherits top-level model", () => {
    const out = composeSubagent(parseFixture("valid-full.agent.md"), "production", "live");
    const json = JSON.parse(out);
    expect(json.activeProfile).toBe("live");
    expect(json.skills).toEqual(["fact-check", "real-time-cite"]);
    expect(json.model).toEqual({ name: "sonnet", temperature: 0.3, maxTokens: 4096 });
  });

  // ── No profiles in SSOT ───────────────────────────────────────

  it("sets model to 'inherited' when no model config at all", () => {
    const out = composeSubagent(parseFixture("valid-no-model.agent.md"), "production");
    const json = JSON.parse(out);
    expect(json.model).toBe("inherited");
  });

  it("omits profiles field when agent has no profiles", () => {
    const out = composeSubagent(parseFixture("valid-minimal.agent.md"), "production");
    const json = JSON.parse(out);
    expect(json.profiles).toBeUndefined();
  });

  // ── Prompt and core fields ────────────────────────────────────

  it("includes prompt as string field", () => {
    const out = composeSubagent(parseFixture("valid-full.agent.md"), "production");
    const json = JSON.parse(out);
    expect(json.prompt).toContain("You are a test agent");
  });

  it("includes all core frontmatter fields", () => {
    const out = composeSubagent(parseFixture("valid-full.agent.md"), "production");
    const json = JSON.parse(out);
    expect(json.name).toBe("test-agent");
    expect(json.archetype).toBe("analyzer");
    expect(json.scenario).toBe("meeting");
    expect(json.adr).toBe("ADR-001");
  });

  // ── Cross-target invariant ──────────────────────────────────────

  it("body content is consistent across all three targets", () => {
    const doc = parseFixture("valid-full.agent.md");
    const cursor = composeSubagent(doc, "cursor");
    const cc = composeSubagent(doc, "claude-code");
    const prod = JSON.parse(composeSubagent(doc, "production"));

    const bodySnippet = "You are a test agent";
    expect(cursor).toContain(bodySnippet);
    expect(cc).toContain(bodySnippet);
    expect(prod.prompt).toContain(bodySnippet);
  });
});
