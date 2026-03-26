import { describe, it, expect } from "vitest";
import { mkdtempSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";

const REPO_ROOT = resolve(import.meta.dirname, "..", "..");

function runMatrix(args: string[], env: Record<string, string> = {}) {
  const cmd = ["node scripts/run-matrix.mjs", ...args].join(" ");
  return spawnSync(cmd, {
    shell: true,
    encoding: "utf8",
    cwd: REPO_ROOT,
    env: { ...process.env, ...env },
  });
}

describe("run-matrix", () => {
  it("fails in strict mode when subject probes are required but not configured", () => {
    const run = runMatrix([
      '--targets "production,subject-cli"',
      "--strict",
      '--agent "tests/e2e/template.agent.md"',
    ]);
    expect(run.status).toBe(2);
    expect(run.stdout).toContain("subject-cli");
  });

  it("passes with subject cli/api probes in strict mode", () => {
    const reportDir = mkdtempSync(join(tmpdir(), "matrix-report-"));
    const reportPath = join(reportDir, "report.json");
    const run = runMatrix(
      [
        '--targets "production,subject-cli,subject-api"',
        "--strict",
        `--report "${reportPath}"`,
        '--agent "tests/e2e/template.agent.md"',
      ],
      {
        SUBJECT_HARNESS_CLI_CMD: "bash tests/fixtures/probes/mock-subject-cli-success.sh",
        SUBJECT_HARNESS_API_MODULE: "tests/fixtures/probes/mock-subject-api-success.mjs",
      },
    );

    expect(run.status).toBe(0);
    const report = JSON.parse(readFileSync(reportPath, "utf8"));
    expect(report.ok).toBe(true);
    expect(report.targets).toEqual(["production", "subject-cli", "subject-api"]);
    expect(report.summary.fail).toBe(0);
  });
});

