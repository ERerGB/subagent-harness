import { describe, it, expect } from "vitest";
import { loadFixture } from "./helpers.js";
import { composeSubagent } from "../src/compose.js";
import { validateProductionComposeOutput } from "../src/compose-contract.js";

describe("validateProductionComposeOutput", () => {
  it("accepts valid composed production JSON (full profiles)", () => {
    const doc = loadFixture("valid-full.agent.md");
    const json = JSON.parse(composeSubagent(doc, "production"));
    const r = validateProductionComposeOutput(doc, json);
    expect(r.ok).toBe(true);
  });

  it("accepts profile-resolved JSON when model comes from profile", () => {
    const doc = loadFixture("valid-full.agent.md");
    const json = JSON.parse(composeSubagent(doc, "production", "review"));
    const r = validateProductionComposeOutput(doc, json, "review");
    expect(r.ok).toBe(true);
  });

  it("accepts agent without model (inherited)", () => {
    const doc = loadFixture("valid-minimal.agent.md");
    const json = JSON.parse(composeSubagent(doc, "production"));
    const r = validateProductionComposeOutput(doc, json);
    expect(r.ok).toBe(true);
  });

  it("rejects empty prompt", () => {
    const doc = loadFixture("valid-full.agent.md");
    const json = JSON.parse(composeSubagent(doc, "production"));
    json.prompt = "   ";
    const r = validateProductionComposeOutput(doc, json);
    expect(r.ok).toBe(false);
    expect(r.issues.some(i => i.code === "E_CONTRACT_PROMPT")).toBe(true);
  });

  it("rejects missing model object when source declares model", () => {
    const doc = loadFixture("valid-full.agent.md");
    const json = JSON.parse(composeSubagent(doc, "production"));
    json.model = "inherited";
    const r = validateProductionComposeOutput(doc, json);
    expect(r.ok).toBe(false);
    expect(r.issues.some(i => i.code === "E_CONTRACT_MODEL")).toBe(true);
  });

  it("rejects model.name drift", () => {
    const doc = loadFixture("valid-full.agent.md");
    const json = JSON.parse(composeSubagent(doc, "production"));
    json.model = { ...json.model, name: "wrong-model" };
    const r = validateProductionComposeOutput(doc, json);
    expect(r.ok).toBe(false);
    expect(r.issues.some(i => i.code === "E_CONTRACT_MODEL_DRIFT")).toBe(true);
  });

  it("matches contentSchema top-level keys from extension to output", () => {
    const doc = loadFixture("contract-schema.agent.md");
    const json = JSON.parse(composeSubagent(doc, "production", "only"));
    const r = validateProductionComposeOutput(doc, json, "only");
    expect(r.ok).toBe(true);
  });

  it("rejects when contentSchema keys differ", () => {
    const doc = loadFixture("contract-schema.agent.md");
    const json = JSON.parse(composeSubagent(doc, "production", "only"));
    delete (json.contentSchema as Record<string, unknown>).body;
    const r = validateProductionComposeOutput(doc, json, "only");
    expect(r.ok).toBe(false);
    expect(r.issues.some(i => i.code === "E_CONTRACT_CONTENTSCHEMA_KEYS")).toBe(true);
  });
});
