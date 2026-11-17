import { describe, it, expect, afterAll } from "vitest";
import { mkdtempSync, mkdirSync, writeFileSync, existsSync, rmSync, symlinkSync, readFileSync, utimesSync } from "node:fs";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";
import { parse } from "yaml";
import { serializeAgent, serializeExtensions } from "../src/serialize.js";
import { parseRichAgentMarkdown, parseExtensionsYaml } from "../src/parse.js";
import { composeSubagent } from "../src/compose.js";
import { patchAgent } from "../src/patch.js";

const root = resolve(import.meta.dirname, "..");
const temp = mkdtempSync(join(tmpdir(), "harness-regression-"));
afterAll(() => rmSync(temp, { recursive: true, force: true }));
const body = '---\nname: demo\ndescription: Demo\nprofiles:\n  default: live\n  live:\n    skills: [sample]\n---\n\nDo the work.\n';
const run = (script: string, args: string[], cwd = root, env = {}) => spawnSync(process.execPath, [join(root, script), ...args], { cwd, encoding: "utf8", timeout: 10000, env: { ...process.env, ...env } });
function fixture(name: string) {
  const dir = join(temp, name); mkdirSync(join(dir, "agents"), { recursive: true });
  writeFileSync(join(dir, "agents/demo.agent.md"), body);
  return dir;
}

describe("support contract regressions", () => {
  it("round-trips version, empty profiles, punctuation and nested extension types", () => {
    const doc = parseRichAgentMarkdown("demo", body);
    doc.frontmatter.version = "1.2.3";
    doc.frontmatter.description = "Status: yes\nSecond line";
    doc.frontmatter.profiles!.profiles.live.skills = [];
    const reparsed = parseRichAgentMarkdown("demo", serializeAgent(doc));
    expect(reparsed.frontmatter).toEqual(doc.frontmatter);
    const extensions = { config: { nested: { items: ["a,b", "false", false, 3], nil: null } } };
    expect(parseExtensionsYaml(serializeExtensions(extensions))).toEqual(extensions);
    for (const target of ["cursor", "codex", "claude-code"] as const) {
      expect(parse(composeSubagent(doc, target).split("---\n")[1]).description).toBe(doc.frontmatter.description);
    }
  });
  it("core identity cannot be overwritten by sidecar and unknown profile fails", () => {
    const doc = parseRichAgentMarkdown("demo", body);
    doc.frontmatter.version = "1"; doc.extensions = { name: "forged", description: "forged", version: "0" };
    const out = JSON.parse(composeSubagent(doc, "production"));
    expect(out.name).toBe("demo"); expect(out.version).toBe("1");
    expect(() => composeSubagent(doc, "production", "typo")).toThrow("Unknown profile");
    expect(() => patchAgent(doc, { path: "extensions.config.nested", value: 1 })).toThrow("unsupported");
    expect(() => patchAgent(doc, { path: "model.typo", value: 1 })).toThrow("unsupported");
  });
  it("dry-run and clean never create or bundle skills", () => {
    const dir = fixture("preview");
    mkdirSync(join(dir, "skills/sample"), { recursive: true });
    writeFileSync(join(dir, "skills/sample/SKILL.md"), "fixture");
    writeFileSync(join(dir, "subagent.config.json"), JSON.stringify({ src: "agents", targets: [{ runtime: "cursor", dst: "out", skillsSrc: "skills", skillsDst: "bundled" }] }));
    for (const flag of ["--dry-run", "--clean"]) {
      expect(run("dist/cli.js", [flag], dir).status).toBe(0);
      expect(existsSync(join(dir, "out"))).toBe(false);
      expect(existsSync(join(dir, "bundled"))).toBe(false);
    }
  });
  it("rejects output collisions and traversal before writing", () => {
    const dir = fixture("collision"); mkdirSync(join(dir, "agents/nested"));
    writeFileSync(join(dir, "agents/nested/demo.agent.md"), body);
    const result = run("dist/cli.js", ["--src", "agents", "--dst", "out", "--apply"], dir);
    expect(result.status).not.toBe(0); expect(result.stderr).toContain("E_COMPOSE_COLLISION");
    expect(existsSync(join(dir, "out"))).toBe(false);
    rmSync(join(dir, "agents/nested"), { recursive: true });
    writeFileSync(join(dir, "agents/demo.agent.md"), body.replace("[sample]", "[../outside]"));
    expect(run("dist/cli.js", ["--src", "agents", "--dst", "out", "--apply"], dir).stderr).toContain("E_SKILL_PATH");
    expect(existsSync(join(dir, "out"))).toBe(false);
  });
  it("does not follow source symlink cycles and rejects missing option values", () => {
    const dir = fixture("cycle"); symlinkSync(join(dir, "agents"), join(dir, "agents/loop"));
    expect(run("dist/cli.js", ["--src", "agents", "--dst", "out"], dir).status).toBe(0);
    expect(run("dist/cli.js", ["--src", "--apply"], dir).status).not.toBe(0);
  });
  it("includes newer sidecars in mtime freshness checks", () => {
    const dir = fixture("sidecar");
    const args = ["--src", "agents", "--dst", "out"];
    expect(run("dist/cli.js", [...args, "--apply"], dir).status).toBe(0);
    const sidecar = join(dir, "agents/demo.agent.ext.yaml"); writeFileSync(sidecar, "config: {}\n");
    const future = new Date(Date.now() + 3000); utimesSync(sidecar, future, future);
    expect(run("dist/cli.js", [...args, "--check"], dir).status).toBe(1);
  });
  it("legacy wrapper composes multiple agents through canonical YAML parser", () => {
    const dir = fixture("wrapper"); writeFileSync(join(dir, "agents/second.agent.md"), body);
    const out = spawnSync("bash", [join(root, "scripts/compose-agents.sh"), "--src", "agents", "--dst", "out", "--apply"], { cwd: dir, encoding: "utf8" });
    expect(out.status).toBe(0); expect(existsSync(join(dir, "out/second.md"))).toBe(true);
  });
  it("API probe rejects truthy false and enforces an asynchronous timeout", () => {
    const artifact = join(temp, "artifact.json"); writeFileSync(artifact, "{}");
    const module = join(temp, "probe.mjs"); writeFileSync(module, 'export default async () => ({ok: "false"});');
    let result = run("scripts/subject-sdk-probe.mjs", ["--probe", "api", "--artifact", artifact, "--timeout-ms", "100"], root, { SUBJECT_HARNESS_API_MODULE: module });
    expect(result.status).toBe(1); expect(JSON.parse(result.stdout).ok).toBe(false);
    writeFileSync(module, 'export default async () => new Promise(() => {});');
    result = run("scripts/subject-sdk-probe.mjs", ["--probe", "api", "--artifact", artifact, "--timeout-ms", "100"], root, { SUBJECT_HARNESS_API_MODULE: module });
    expect(result.status).toBe(1); expect(JSON.parse(result.stdout).errorCode).toBe("E_SUBJECT_API_TIMEOUT");
  });
  it("matrix passes literal paths without shell substitution", () => {
    const dir = fixture("matrix");
    const marker = `harness-injected-${process.pid}`;
    const agent = join(dir, `$(touch ${marker}).agent.md`); writeFileSync(agent, body);
    const result = run("scripts/run-matrix.mjs", ["--agent", agent, "--targets", "production", "--strict", "--l1-cmd", "true", "--l2-cmd", "true"]);
    expect(result.status).toBe(0); expect(existsSync(join(root, marker))).toBe(false);
  });
});
