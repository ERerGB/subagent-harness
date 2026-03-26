#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const args = process.argv.slice(2);

function getArg(flag, fallback = "") {
  const i = args.indexOf(flag);
  if (i < 0) return fallback;
  return args[i + 1] ?? fallback;
}

function fail(code, message, exitCode = 1) {
  console.log(
    JSON.stringify({
      ok: false,
      stage: "l3",
      target: code.includes("CLI") ? "subject-cli" : "subject-api",
      latencyMs: 0,
      errorCode: code,
      details: { message },
    }),
  );
  process.exit(exitCode);
}

const probe = getArg("--probe");
const artifactPath = getArg("--artifact");
const timeoutMs = Number(getArg("--timeout-ms", "15000"));

if (!probe || !artifactPath) {
  fail("E_SUBJECT_PROBE_ARG", "missing --probe or --artifact", 2);
}

if (!["cli", "api"].includes(probe)) {
  fail("E_SUBJECT_PROBE_TYPE", `unsupported probe '${probe}'`, 2);
}

if (!existsSync(resolve(artifactPath))) {
  fail("E_SUBJECT_PROBE_ARTIFACT", `artifact does not exist: ${artifactPath}`, 2);
}

const startedAt = Date.now();

if (probe === "cli") {
  const cmd = process.env["SUBJECT_HARNESS_CLI_CMD"];
  const artifactEnvName = process.env["SUBJECT_HARNESS_CLI_ARTIFACT_ENV"] || "SUBJECT_ARTIFACT_PATH";
  if (!cmd) {
    fail("E_SUBJECT_CLI_CMD_MISSING", "SUBJECT_HARNESS_CLI_CMD is required for CLI probe", 2);
  }

  const run = spawnSync(cmd, {
    shell: true,
    encoding: "utf8",
    timeout: timeoutMs,
    env: { ...process.env, [artifactEnvName]: resolve(artifactPath) },
  });

  if (run.error) {
    fail("E_SUBJECT_CLI_EXEC", run.error.message, 1);
  }
  if (run.status !== 0) {
    fail("E_SUBJECT_CLI_NONZERO", run.stderr?.trim() || "command exited non-zero", 1);
  }

  const latencyMs = Date.now() - startedAt;
  console.log(
    JSON.stringify({
      ok: true,
      stage: "l3",
      target: "subject-cli",
      latencyMs,
      details: {
        stdout: (run.stdout || "").trim(),
      },
    }),
  );
  process.exit(0);
}

const modulePath = process.env["SUBJECT_HARNESS_API_MODULE"];
if (!modulePath) {
  fail("E_SUBJECT_API_MODULE_MISSING", "SUBJECT_HARNESS_API_MODULE is required for API probe", 2);
}

try {
  const url = pathToFileURL(resolve(modulePath)).href;
  const loaded = await import(url);
  const runner =
    loaded.runSubjectArtifactProbe ??
    loaded.runSubjectProbe ??
    loaded.default;

  if (typeof runner !== "function") {
    fail("E_SUBJECT_API_EXPORT", "module must export a probe function", 2);
  }

  const result = await runner({
    artifactPath: resolve(artifactPath),
    timeoutMs,
  });

  if (!result || typeof result !== "object") {
    fail("E_SUBJECT_API_RESULT", "probe function must return an object", 1);
  }

  const ok = Boolean(result.ok);
  const latencyMs = Number(result.latencyMs ?? Date.now() - startedAt);
  const details = typeof result.details === "object" && result.details ? result.details : {};

  console.log(
    JSON.stringify({
      ok,
      stage: "l3",
      target: "subject-api",
      latencyMs,
      errorCode: ok ? undefined : String(result.errorCode || "E_SUBJECT_API_PROBE"),
      details,
    }),
  );

  process.exit(ok ? 0 : 1);
} catch (error) {
  fail("E_SUBJECT_API_EXEC", error instanceof Error ? error.message : String(error), 1);
}

