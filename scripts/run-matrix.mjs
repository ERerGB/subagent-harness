#!/usr/bin/env node

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";

const args = process.argv.slice(2);

function getArg(flag, fallback = "") {
  const i = args.indexOf(flag);
  if (i < 0) return fallback;
  return args[i + 1] ?? fallback;
}

function hasFlag(flag) {
  return args.includes(flag);
}

function splitTargets(raw) {
  return raw.split(",").map(v => v.trim()).filter(Boolean);
}

function runCommand(command, options = {}) {
  const startedAt = Date.now();
  const run = spawnSync(command, {
    shell: true,
    encoding: "utf8",
    ...options,
  });
  return {
    status: run.status ?? 1,
    stdout: run.stdout || "",
    stderr: run.stderr || "",
    latencyMs: Date.now() - startedAt,
    error: run.error?.message || "",
  };
}

const strict = hasFlag("--strict");
const targets = splitTargets(getArg("--targets", "production"));
const reportPath = getArg("--report", "");
const timeoutMs = Number(getArg("--timeout-ms", "15000"));
const profile = getArg("--profile");
const agentPath = resolve(getArg("--agent", "tests/e2e/template.agent.md"));
const l1Command = getArg("--l1-cmd", "pnpm test:l1");
const l2Command = getArg("--l2-cmd", "pnpm test:l2");

const supportedTargets = new Set(["production", "cursor", "claude", "subject-cli", "subject-api"]);
for (const target of targets) {
  if (!supportedTargets.has(target)) {
    console.error(`E_MATRIX_TARGET: unsupported target '${target}'`);
    process.exit(2);
  }
}

const runId = `matrix-${Date.now()}`;
const artifactDir = resolve(tmpdir(), runId);
mkdirSync(artifactDir, { recursive: true });

const productionArtifact = join(artifactDir, "production.json");
const cursorArtifact = join(artifactDir, "cursor.md");
const claudeArtifact = join(artifactDir, "claude.md");

const report = {
  ok: true,
  strict,
  targets,
  stages: [],
  summary: {
    pass: 0,
    fail: 0,
    skip: 0,
  },
};

function pushStage(stage) {
  report.stages.push(stage);
  if (stage.status === "pass") report.summary.pass += 1;
  if (stage.status === "fail") report.summary.fail += 1;
  if (stage.status === "skip") report.summary.skip += 1;
  if (stage.status === "fail") report.ok = false;
}

function finalize(exitCode) {
  if (reportPath) {
    const target = resolve(reportPath);
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, JSON.stringify(report, null, 2) + "\n", "utf8");
  }
  console.log(JSON.stringify(report, null, 2));
  process.exit(exitCode);
}

const l1Result = runCommand(l1Command);
pushStage({
  stage: "l1",
  target: "core",
  command: l1Command,
  status: l1Result.status === 0 ? "pass" : "fail",
  latencyMs: l1Result.latencyMs,
  stdout: l1Result.stdout,
  stderr: l1Result.stderr || l1Result.error,
});
if (l1Result.status !== 0) finalize(1);

const l2Result = runCommand(l2Command);
pushStage({
  stage: "l2",
  target: "core",
  command: l2Command,
  status: l2Result.status === 0 ? "pass" : "fail",
  latencyMs: l2Result.latencyMs,
  stdout: l2Result.stdout,
  stderr: l2Result.stderr || l2Result.error,
});
if (l2Result.status !== 0) finalize(1);

const composeTargets = [
  { runtime: "production", out: productionArtifact },
  { runtime: "cursor", out: cursorArtifact },
  { runtime: "claude-code", out: claudeArtifact },
];

for (const spec of composeTargets) {
  const command = [
    "node scripts/compose-artifact.mjs",
    `--agent "${agentPath}"`,
    `--out "${spec.out}"`,
    `--runtime "${spec.runtime}"`,
    profile ? `--profile "${profile}"` : "",
  ].filter(Boolean).join(" ");
  const out = runCommand(command);
  if (out.status !== 0) {
    pushStage({
      stage: "compose",
      target: spec.runtime,
      command,
      status: "fail",
      latencyMs: out.latencyMs,
      stdout: out.stdout,
      stderr: out.stderr || out.error,
    });
    finalize(1);
  }
}

for (const target of targets) {
  if (target === "production") {
    const command = `node tests/runtime/production-runtime-check.mjs "${productionArtifact}"`;
    const out = runCommand(command);
    pushStage({
      stage: "l3",
      target: "production",
      command,
      status: out.status === 0 ? "pass" : "fail",
      latencyMs: out.latencyMs,
      stdout: out.stdout,
      stderr: out.stderr || out.error,
    });
    if (out.status !== 0) finalize(1);
    continue;
  }

  if (target === "cursor" || target === "claude") {
    const envName = target === "cursor" ? "CURSOR_RUNTIME_CHECK_CMD" : "CLAUDE_RUNTIME_CHECK_CMD";
    const command = process.env[envName];
    if (!command) {
      pushStage({
        stage: "l3",
        target,
        command: "",
        status: strict ? "fail" : "skip",
        latencyMs: 0,
        stderr: `${envName} is missing`,
      });
      if (strict) finalize(2);
      continue;
    }
    const artifact = target === "cursor" ? cursorArtifact : claudeArtifact;
    const out = runCommand(command, { env: { ...process.env, AGENT_FILE: artifact } });
    pushStage({
      stage: "l3",
      target,
      command,
      status: out.status === 0 ? "pass" : "fail",
      latencyMs: out.latencyMs,
      stdout: out.stdout,
      stderr: out.stderr || out.error,
    });
    if (out.status !== 0) finalize(1);
    continue;
  }

  if (target === "subject-cli" || target === "subject-api") {
    const probe = target === "subject-cli" ? "cli" : "api";
    const requiredEnv = target === "subject-cli" ? "SUBJECT_HARNESS_CLI_CMD" : "SUBJECT_HARNESS_API_MODULE";
    if (!process.env[requiredEnv]) {
      pushStage({
        stage: "l3",
        target,
        command: "",
        status: strict ? "fail" : "skip",
        latencyMs: 0,
        stderr: `${requiredEnv} is missing`,
      });
      if (strict) finalize(2);
      continue;
    }
    const command = `node scripts/subject-sdk-probe.mjs --probe "${probe}" --artifact "${productionArtifact}" --timeout-ms "${timeoutMs}"`;
    const out = runCommand(command);
    pushStage({
      stage: "l3",
      target,
      command,
      status: out.status === 0 ? "pass" : "fail",
      latencyMs: out.latencyMs,
      stdout: out.stdout,
      stderr: out.stderr || out.error,
    });
    if (out.status !== 0) finalize(1);
  }
}

finalize(0);

