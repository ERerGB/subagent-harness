import { describe, it, expect } from "vitest";
import { parseRichAgentMarkdown } from "../src/parse.js";
import { readFixture } from "./helpers.js";

describe("parseRichAgentMarkdown", () => {
  // ── Prompt pillar ──────────────────────────────────────────────

  it("extracts body as trimmed prompt text", () => {
    const doc = parseRichAgentMarkdown("test.md", readFixture("valid-full.agent.md"));
    expect(doc.body).toContain("You are a test agent");
    expect(doc.body).toContain("## Rules");
    expect(doc.body.startsWith("\n")).toBe(false);
  });

  it("preserves multiline body structure", () => {
    const doc = parseRichAgentMarkdown("test.md", readFixture("valid-full.agent.md"));
    expect(doc.body).toContain("- Be precise");
    expect(doc.body).toContain("- Be concise");
  });

  // ── Core frontmatter scalars ───────────────────────────────────

  it("parses name as kebab-case string", () => {
    const doc = parseRichAgentMarkdown("test.md", readFixture("valid-full.agent.md"));
    expect(doc.frontmatter.name).toBe("test-agent");
  });

  it("parses folded scalar description", () => {
    const doc = parseRichAgentMarkdown("test.md", readFixture("valid-full.agent.md"));
    expect(doc.frontmatter.description).toContain("fully specified agent");
    expect(doc.frontmatter.description).not.toContain("\n");
  });

  it("parses inline description", () => {
    const doc = parseRichAgentMarkdown("test.md", readFixture("valid-minimal.agent.md"));
    expect(doc.frontmatter.description).toBe("Bare minimum required fields only");
  });

  it("parses archetype and scenario", () => {
    const doc = parseRichAgentMarkdown("test.md", readFixture("valid-full.agent.md"));
    expect(doc.frontmatter.archetype).toBe("analyzer");
    expect(doc.frontmatter.scenario).toBe("meeting");
  });

  it("stores sourcePath from argument", () => {
    const doc = parseRichAgentMarkdown("/some/path.md", readFixture("valid-minimal.agent.md"));
    expect(doc.sourcePath).toBe("/some/path.md");
  });

  // ── Model Config pillar ────────────────────────────────────────

  it("parses full model config block", () => {
    const doc = parseRichAgentMarkdown("test.md", readFixture("valid-full.agent.md"));
    expect(doc.frontmatter.model).toBeDefined();
    expect(doc.frontmatter.model!.name).toBe("sonnet");
    expect(doc.frontmatter.model!.temperature).toBe(0.3);
    expect(doc.frontmatter.model!.maxTokens).toBe(4096);
  });

  it("parses partial model config (name only)", () => {
    const doc = parseRichAgentMarkdown("test.md", readFixture("valid-model-partial.agent.md"));
    expect(doc.frontmatter.model).toBeDefined();
    expect(doc.frontmatter.model!.name).toBe("haiku");
    expect(doc.frontmatter.model!.temperature).toBeUndefined();
    expect(doc.frontmatter.model!.maxTokens).toBeUndefined();
  });

  it("returns undefined model when not present in frontmatter", () => {
    const doc = parseRichAgentMarkdown("test.md", readFixture("valid-no-model.agent.md"));
    expect(doc.frontmatter.model).toBeUndefined();
  });

  // ── Profiles pillar ────────────────────────────────────────────

  it("parses profiles with default, skills, and model overrides", () => {
    const doc = parseRichAgentMarkdown("test.md", readFixture("valid-full.agent.md"));
    const p = doc.frontmatter.profiles;
    expect(p).toBeDefined();
    expect(p!.default).toBe("live");
    expect(p!.profiles["live"].skills).toEqual(["fact-check", "real-time-cite"]);
    expect(p!.profiles["review"].skills).toEqual(["deep-analysis", "citation-gen", "summary-format"]);
    expect(p!.profiles["review"].model).toEqual({ name: "opus", temperature: 0.7 });
  });

  it("parses profiles without model overrides", () => {
    const doc = parseRichAgentMarkdown("test.md", readFixture("valid-profiles-no-override.agent.md"));
    const p = doc.frontmatter.profiles;
    expect(p).toBeDefined();
    expect(p!.profiles["standard"].skills).toEqual(["detect", "classify"]);
    expect(p!.profiles["standard"].model).toBeUndefined();
    expect(p!.profiles["verbose"].skills).toEqual(["detect", "classify", "explain", "trace"]);
  });

  it("parses single-profile agent", () => {
    const doc = parseRichAgentMarkdown("test.md", readFixture("valid-single-profile.agent.md"));
    const p = doc.frontmatter.profiles;
    expect(p).toBeDefined();
    expect(p!.default).toBe("only");
    expect(Object.keys(p!.profiles)).toHaveLength(1);
    expect(p!.profiles["only"].skills).toEqual(["respond", "summarize"]);
  });

  it("returns undefined profiles when not present", () => {
    const doc = parseRichAgentMarkdown("test.md", readFixture("valid-minimal.agent.md"));
    expect(doc.frontmatter.profiles).toBeUndefined();
  });

  // ── Error paths ────────────────────────────────────────────────

  it("throws on missing frontmatter delimiters", () => {
    expect(() => parseRichAgentMarkdown("bad.md", "no frontmatter here"))
      .toThrow("Invalid frontmatter");
  });

  it("throws on missing required key (name)", () => {
    expect(() => parseRichAgentMarkdown("bad.md", readFixture("invalid-no-name.agent.md")))
      .toThrow("Missing required key: name");
  });
});
