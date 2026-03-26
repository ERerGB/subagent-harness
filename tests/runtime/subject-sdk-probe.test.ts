import { describe, it, expect } from "vitest";
import { mkdtempSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";

function createArtifact(): string {
  const dir = mkdtempSync(join(tmpdir(), "subject-probe-"));
  const path = join(dir, "artifact.json");
  writeFileSync(
    path,
    JSON.stringify(
      {
        name: "subject-probe-fixture",
        prompt: "hello",
      },
      null,
      2,
    ),
    "utf8",
  );
  return path;
}

describe("subject-sdk-probe", () => {
  it("passes CLI probe with configured command", () => {
    const artifact = createArtifact();
    const cmd = [
      "node scripts/subject-sdk-probe.mjs",
      '--probe "cli"',
      `--artifact "${artifact}"`,
      '--timeout-ms "2000"',
    ].join(" ");

    const run = spawnSync(cmd, {
      shell: true,
      encoding: "utf8",
      cwd: resolve(import.meta.dirname, "..", ".."),
      env: {
        ...process.env,
        SUBJECT_HARNESS_CLI_CMD: "bash tests/fixtures/probes/mock-subject-cli-success.sh",
      },
    });

    expect(run.status).toBe(0);
    const payload = JSON.parse(run.stdout.trim());
    expect(payload.ok).toBe(true);
    expect(payload.target).toBe("subject-cli");
  });

  it("passes API probe with configured module", () => {
    const artifact = createArtifact();
    const cmd = [
      "node scripts/subject-sdk-probe.mjs",
      '--probe "api"',
      `--artifact "${artifact}"`,
      '--timeout-ms "2000"',
    ].join(" ");

    const run = spawnSync(cmd, {
      shell: true,
      encoding: "utf8",
      cwd: resolve(import.meta.dirname, "..", ".."),
      env: {
        ...process.env,
        SUBJECT_HARNESS_API_MODULE: "tests/fixtures/probes/mock-subject-api-success.mjs",
      },
    });

    expect(run.status).toBe(0);
    const payload = JSON.parse(run.stdout.trim());
    expect(payload.ok).toBe(true);
    expect(payload.target).toBe("subject-api");
  });
});

