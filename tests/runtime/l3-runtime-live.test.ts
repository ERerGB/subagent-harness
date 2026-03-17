import { describe, it, expect, beforeAll } from "vitest";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";
import { loadAgentFromDisk } from "../../src/parse.js";
import { composeSubagent } from "../../src/compose.js";

const TEMPLATE_PATH = join(resolve(import.meta.dirname, "..", "e2e"), "template.agent.md");
const PROD_CHECKER = join(resolve(import.meta.dirname), "production-runtime-check.mjs");

function requiredTargets(): Set<string> {
  const raw = process.env["L3_REQUIRE_TARGETS"] ?? "";
  return new Set(raw.split(",").map(s => s.trim()).filter(Boolean));
}

function assertCommandAvailable(target: string, command: string | undefined): void {
  const required = requiredTargets().has(target);
  if (!command && required) {
    throw new Error(`E_L3_REQUIRED_TARGET: ${target} required but command is missing`);
  }
}

describe("L3 Runtime Live Smoke", () => {
  let dir = "";
  let cursorPath = "";
  let claudePath = "";
  let prodPath = "";

  beforeAll(() => {
    dir = mkdtempSync(join(tmpdir(), "subagent-l3-"));
    const doc = loadAgentFromDisk(TEMPLATE_PATH);

    cursorPath = join(dir, "cursor.md");
    claudePath = join(dir, "claude.md");
    prodPath = join(dir, "production.json");

    writeFileSync(cursorPath, composeSubagent(doc, "cursor"), "utf8");
    writeFileSync(claudePath, composeSubagent(doc, "claude-code"), "utf8");
    writeFileSync(prodPath, composeSubagent(doc, "production"), "utf8");
  });

  it("production runtime loads and executes in Node process", () => {
    const run = spawnSync("node", [PROD_CHECKER, prodPath], { encoding: "utf8" });
    expect(run.status).toBe(0);
    expect(run.stdout).toContain("\"ok\":true");
  });

  it("cursor runtime command probe (optional, real env)", () => {
    const cmd = process.env["CURSOR_RUNTIME_CHECK_CMD"];
    assertCommandAvailable("cursor", cmd);
    if (!cmd) return;

    const run = spawnSync(cmd, {
      shell: true,
      encoding: "utf8",
      env: { ...process.env, AGENT_FILE: cursorPath },
    });
    expect(run.status).toBe(0);
  });

  it("claude runtime command probe (optional, real env)", () => {
    const cmd = process.env["CLAUDE_RUNTIME_CHECK_CMD"];
    assertCommandAvailable("claude", cmd);
    if (!cmd) return;

    const run = spawnSync(cmd, {
      shell: true,
      encoding: "utf8",
      env: { ...process.env, AGENT_FILE: claudePath },
    });
    expect(run.status).toBe(0);
  });

  it("cleanup temp artifacts", () => {
    rmSync(dir, { recursive: true, force: true });
    expect(true).toBe(true);
  });
});
