import { describe, it, expect } from "vitest";
import { parseRichAgentMarkdown } from "../src/parse.js";
import { composeSubagent, resolveModel } from "../src/compose.js";
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
