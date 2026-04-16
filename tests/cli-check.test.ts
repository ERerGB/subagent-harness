/**
 * Integration tests for the --check CLI flag (issue #20).
 *
 * Spawns the CLI via bun so TypeScript runs without a prior build step.
 * Each test sets up its own temp dir to keep state isolated.
 */

import { describe, it, expect, afterEach } from "vitest";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync, utimesSync } from "node:fs";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";

const CLI = resolve(import.meta.dirname, "../src/cli.ts");
const FIXTURE_AGENT = resolve(import.meta.dirname, "fixtures/valid-minimal.agent.md");
const FIXTURE_CONTENT = readFileSync(FIXTURE_AGENT, "utf8");

/** Invoke the CLI and return { stdout, stderr, status }. */
function runCli(args: string[], cwd: string) {
  const result = spawnSync("bun", ["run", "--no-install", CLI, ...args], {
    cwd,
    encoding: "utf8",
    timeout: 15_000,
  });
  return {
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
    status: result.status ?? -1,
  };
}

const tmpDirs: string[] = [];

function makeTmp(): string {
  const d = mkdtempSync(join(tmpdir(), "subagent-check-"));
  tmpDirs.push(d);
  return d;
}

function setupDirs(root: string): { srcDir: string; dstDir: string } {
  const srcDir = join(root, "agents");
  const dstDir = join(root, "out");
  mkdirSync(srcDir, { recursive: true });
  mkdirSync(dstDir, { recursive: true });
  return { srcDir, dstDir };
}

function writeConfig(configDir: string, srcDir: string, dstDir: string) {
  writeFileSync(
    join(configDir, "subagent.config.json"),
    JSON.stringify({ src: srcDir, targets: [{ runtime: "cursor", dst: dstDir }] }),
    "utf8",
  );
}

afterEach(() => {
  for (const d of tmpDirs.splice(0)) {
    rmSync(d, { recursive: true, force: true });
  }
});

// ── tests ──────────────────────────────────────────────────────────────────

describe("CLI --check flag (issue #20)", () => {
  it("exits 1 and reports absent when no output file exists yet", () => {
    const root = makeTmp();
    const { srcDir, dstDir } = setupDirs(root);

    writeFileSync(join(srcDir, "test.agent.md"), FIXTURE_CONTENT, "utf8");
    writeConfig(root, srcDir, dstDir);

    const { stdout, status } = runCli(["--check"], root);
    expect(status).toBe(1);
    expect(stdout).toContain("absent");
    expect(stdout).toContain("Run with --apply");
  });

  it("exits 1 and reports stale when source is newer than output", () => {
    const root = makeTmp();
    const { srcDir, dstDir } = setupDirs(root);

    const srcFile = join(srcDir, "test.agent.md");
    const dstFile = join(dstDir, "test.md");

    // Write output first (older), then source (newer)
    writeFileSync(dstFile, "old composed output", "utf8");
    const oldTime = new Date(Date.now() - 60_000);
    utimesSync(dstFile, oldTime, oldTime);
    writeFileSync(srcFile, FIXTURE_CONTENT, "utf8");

    writeConfig(root, srcDir, dstDir);

    const { stdout, status } = runCli(["--check"], root);
    expect(status).toBe(1);
    expect(stdout).toContain("stale");
  });

  it("exits 0 and reports up to date when output is newer than source", () => {
    const root = makeTmp();
    const { srcDir, dstDir } = setupDirs(root);

    const srcFile = join(srcDir, "test.agent.md");
    const dstFile = join(dstDir, "test.md");

    // Write source first (older), then output (newer)
    writeFileSync(srcFile, FIXTURE_CONTENT, "utf8");
    const oldTime = new Date(Date.now() - 60_000);
    utimesSync(srcFile, oldTime, oldTime);
    writeFileSync(dstFile, "fresh composed output", "utf8");

    writeConfig(root, srcDir, dstDir);

    const { stdout, status } = runCli(["--check"], root);
    expect(status).toBe(0);
    expect(stdout).toContain("up to date");
  });

  it("reports mixed results and exits 1 when some files are stale", () => {
    const root = makeTmp();
    const { srcDir, dstDir } = setupDirs(root);

    // File A: up to date (output newer)
    const srcA = join(srcDir, "aaa.agent.md");
    const dstA = join(dstDir, "aaa.md");
    writeFileSync(srcA, FIXTURE_CONTENT, "utf8");
    const oldTime = new Date(Date.now() - 60_000);
    utimesSync(srcA, oldTime, oldTime);
    writeFileSync(dstA, "up to date", "utf8");

    // File B: stale (source newer)
    const srcB = join(srcDir, "bbb.agent.md");
    const dstB = join(dstDir, "bbb.md");
    writeFileSync(dstB, "stale output", "utf8");
    utimesSync(dstB, oldTime, oldTime);
    writeFileSync(srcB, FIXTURE_CONTENT, "utf8");

    writeConfig(root, srcDir, dstDir);

    const { stdout, status } = runCli(["--check"], root);
    expect(status).toBe(1);
    expect(stdout).toContain("up to date");
    expect(stdout).toContain("stale");
  });
});
