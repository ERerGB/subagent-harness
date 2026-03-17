import { readFileSync, existsSync } from "node:fs";
import { resolve, join } from "node:path";
import type { RichAgentDocument } from "../src/types.js";
import { parseRichAgentMarkdown, parseExtensionsYaml } from "../src/parse.js";

const FIXTURES_DIR = resolve(import.meta.dirname, "fixtures");

export function readFixture(name: string): string {
  return readFileSync(join(FIXTURES_DIR, name), "utf8");
}

/** Parse a fixture .agent.md and auto-merge its .ext.yaml sidecar if present. */
export function loadFixture(name: string): RichAgentDocument {
  const content = readFixture(name);
  const doc = parseRichAgentMarkdown(join(FIXTURES_DIR, name), content);

  const extName = name.replace(/\.agent\.md$/, ".agent.ext.yaml");
  const extPath = join(FIXTURES_DIR, extName);
  if (existsSync(extPath)) {
    doc.extensions = parseExtensionsYaml(readFileSync(extPath, "utf8"));
  }

  return doc;
}
