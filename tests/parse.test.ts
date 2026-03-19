import { describe, it, expect } from "vitest";
import { parseRichAgentMarkdown, parseExtensionsYaml, loadAgentFromDisk } from "../src/parse.js";
import { readFixture } from "./helpers.js";
import { resolve, join } from "node:path";

const FIXTURES_DIR = resolve(import.meta.dirname, "fixtures");

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

  it("stores sourcePath from argument", () => {
    const doc = parseRichAgentMarkdown("/some/path.md", readFixture("valid-minimal.agent.md"));
    expect(doc.sourcePath).toBe("/some/path.md");
  });

  it("initializes extensions as empty object", () => {
    const doc = parseRichAgentMarkdown("test.md", readFixture("valid-full.agent.md"));
    expect(doc.extensions).toEqual({});
  });

  // ── Core schema: no non-core fields ─────────────────────────────

  it("frontmatter only contains core fields when schemaVersion absent", () => {
    const doc = parseRichAgentMarkdown("test.md", readFixture("valid-full.agent.md"));
    const keys = Object.keys(doc.frontmatter);
    expect(keys.sort()).toEqual(["description", "model", "name", "profiles"].sort());
  });

  // ── schemaVersion ─────────────────────────────────────────────

  it("parses optional schemaVersion when present", () => {
    const doc = parseRichAgentMarkdown("test.md", readFixture("valid-with-schema-version.agent.md"));
    expect(doc.frontmatter.schemaVersion).toBe("1");
  });

  it("omits schemaVersion key when not in frontmatter", () => {
    const doc = parseRichAgentMarkdown("test.md", readFixture("valid-full.agent.md"));
    expect(doc.frontmatter.schemaVersion).toBeUndefined();
    expect("schemaVersion" in doc.frontmatter).toBe(false);
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
  });

  it("parses single-profile agent", () => {
    const doc = parseRichAgentMarkdown("test.md", readFixture("valid-single-profile.agent.md"));
    const p = doc.frontmatter.profiles;
    expect(p).toBeDefined();
    expect(p!.default).toBe("only");
    expect(Object.keys(p!.profiles)).toHaveLength(1);
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

// ═══════════════════════════════════════════════════════════════════
// Extensions parser
// ═══════════════════════════════════════════════════════════════════

describe("parseExtensionsYaml", () => {
  it("parses scalar fields", () => {
    const ext = parseExtensionsYaml("scenario: meeting\narchetype: analyzer\n");
    expect(ext.scenario).toBe("meeting");
    expect(ext.archetype).toBe("analyzer");
  });

  it("parses nested block fields", () => {
    const ext = parseExtensionsYaml("evolution:\n  engine: hacker\n  cycle: 12\n");
    expect(ext.evolution).toEqual({ engine: "hacker", cycle: "12" });
  });

  it("ignores comment lines", () => {
    const ext = parseExtensionsYaml("# comment\nscenario: meeting\n");
    expect(ext.scenario).toBe("meeting");
    expect(Object.keys(ext)).toHaveLength(1);
  });

  it("returns empty object for empty content", () => {
    expect(parseExtensionsYaml("")).toEqual({});
    expect(parseExtensionsYaml("\n\n")).toEqual({});
  });
});

// ═══════════════════════════════════════════════════════════════════
// loadAgentFromDisk (sidecar merge)
// ═══════════════════════════════════════════════════════════════════

describe("loadAgentFromDisk", () => {
  it("loads core .agent.md and merges .ext.yaml sidecar", () => {
    const doc = loadAgentFromDisk(join(FIXTURES_DIR, "valid-full.agent.md"));
    expect(doc.frontmatter.name).toBe("test-agent");
    expect(doc.extensions.archetype).toBe("analyzer");
    expect(doc.extensions.scenario).toBe("meeting");
    expect(doc.extensions.adr).toBe("ADR-001");
  });

  it("loads core .agent.md with empty extensions when no sidecar exists", () => {
    const doc = loadAgentFromDisk(join(FIXTURES_DIR, "valid-minimal.agent.md"));
    expect(doc.frontmatter.name).toBe("bare-bones");
    expect(doc.extensions).toEqual({});
  });

  it("merges nested extension blocks", () => {
    const doc = loadAgentFromDisk(join(FIXTURES_DIR, "valid-generic.agent.md"));
    expect(doc.extensions.scenario).toBe("prompt-evolution");
    expect(doc.extensions.evolution).toEqual({ engine: "hacker", cycle: "0" });
  });
});
