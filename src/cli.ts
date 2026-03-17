#!/usr/bin/env node

import { readFileSync, writeFileSync, mkdirSync, rmSync, readdirSync, statSync, existsSync } from "node:fs";
import { resolve, basename, join } from "node:path";
import { loadAgentFromDisk } from "./parse.js";
import { validateRichAgent } from "./validate.js";
import { composeSubagent } from "./compose.js";
import type { RuntimeTarget, ComposeTarget, SubagentConfig } from "./types.js";

const CONFIG_FILENAME = "subagent.config.json";

type Mode = "dry-run" | "apply" | "clean";

interface ResolvedPlan {
  src: string;
  targets: ComposeTarget[];
  mode: Mode;
  pattern: string;
}

// ---------------------------------------------------------------------------
// Arg parsing — supports both explicit flags and config-file discovery
// ---------------------------------------------------------------------------

function parseArgs(): ResolvedPlan {
  const argv = process.argv.slice(2);
  let src = process.env["AGENTS_SRC"] ?? "";
  let dst = process.env["AGENTS_DST"] ?? "";
  let mode: Mode = "dry-run";
  let pattern = process.env["AGENTS_PATTERN"] ?? "*.agent.md";

  for (let i = 0; i < argv.length; i++) {
    switch (argv[i]) {
      case "--src":
        src = argv[++i] ?? "";
        break;
      case "--dst":
        dst = argv[++i] ?? "";
        break;
      case "--pattern":
        pattern = argv[++i] ?? "";
        break;
      case "--apply":
        mode = "apply";
        break;
      case "--clean":
        mode = "clean";
        break;
      case "--dry-run":
        mode = "dry-run";
        break;
      case "--":
        break;
      default:
        console.error(`E_COMPOSE_ARG: unknown argument '${argv[i]}'`);
        process.exit(2);
    }
  }

  // If explicit --src/--dst provided, use single-target legacy mode
  if (src && dst) {
    return {
      src: resolve(src),
      targets: [{ runtime: "cursor" as RuntimeTarget, dst: resolve(dst) }],
      mode,
      pattern,
    };
  }

  // Otherwise, look for subagent.config.json in cwd
  const configPath = resolve(CONFIG_FILENAME);
  if (existsSync(configPath)) {
    const config = JSON.parse(readFileSync(configPath, "utf8")) as SubagentConfig;
    if (!config.src || !config.targets?.length) {
      console.error(`E_CONFIG: ${CONFIG_FILENAME} must define "src" and at least one "targets" entry.`);
      process.exit(2);
    }
    return {
      src: resolve(config.src),
      targets: config.targets.map(t => ({ ...t, dst: resolve(t.dst) })),
      mode,
      pattern: config.pattern ?? pattern,
    };
  }

  console.error("E_COMPOSE_ARG: provide --src/--dst flags, or create subagent.config.json in project root.");
  process.exit(2);
}

// ---------------------------------------------------------------------------
// File discovery
// ---------------------------------------------------------------------------

function findAgentFiles(dir: string, pattern: string): string[] {
  const suffix = pattern.replace("*", "");
  const results: string[] = [];

  function walk(d: string) {
    for (const entry of readdirSync(d)) {
      const full = join(d, entry);
      if (statSync(full).isDirectory()) {
        walk(full);
      } else if (entry.endsWith(suffix)) {
        results.push(full);
      }
    }
  }

  walk(dir);
  return results.sort();
}

// ---------------------------------------------------------------------------
// Compose operations
// ---------------------------------------------------------------------------

function outputExtension(runtime: RuntimeTarget): string {
  return runtime === "production" ? ".json" : ".md";
}

function runClean(files: string[], target: ComposeTarget): number {
  let cleaned = 0;
  const ext = outputExtension(target.runtime);
  for (const file of files) {
    const name = basename(file, ".agent.md");
    const dest = join(target.dst, `${name}${ext}`);
    if (existsSync(dest)) {
      rmSync(dest);
      console.log(`  REMOVED: ${dest}`);
      cleaned++;
    }
  }
  return cleaned;
}

function runCompose(files: string[], target: ComposeTarget, mode: Mode): { composed: number; failed: number } {
  let composed = 0;
  let failed = 0;

  for (const file of files) {
    let doc;
    try {
      doc = loadAgentFromDisk(file);
    } catch (e) {
      console.error(`  SKIP ${file} (E_COMPOSE_PARSE: ${(e as Error).message})`);
      failed++;
      continue;
    }

    const validation = validateRichAgent(doc);
    if (!validation.ok) {
      const errors = validation.issues.filter(i => i.level === "error");
      const codes = errors.map(i => `${i.code}: ${i.message}`).join("; ");
      console.error(`  SKIP ${file} (${codes})`);
      failed++;
      continue;
    }

    const name = basename(file, ".agent.md");
    const ext = outputExtension(target.runtime);
    const dest = join(target.dst, `${name}${ext}`);

    if (mode === "dry-run") {
      console.log(`  WOULD compose: ${file} -> ${dest}`);
      console.log(`    name: ${doc.frontmatter.name}`);
      console.log(`    description: ${doc.frontmatter.description.slice(0, 80)}...`);
      composed++;
      continue;
    }

    const output = composeSubagent(doc, target.runtime, target.profile);
    writeFileSync(dest, output, "utf8");
    console.log(`  COMPOSED: ${dest}`);
    composed++;
  }

  return { composed, failed };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function main(): void {
  const plan = parseArgs();

  if (!existsSync(plan.src)) {
    console.error(`E_COMPOSE_SRC: source directory not found: ${plan.src}`);
    process.exit(2);
  }

  const files = findAgentFiles(plan.src, plan.pattern);
  let totalComposed = 0;
  let totalFailed = 0;

  for (const target of plan.targets) {
    console.log(`[${target.runtime}] source=${plan.src} target=${target.dst} mode=${plan.mode}`);
    mkdirSync(target.dst, { recursive: true });

    if (plan.mode === "clean") {
      const cleaned = runClean(files, target);
      console.log(`  Cleaned ${cleaned} file(s).`);
    } else {
      const { composed, failed } = runCompose(files, target, plan.mode);
      totalComposed += composed;
      totalFailed += failed;
    }
    console.log("");
  }

  if (plan.mode !== "clean") {
    console.log(`Total: ${totalComposed} composed, ${totalFailed} skipped. Mode: ${plan.mode}`);
    if (plan.mode === "dry-run") {
      console.log("Run with --apply to write files.");
    }
  }
}

main();
