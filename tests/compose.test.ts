import { describe, it, expect } from "vitest";
import { parseRichAgentMarkdown } from "../src/parse.js";
import { composeSubagent, loadAgent, resolveModel } from "../src/compose.js";
import { validateAgentDefinition } from "../src/compose-contract.js";
import { readFixture, loadFixture } from "./helpers.js";

describe("composeSubagent — Cursor runtime", () => {
  it("outputs simplified Markdown for Cursor", () => {
    const doc = parseRichAgentMarkdown("test.md", readFixture("valid-full.agent.md"));
    const out = composeSubagent(doc, "cursor");
    expect(out).toContain("name: test-agent");
    expect(out).toContain("description:");
    expect(out).toContain("You are a test agent");
  });

  it("does not include model or profiles in Cursor output", () => {
    const doc = parseRichAgentMarkdown("test.md", readFixture("valid-full.agent.md"));
    const out = composeSubagent(doc, "cursor");
    expect(out).not.toContain("model:");
    expect(out).not.toContain("profiles:");
    expect(out).not.toContain("temperature:");
  });

  it("codex target matches cursor output byte-for-byte (issue #13)", () => {
    const doc = parseRichAgentMarkdown("test.md", readFixture("valid-full.agent.md"));
    expect(composeSubagent(doc, "codex")).toBe(composeSubagent(doc, "cursor"));
  });
});

describe("composeSubagent — Claude Code runtime", () => {
  it("includes model name from frontmatter", () => {
    const doc = parseRichAgentMarkdown("test.md", readFixture("valid-full.agent.md"));
    const out = composeSubagent(doc, "claude-code");
    expect(out).toContain("model: sonnet");
  });

  it("uses 'inherited' when no model config", () => {
    const doc = parseRichAgentMarkdown("test.md", readFixture("valid-no-model.agent.md"));
    const out = composeSubagent(doc, "claude-code");
    expect(out).toContain("model: inherited");
  });

  it("omits maxTurns when no extensions present", () => {
    const doc = parseRichAgentMarkdown("test.md", readFixture("valid-full.agent.md"));
    const out = composeSubagent(doc, "claude-code");
    expect(out).not.toContain("maxTurns:");
  });

  it("includes maxTurns when extension provides maxIdleTurns", () => {
    const doc = loadFixture("valid-full.agent.md");
    // valid-full.agent.ext.yaml has config.maxIdleTurns: 5
    // The CC adapter looks at doc.extensions.config.maxIdleTurns
    const out = composeSubagent(doc, "claude-code");
    expect(out).toContain("maxTurns: 5");
  });
});

describe("composeSubagent — Production runtime", () => {
  it("outputs valid JSON", () => {
    const doc = parseRichAgentMarkdown("test.md", readFixture("valid-full.agent.md"));
    const out = composeSubagent(doc, "production");
    const json = JSON.parse(out);
    expect(json.name).toBe("test-agent");
    expect(json.prompt).toBeTruthy();
  });

  it("includes full profiles when no specific profile requested", () => {
    const doc = parseRichAgentMarkdown("test.md", readFixture("valid-full.agent.md"));
    const out = composeSubagent(doc, "production");
    const json = JSON.parse(out);
    expect(json.profiles).toBeDefined();
  });

  it("resolves single profile when specified", () => {
    const doc = parseRichAgentMarkdown("test.md", readFixture("valid-full.agent.md"));
    const out = composeSubagent(doc, "production", "review");
    const json = JSON.parse(out);
    expect(json.activeProfile).toBe("review");
    expect(json.skills).toEqual(["deep-analysis", "citation-gen", "summary-format"]);
    expect(json.model.name).toBe("opus");
    expect(json.model.temperature).toBe(0.7);
    expect(json.model.maxTokens).toBe(4096);
  });

  it("spreads extensions into production JSON", () => {
    const doc = loadFixture("valid-full.agent.md");
    const out = composeSubagent(doc, "production");
    const json = JSON.parse(out);
    expect(json.archetype).toBe("analyzer");
    expect(json.scenario).toBe("meeting");
    expect(json.adr).toBe("ADR-001");
  });

  it("includes frontmatter version in production JSON when present", () => {
    const doc = parseRichAgentMarkdown("test.md", readFixture("valid-with-version.agent.md"));
    const out = composeSubagent(doc, "production");
    const json = JSON.parse(out);
    expect(json.version).toBe("2.0.0");
  });

  it("omits extensions keys when no sidecar loaded", () => {
    const doc = parseRichAgentMarkdown("test.md", readFixture("valid-full.agent.md"));
    const out = composeSubagent(doc, "production");
    const json = JSON.parse(out);
    expect(json.archetype).toBeUndefined();
    expect(json.scenario).toBeUndefined();
  });
});

describe("loadAgent — public API (issue #16)", () => {
  it("returns typed AgentDefinition with required fields", () => {
    const doc = parseRichAgentMarkdown("test.md", readFixture("valid-full.agent.md"));
    const def = loadAgent(doc);
    expect(def.name).toBe("test-agent");
    expect(typeof def.prompt).toBe("string");
    expect(def.prompt.length).toBeGreaterThan(0);
    expect(def.extensions).toBeDefined();
  });

  it("resolves profile skills and model when profile specified", () => {
    const doc = parseRichAgentMarkdown("test.md", readFixture("valid-full.agent.md"));
    const def = loadAgent(doc, "review");
    expect(def.activeProfile).toBe("review");
    expect(def.skills).toEqual(["deep-analysis", "citation-gen", "summary-format"]);
    expect(def.model).not.toBe("inherited");
    const m = def.model as { name: string; temperature: number };
    expect(m.name).toBe("opus");
    expect(m.temperature).toBe(0.7);
  });

  it("returns empty skills and base model when no profile specified", () => {
    const doc = parseRichAgentMarkdown("test.md", readFixture("valid-full.agent.md"));
    const def = loadAgent(doc);
    expect(def.skills).toEqual([]);
    expect(def.activeProfile).toBeUndefined();
    expect(def.model).not.toBe("inherited");
  });

  it("returns 'inherited' model when no model config in source", () => {
    const doc = parseRichAgentMarkdown("test.md", readFixture("valid-no-model.agent.md"));
    const def = loadAgent(doc);
    expect(def.model).toBe("inherited");
  });

  it("includes version when frontmatter defines it", () => {
    const doc = parseRichAgentMarkdown("test.md", readFixture("valid-with-version.agent.md"));
    const def = loadAgent(doc);
    expect(def.version).toBe("2.0.0");
  });

  it("omits version when frontmatter does not define it", () => {
    const doc = parseRichAgentMarkdown("test.md", readFixture("valid-minimal.agent.md"));
    const def = loadAgent(doc);
    expect(def.version).toBeUndefined();
  });

  it("passes extensions through opaque (no harness interpretation)", () => {
    const doc = loadFixture("valid-full.agent.md");
    const def = loadAgent(doc);
    expect(def.extensions["archetype"]).toBe("analyzer");
    expect(def.extensions["scenario"]).toBe("meeting");
  });

  it("extensions are independent copy (mutation does not affect doc)", () => {
    const doc = loadFixture("valid-full.agent.md");
    const def = loadAgent(doc);
    (def.extensions as Record<string, unknown>)["injected"] = true;
    expect(doc.extensions["injected"]).toBeUndefined();
  });

  it("production JSON output is consistent with loadAgent() data", () => {
    const doc = parseRichAgentMarkdown("test.md", readFixture("valid-full.agent.md"));
    const def = loadAgent(doc, "review");
    const json = JSON.parse(composeSubagent(doc, "production", "review"));
    expect(json.name).toBe(def.name);
    expect(json.prompt).toBe(def.prompt);
    expect(json.activeProfile).toBe(def.activeProfile);
    expect(json.skills).toEqual(def.skills);
  });
});

describe("validateAgentDefinition — typed contract (issue #16)", () => {
  it("passes for a well-formed definition", () => {
    const doc = parseRichAgentMarkdown("test.md", readFixture("valid-full.agent.md"));
    const def = loadAgent(doc, "live");
    const result = validateAgentDefinition(def);
    expect(result.ok).toBe(true);
    expect(result.issues).toHaveLength(0);
  });

  it("errors on empty prompt", () => {
    const doc = parseRichAgentMarkdown("test.md", readFixture("valid-full.agent.md"));
    const def = loadAgent(doc);
    def.prompt = "   ";
    const result = validateAgentDefinition(def);
    expect(result.ok).toBe(false);
    expect(result.issues.some(i => i.code === "E_CONTRACT_PROMPT")).toBe(true);
  });

  it("errors on empty model name when model is not 'inherited'", () => {
    const doc = parseRichAgentMarkdown("test.md", readFixture("valid-full.agent.md"));
    const def = loadAgent(doc);
    def.model = { name: "  " };
    const result = validateAgentDefinition(def);
    expect(result.ok).toBe(false);
    expect(result.issues.some(i => i.code === "E_CONTRACT_MODEL_NAME")).toBe(true);
  });

  it("passes when model is 'inherited'", () => {
    const doc = parseRichAgentMarkdown("test.md", readFixture("valid-no-model.agent.md"));
    const def = loadAgent(doc);
    expect(def.model).toBe("inherited");
    const result = validateAgentDefinition(def);
    expect(result.ok).toBe(true);
  });
});

describe("resolveModel", () => {
  it("returns base model when no profile specified", () => {
    const doc = parseRichAgentMarkdown("test.md", readFixture("valid-full.agent.md"));
    const model = resolveModel(doc);
    expect(model?.name).toBe("sonnet");
    expect(model?.temperature).toBe(0.3);
  });

  it("returns base model when profile has no model override", () => {
    const doc = parseRichAgentMarkdown("test.md", readFixture("valid-full.agent.md"));
    const model = resolveModel(doc, "live");
    expect(model?.name).toBe("sonnet");
    expect(model?.temperature).toBe(0.3);
  });

  it("shallow-merges profile model override with base", () => {
    const doc = parseRichAgentMarkdown("test.md", readFixture("valid-full.agent.md"));
    const model = resolveModel(doc, "review");
    expect(model?.name).toBe("opus");
    expect(model?.temperature).toBe(0.7);
    expect(model?.maxTokens).toBe(4096);
  });

  it("returns undefined when no model config at all", () => {
    const doc = parseRichAgentMarkdown("test.md", readFixture("valid-no-model.agent.md"));
    const model = resolveModel(doc);
    expect(model).toBeUndefined();
  });
});
