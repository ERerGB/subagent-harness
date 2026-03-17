import { describe, it, expect } from "vitest";
import { parseRichAgentMarkdown } from "../src/parse.js";
import { patchAgent } from "../src/patch.js";
import { readFixture, loadFixture } from "./helpers.js";

describe("patchAgent", () => {
  // ── Frontmatter scalar patches ─────────────────────────────────

  it("patches name field", () => {
    const doc = parseRichAgentMarkdown("test.md", readFixture("valid-full.agent.md"));
    const patched = patchAgent(doc, { path: "name", value: "renamed-agent" });
    expect(patched.frontmatter.name).toBe("renamed-agent");
  });

  it("patches description field", () => {
    const doc = parseRichAgentMarkdown("test.md", readFixture("valid-full.agent.md"));
    const patched = patchAgent(doc, { path: "description", value: "New description" });
    expect(patched.frontmatter.description).toBe("New description");
  });

  // ── Model config patches ───────────────────────────────────────

  it("patches model.name", () => {
    const doc = parseRichAgentMarkdown("test.md", readFixture("valid-full.agent.md"));
    const patched = patchAgent(doc, { path: "model.name", value: "opus" });
    expect(patched.frontmatter.model?.name).toBe("opus");
    expect(patched.frontmatter.model?.temperature).toBe(0.3);
  });

  it("patches model.temperature", () => {
    const doc = parseRichAgentMarkdown("test.md", readFixture("valid-full.agent.md"));
    const patched = patchAgent(doc, { path: "model.temperature", value: 0.9 });
    expect(patched.frontmatter.model?.temperature).toBe(0.9);
    expect(patched.frontmatter.model?.name).toBe("sonnet");
  });

  it("creates model block when patching model.name on agent without model", () => {
    const doc = parseRichAgentMarkdown("test.md", readFixture("valid-no-model.agent.md"));
    expect(doc.frontmatter.model).toBeUndefined();
    const patched = patchAgent(doc, { path: "model.name", value: "haiku" });
    expect(patched.frontmatter.model?.name).toBe("haiku");
  });

  // ── Body patch ─────────────────────────────────────────────────

  it("patches body content", () => {
    const doc = parseRichAgentMarkdown("test.md", readFixture("valid-minimal.agent.md"));
    const patched = patchAgent(doc, { path: "body", value: "New prompt.\n" });
    expect(patched.body).toBe("New prompt.\n");
  });

  // ── Extensions patch ───────────────────────────────────────────

  it("patches extension field", () => {
    const doc = loadFixture("valid-full.agent.md");
    const patched = patchAgent(doc, { path: "extensions.scenario", value: "creator" });
    expect(patched.extensions.scenario).toBe("creator");
    expect(patched.extensions.archetype).toBe("analyzer");
  });

  it("adds new extension field", () => {
    const doc = parseRichAgentMarkdown("test.md", readFixture("valid-minimal.agent.md"));
    const patched = patchAgent(doc, { path: "extensions.custom", value: "hello" });
    expect(patched.extensions.custom).toBe("hello");
  });

  // ── Immutability ───────────────────────────────────────────────

  it("does not mutate the original document", () => {
    const doc = parseRichAgentMarkdown("test.md", readFixture("valid-full.agent.md"));
    const originalName = doc.frontmatter.name;
    patchAgent(doc, { path: "name", value: "mutated" });
    expect(doc.frontmatter.name).toBe(originalName);
  });

  it("does not mutate original model config", () => {
    const doc = parseRichAgentMarkdown("test.md", readFixture("valid-full.agent.md"));
    const originalTemp = doc.frontmatter.model?.temperature;
    patchAgent(doc, { path: "model.temperature", value: 1.5 });
    expect(doc.frontmatter.model?.temperature).toBe(originalTemp);
  });

  it("does not mutate original extensions", () => {
    const doc = loadFixture("valid-full.agent.md");
    const original = doc.extensions.scenario;
    patchAgent(doc, { path: "extensions.scenario", value: "changed" });
    expect(doc.extensions.scenario).toBe(original);
  });

  // ── Error paths ────────────────────────────────────────────────

  it("throws on unsupported top-level path", () => {
    const doc = parseRichAgentMarkdown("test.md", readFixture("valid-minimal.agent.md"));
    expect(() => patchAgent(doc, { path: "sourcePath", value: "x" }))
      .toThrow("unsupported");
  });
});
