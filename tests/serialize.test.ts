import { describe, it, expect } from "vitest";
import { parseRichAgentMarkdown } from "../src/parse.js";
import { serializeAgent, serializeExtensions } from "../src/serialize.js";
import { readFixture, loadFixture } from "./helpers.js";
import type { RichAgentDocument } from "../src/types.js";

describe("serializeAgent", () => {
  // ── Round-trip: parse → serialize → re-parse ───────────────────

  it("round-trips a fully specified agent", () => {
    const doc = parseRichAgentMarkdown("test.md", readFixture("valid-full.agent.md"));
    const serialized = serializeAgent(doc);
    const reparsed = parseRichAgentMarkdown("test.md", serialized);
    expect(reparsed.frontmatter).toEqual(doc.frontmatter);
    expect(reparsed.body.trim()).toBe(doc.body.trim());
  });

  it("round-trips a minimal agent (name + description only)", () => {
    const doc = parseRichAgentMarkdown("test.md", readFixture("valid-minimal.agent.md"));
    const serialized = serializeAgent(doc);
    const reparsed = parseRichAgentMarkdown("test.md", serialized);
    expect(reparsed.frontmatter.name).toBe("bare-bones");
    expect(reparsed.frontmatter.description).toBe("Bare minimum required fields only");
    expect(reparsed.frontmatter.model).toBeUndefined();
    expect(reparsed.frontmatter.profiles).toBeUndefined();
  });

  it("round-trips agent with partial model config", () => {
    const doc = parseRichAgentMarkdown("test.md", readFixture("valid-model-partial.agent.md"));
    const serialized = serializeAgent(doc);
    const reparsed = parseRichAgentMarkdown("test.md", serialized);
    expect(reparsed.frontmatter.model?.name).toBe("haiku");
    expect(reparsed.frontmatter.model?.temperature).toBeUndefined();
  });

  it("round-trips agent with profiles including model overrides", () => {
    const doc = parseRichAgentMarkdown("test.md", readFixture("valid-full.agent.md"));
    const serialized = serializeAgent(doc);
    const reparsed = parseRichAgentMarkdown("test.md", serialized);
    expect(reparsed.frontmatter.profiles?.profiles["review"].model).toEqual({
      name: "opus",
      temperature: 0.7,
    });
  });

  // ── Structural correctness ─────────────────────────────────────

  it("outputs valid frontmatter delimiters", () => {
    const doc = parseRichAgentMarkdown("test.md", readFixture("valid-minimal.agent.md"));
    const serialized = serializeAgent(doc);
    expect(serialized.startsWith("---\n")).toBe(true);
    expect(serialized).toContain("\n---\n");
  });

  it("does not include extensions in .agent.md output", () => {
    const doc = loadFixture("valid-full.agent.md");
    expect(Object.keys(doc.extensions).length).toBeGreaterThan(0);
    const serialized = serializeAgent(doc);
    expect(serialized).not.toContain("archetype:");
    expect(serialized).not.toContain("scenario:");
    expect(serialized).not.toContain("adr:");
  });

  it("preserves body content after frontmatter", () => {
    const doc = parseRichAgentMarkdown("test.md", readFixture("valid-full.agent.md"));
    const serialized = serializeAgent(doc);
    expect(serialized).toContain("You are a test agent");
    expect(serialized).toContain("## Rules");
  });

  // ── Programmatic construction ──────────────────────────────────

  it("serializes a programmatically built document", () => {
    const doc: RichAgentDocument = {
      sourcePath: "synthetic.md",
      frontmatter: {
        name: "synth-agent",
        description: "Built in code",
        model: { name: "flash", temperature: 0.1 },
      },
      body: "Do the thing.\n",
      extensions: {},
    };
    const serialized = serializeAgent(doc);
    const reparsed = parseRichAgentMarkdown("test.md", serialized);
    expect(reparsed.frontmatter.name).toBe("synth-agent");
    expect(reparsed.frontmatter.model?.name).toBe("flash");
    expect(reparsed.frontmatter.model?.temperature).toBe(0.1);
  });
});

describe("serializeExtensions", () => {
  it("serializes flat scalar extensions", () => {
    const out = serializeExtensions({ scenario: "meeting", archetype: "analyzer" });
    expect(out).toContain("scenario: meeting");
    expect(out).toContain("archetype: analyzer");
  });

  it("serializes nested block extensions", () => {
    const out = serializeExtensions({
      evolution: { engine: "hacker", cycle: "3" },
    });
    expect(out).toContain("evolution:");
    expect(out).toContain("  engine: hacker");
    expect(out).toContain("  cycle: 3");
  });

  it("returns empty string for empty extensions", () => {
    expect(serializeExtensions({})).toBe("");
  });

  it("round-trips through parseExtensionsYaml", async () => {
    const { parseExtensionsYaml } = await import("../src/parse.js");
    const original = { scenario: "e2e", adr: "ADR-001" };
    const serialized = serializeExtensions(original);
    const reparsed = parseExtensionsYaml(serialized);
    expect(reparsed.scenario).toBe("e2e");
    expect(reparsed.adr).toBe("ADR-001");
  });
});
