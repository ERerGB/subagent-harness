import { describe, it, expect, beforeAll } from "vitest";
import { mkdtempSync, writeFileSync, mkdirSync, cpSync, readFileSync, existsSync } from "node:fs";
import { join, resolve, dirname } from "node:path";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";

const PKG_ROOT = resolve(dirname(import.meta.dirname));
const CLI = join(PKG_ROOT, "dist", "cli.js");
const FIXTURE_AGENT = join(PKG_ROOT, "tests", "fixtures", "valid-minimal.agent.md");
const FIXTURE_INVALID_MODEL = join(PKG_ROOT, "tests", "fixtures", "invalid-empty-model-name.agent.md");

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

  it("exits 1 when any agent fails validation or compose contract (issue #15)", () => {
    const root = mkdtempSync(join(tmpdir(), "subagent-cli-exit-"));
    const agents = join(root, "agents");
    const outProd = join(root, "out-prod");
    mkdirSync(agents, { recursive: true });
    cpSync(FIXTURE_INVALID_MODEL, join(agents, "bad.agent.md"));

    writeFileSync(
      join(root, "subagent.config.json"),
      JSON.stringify({
        src: "agents",
        targets: [{ runtime: "production", dst: outProd }],
      }),
      "utf8",
    );

    const { status, stderr } = runCli(root, ["--dry-run", "--target", "production"]);
    expect(status).toBe(1);
    expect(stderr).toContain("E_MODEL_NAME");
  });

  it("--verify passes after --apply and fails on drift", () => {
    const root = mkdtempSync(join(tmpdir(), "subagent-cli-verify-"));
    const agents = join(root, "agents");
    const outProd = join(root, "out-prod");
    mkdirSync(agents, { recursive: true });
    cpSync(FIXTURE_AGENT, join(agents, "valid-minimal.agent.md"));

    writeFileSync(
      join(root, "subagent.config.json"),
      JSON.stringify({
        src: "agents",
        targets: [{ runtime: "production", dst: outProd }],
      }),
      "utf8",
    );

    expect(runCli(root, ["--apply", "--target", "production"]).status).toBe(0);
    expect(runCli(root, ["--verify", "--target", "production"]).status).toBe(0);

    const jsonPath = join(outProd, "valid-minimal.json");
    const j = JSON.parse(readFileSync(jsonPath, "utf8"));
    j.name = "tampered";
    writeFileSync(jsonPath, JSON.stringify(j, null, 2) + "\n", "utf8");

    const drift = runCli(root, ["--verify", "--target", "production"]);
    expect(drift.status).toBe(1);
    expect(drift.stderr).toContain("E_VERIFY_DRIFT");
  });

  it("--verify exits 2 when no production target is active", () => {
    const root = mkdtempSync(join(tmpdir(), "subagent-cli-verify-"));
    mkdirSync(join(root, "agents"), { recursive: true });
    writeFileSync(
      join(root, "subagent.config.json"),
      JSON.stringify({
        src: "agents",
        targets: [{ runtime: "cursor", dst: join(root, "out") }],
      }),
      "utf8",
    );

    const { status, stderr } = runCli(root, ["--verify", "--target", "cursor"]);
    expect(status).toBe(2);
    expect(stderr).toContain("E_VERIFY_NO_PRODUCTION");
  });

  it("rejects --verify with --apply", () => {
    const root = mkdtempSync(join(tmpdir(), "subagent-cli-verify-"));
    mkdirSync(join(root, "agents"), { recursive: true });
    writeFileSync(
      join(root, "subagent.config.json"),
      JSON.stringify({
        src: "agents",
        targets: [{ runtime: "production", dst: join(root, "out") }],
      }),
      "utf8",
    );

    const { status, stderr } = runCli(root, ["--verify", "--apply", "--target", "production"]);
    expect(status).toBe(2);
    expect(stderr).toContain("E_COMPOSE_ARG");
  });
});
