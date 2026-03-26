#!/usr/bin/env node

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

const args = process.argv.slice(2);

function getArg(flag, fallback = "") {
  const i = args.indexOf(flag);
  if (i < 0) return fallback;
  return args[i + 1] ?? fallback;
}

const agentPath = getArg("--agent");
const outputPath = getArg("--out");
const runtime = getArg("--runtime", "production");
const profile = getArg("--profile");

if (!agentPath || !outputPath) {
  console.error("E_COMPOSE_ARTIFACT_ARG: --agent and --out are required");
  process.exit(2);
}

if (!["cursor", "codex", "claude-code", "production"].includes(runtime)) {
  console.error(`E_COMPOSE_ARTIFACT_RUNTIME: unsupported runtime '${runtime}'`);
  process.exit(2);
}

try {
  const distParse = resolve(process.cwd(), "dist/parse.js");
  const distCompose = resolve(process.cwd(), "dist/compose.js");
  const { loadAgentFromDisk } = await import(`file://${distParse}`);
  const { composeSubagent } = await import(`file://${distCompose}`);

  const doc = loadAgentFromDisk(resolve(agentPath));
  const content = composeSubagent(doc, runtime, profile || undefined);

  const target = resolve(outputPath);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, content, "utf8");
  process.exit(0);
} catch (error) {
  console.error(`E_COMPOSE_ARTIFACT: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
}

