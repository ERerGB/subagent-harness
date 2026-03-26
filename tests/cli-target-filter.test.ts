import { describe, it, expect, beforeAll } from "vitest";
import { mkdtempSync, writeFileSync, mkdirSync, cpSync, readFileSync, existsSync } from "node:fs";
import { join, resolve, dirname } from "node:path";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";

const PKG_ROOT = resolve(dirname(import.meta.dirname));
const CLI = join(PKG_ROOT, "dist", "cli.js");
const FIXTURE_AGENT = join(PKG_ROOT, "tests", "fixtures", "valid-minimal.agent.md");

function runCli(cwd: string, args: string[]): { status: number | null; stdout: string; stderr: string } {
  const r = spawnSync(process.execPath, [CLI, ...args], {
    cwd,
    encoding: "utf8",
  });
  return {
    status: r.status,
    stdout: r.stdout ?? "",
    stderr: r.stderr ?? "",
  };
}

describe("CLI --target filter (issue #14)", () => {
  beforeAll(() => {
    if (!existsSync(CLI)) {
      throw new Error(`Missing ${CLI}; run pnpm build before this test file`);
    }
  });

  it("dry-run with --target production only logs production target", () => {
    const root = mkdtempSync(join(tmpdir(), "subagent-cli-target-"));
    const agents = join(root, "agents");
    const outCursor = join(root, "out-cursor");
    const outProd = join(root, "out-prod");
    mkdirSync(agents, { recursive: true });
    cpSync(FIXTURE_AGENT, join(agents, "valid-minimal.agent.md"));

    writeFileSync(
      join(root, "subagent.config.json"),
      JSON.stringify({
        src: "agents",
        targets: [
          { runtime: "cursor", dst: outCursor },
          { runtime: "production", dst: outProd },
        ],
      }),
      "utf8",
    );

    const { status, stdout, stderr } = runCli(root, ["--dry-run", "--target", "production"]);
    expect(status).toBe(0);
    expect(stderr).toBe("");
    expect(stdout).toContain("[production]");
    expect(stdout).not.toContain("[cursor]");
    expect(stdout).toContain(outProd);
    expect(stdout).not.toContain(outCursor);
  });

  it("dry-run with two --target flags visits both", () => {
    const root = mkdtempSync(join(tmpdir(), "subagent-cli-target-"));
    const agents = join(root, "agents");
    const outCursor = join(root, "out-cursor");
    const outCodex = join(root, "out-codex");
    mkdirSync(agents, { recursive: true });
    cpSync(FIXTURE_AGENT, join(agents, "valid-minimal.agent.md"));

    writeFileSync(
      join(root, "subagent.config.json"),
      JSON.stringify({
        src: "agents",
        targets: [
          { runtime: "cursor", dst: outCursor },
          { runtime: "codex", dst: outCodex },
          { runtime: "production", dst: join(root, "out-prod") },
        ],
      }),
      "utf8",
    );

    const { status, stdout } = runCli(root, ["--dry-run", "--target", "cursor", "--target", "codex"]);
    expect(status).toBe(0);
    expect(stdout).toContain("[cursor]");
    expect(stdout).toContain("[codex]");
    expect(stdout).not.toContain("[production]");
  });

  it("apply --target production writes only production artifact", () => {
    const root = mkdtempSync(join(tmpdir(), "subagent-cli-target-"));
    const agents = join(root, "agents");
    const outCursor = join(root, "out-cursor");
    const outProd = join(root, "out-prod");
    mkdirSync(agents, { recursive: true });
    cpSync(FIXTURE_AGENT, join(agents, "valid-minimal.agent.md"));

    writeFileSync(
      join(root, "subagent.config.json"),
      JSON.stringify({
        src: "agents",
        targets: [
          { runtime: "cursor", dst: outCursor },
          { runtime: "production", dst: outProd },
        ],
      }),
      "utf8",
    );

    const { status } = runCli(root, ["--apply", "--target", "production"]);
    expect(status).toBe(0);
    expect(existsSync(join(outProd, "valid-minimal.json"))).toBe(true);
    expect(existsSync(join(outCursor, "valid-minimal.md"))).toBe(false);
    const json = JSON.parse(readFileSync(join(outProd, "valid-minimal.json"), "utf8"));
    expect(json.name).toBe("bare-bones");
  });

  it("exits 2 for unknown runtime", () => {
    const root = mkdtempSync(join(tmpdir(), "subagent-cli-target-"));
    mkdirSync(join(root, "agents"), { recursive: true });
    writeFileSync(
      join(root, "subagent.config.json"),
      JSON.stringify({
        src: "agents",
        targets: [{ runtime: "cursor", dst: join(root, "out") }],
      }),
      "utf8",
    );

    const { status, stderr } = runCli(root, ["--dry-run", "--target", "not-a-runtime"]);
    expect(status).toBe(2);
    expect(stderr).toContain("E_COMPOSE_TARGET");
  });

  it("exits 2 when no config target matches filter", () => {
    const root = mkdtempSync(join(tmpdir(), "subagent-cli-target-"));
    mkdirSync(join(root, "agents"), { recursive: true });
    writeFileSync(
      join(root, "subagent.config.json"),
      JSON.stringify({
        src: "agents",
        targets: [{ runtime: "cursor", dst: join(root, "out") }],
      }),
      "utf8",
    );

    const { status, stderr } = runCli(root, ["--dry-run", "--target", "production"]);
    expect(status).toBe(2);
    expect(stderr).toContain("E_COMPOSE_TARGET");
    expect(stderr).toContain("no configured targets match");
  });

  it("rejects --target all combined with other runtimes", () => {
    const root = mkdtempSync(join(tmpdir(), "subagent-cli-target-"));
    mkdirSync(join(root, "agents"), { recursive: true });
    writeFileSync(
      join(root, "subagent.config.json"),
      JSON.stringify({
        src: "agents",
        targets: [{ runtime: "cursor", dst: join(root, "out") }],
      }),
      "utf8",
    );

    const { status, stderr } = runCli(root, ["--dry-run", "--target", "all", "--target", "cursor"]);
    expect(status).toBe(2);
    expect(stderr).toContain("E_COMPOSE_ARG");
  });

  it("legacy --src/--dst rejects --target codex", () => {
    const root = mkdtempSync(join(tmpdir(), "subagent-cli-target-"));
    const agents = join(root, "agents");
    const out = join(root, "out");
    mkdirSync(agents, { recursive: true });
    cpSync(FIXTURE_AGENT, join(agents, "valid-minimal.agent.md"));

    const { status, stderr } = runCli(root, [
      "--dry-run",
      "--src",
      agents,
      "--dst",
      out,
      "--target",
      "codex",
    ]);
    expect(status).toBe(2);
    expect(stderr).toContain("E_COMPOSE_TARGET");
    expect(stderr).toContain("legacy");
  });
});
