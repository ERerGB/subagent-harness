#!/usr/bin/env node

import { readFileSync, writeFileSync, mkdirSync, rmSync, readdirSync, statSync, existsSync, cpSync } from "node:fs";
import { resolve, basename, join, dirname } from "node:path";
import { loadAgentFromDisk } from "./parse.js";
import { validateRichAgent } from "./validate.js";
import { composeSubagent } from "./compose.js";
import type { RuntimeTarget, ComposeTarget, SubagentConfig } from "./types.js";

const CONFIG_FILENAME = "subagent.config.json";

type Mode = "dry-run" | "apply" | "clean";

type PlanSource = "legacy" | "config";

interface ResolvedPlan {
  src: string;
  targets: ComposeTarget[];
  /** Parsed `--target` values; empty means "all runtimes". */
  targetFilter: string[];
  planSource: PlanSource;
  mode: Mode;
  pattern: string;
  configDir: string;
  skillsSrc: string | undefined;
}

const KNOWN_RUNTIMES: readonly RuntimeTarget[] = ["cursor", "codex", "claude-code", "production"];
const KNOWN_RUNTIME_SET = new Set<string>(KNOWN_RUNTIMES);

// ---------------------------------------------------------------------------
// Arg parsing — supports both explicit flags and config-file discovery
// ---------------------------------------------------------------------------

function parseArgs(): ResolvedPlan {
  const argv = process.argv.slice(2);
  let src = process.env["AGENTS_SRC"] ?? "";
  let dst = process.env["AGENTS_DST"] ?? "";
  let mode: Mode = "dry-run";
  let pattern = process.env["AGENTS_PATTERN"] ?? "*.agent.md";
  const targetFilter: string[] = [];

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
      case "--target": {
        const v = argv[++i];
        if (v === undefined || v.startsWith("-")) {
          console.error("E_COMPOSE_ARG: --target requires a runtime name (e.g. cursor, codex, production)");
          process.exit(2);
        }
        targetFilter.push(v);
        break;
      }
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

  const configDir = process.cwd();

  // If explicit --src/--dst provided, use single-target legacy mode
  if (src && dst) {
    return {
      src: resolve(src),
      targets: [{ runtime: "cursor" as RuntimeTarget, dst: resolve(dst) }],
      targetFilter,
      planSource: "legacy",
      mode,
      pattern,
      configDir,
      skillsSrc: undefined,
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
      targets: config.targets.map(t => ({
        ...t,
        dst: resolve(t.dst),
        skillsSrc: t.skillsSrc ?? config.skillsSrc,
        skillsDst: t.skillsDst ? resolve(t.skillsDst) : undefined,
      })),
      targetFilter,
      planSource: "config",
      mode,
      pattern: config.pattern ?? pattern,
      configDir,
      skillsSrc: config.skillsSrc,
    };
  }

  console.error("E_COMPOSE_ARG: provide --src/--dst flags, or create subagent.config.json in project root.");
  process.exit(2);
}

/**
 * Apply `--target` filters from the CLI. Empty filter or `all` selects every configured target.
 */
function selectActiveTargets(plan: ResolvedPlan): ComposeTarget[] {
  const raw = plan.targetFilter;
  const hasAll = raw.includes("all");
  const specifics = raw.filter(t => t !== "all");

  if (hasAll && specifics.length > 0) {
    console.error("E_COMPOSE_ARG: --target all cannot be combined with other runtimes");
    process.exit(2);
  }

  const useAll = raw.length === 0 || hasAll;

  if (!useAll) {
    for (const name of specifics) {
      if (!KNOWN_RUNTIME_SET.has(name)) {
        console.error(`E_COMPOSE_TARGET: unknown runtime '${name}' (expected one of: ${KNOWN_RUNTIMES.join(", ")}, all)`);
        process.exit(2);
      }
    }
  }

  if (plan.planSource === "legacy") {
    if (useAll) {
      return plan.targets;
    }
    for (const name of specifics) {
      if (name !== "cursor") {
        console.error("E_COMPOSE_TARGET: --src/--dst legacy mode only supports --target cursor or --target all");
        process.exit(2);
      }
    }
    return plan.targets;
  }

  if (useAll) {
    return plan.targets;
  }

  const active = plan.targets.filter(t => specifics.includes(t.runtime));
  if (active.length === 0) {
    console.error(`E_COMPOSE_TARGET: no configured targets match: ${specifics.join(", ")}`);
    process.exit(2);
  }
  return active;
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
// Skill bundling (issue #10)
// ---------------------------------------------------------------------------

function collectSkillNames(files: string[], srcDir: string): Set<string> {
  const names = new Set<string>();
  for (const file of files) {
    let doc;
    try {
      doc = loadAgentFromDisk(file);
    } catch {
      continue;
    }
    const profiles = doc.frontmatter.profiles?.profiles;
    if (!profiles) continue;
    for (const p of Object.values(profiles)) {
      for (const s of p.skills ?? []) {
        if (s) names.add(s);
      }
    }
  }
  return names;
}

function runSkillBundle(
  skillNames: Set<string>,
  skillsSrc: string,
  skillsDst: string,
  mode: Mode
): number {
  let bundled = 0;
  for (const name of skillNames) {
    const srcDir = join(skillsSrc, name);
    const destDir = join(skillsDst, name);
    if (!existsSync(srcDir)) {
      console.error(`  SKIP skill ${name} (E_SKILL_NOT_FOUND: ${srcDir})`);
      continue;
    }
    if (mode === "dry-run") {
      console.log(`  WOULD bundle skill: ${srcDir} -> ${destDir}`);
      bundled++;
      continue;
    }
    mkdirSync(destDir, { recursive: true });
    cpSync(srcDir, destDir, { recursive: true });
    console.log(`  BUNDLED: ${destDir}`);
    bundled++;
  }
  return bundled;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function main(): void {
  const plan = parseArgs();
  const activeTargets = selectActiveTargets(plan);

  if (!existsSync(plan.src)) {
    console.error(`E_COMPOSE_SRC: source directory not found: ${plan.src}`);
    process.exit(2);
  }

  const files = findAgentFiles(plan.src, plan.pattern);
  let totalComposed = 0;
  let totalFailed = 0;

  const skillNames = collectSkillNames(files, plan.src);

  for (const target of activeTargets) {
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

    // Skill bundling when skillsSrc and skillsDst are set
    const skillsSrc = target.skillsSrc ? resolve(plan.configDir, target.skillsSrc) : null;
    if (target.skillsDst && skillsSrc && skillNames.size > 0) {
      const bundled = runSkillBundle(skillNames, skillsSrc, target.skillsDst, plan.mode);
      console.log(`  Bundled ${bundled} skill(s).`);
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
