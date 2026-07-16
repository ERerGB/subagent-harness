import { access, readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

const files = process.argv.slice(2);

if (files.length === 0) {
  throw new Error("Usage: node scripts/check-doc-links.mjs <markdown-file> [...]");
}

function githubSlug(heading) {
  return heading
    .toLowerCase()
    .replace(/<[^>]+>/g, "")
    .replace(/[`*_~]/g, "")
    .replace(/[^\p{L}\p{N}\s-]/gu, "")
    .trim()
    .replace(/\s+/g, "-");
}

function markdownOutsideFences(markdown) {
  let inFence = false;
  return markdown
    .split("\n")
    .filter((line) => {
      if (/^\s*```/.test(line)) {
        inFence = !inFence;
        return false;
      }
      return !inFence;
    })
    .join("\n");
}

async function anchorsFor(path) {
  const markdown = await readFile(path, "utf8");
  const anchors = new Set();
  const counts = new Map();

  for (const line of markdownOutsideFences(markdown).split("\n")) {
    const match = line.match(/^#{1,6}\s+(.+?)\s*#*$/);
    if (!match) continue;
    const base = githubSlug(match[1]);
    const count = counts.get(base) ?? 0;
    anchors.add(count === 0 ? base : `${base}-${count}`);
    counts.set(base, count + 1);
  }

  return { markdown, anchors };
}

const cache = new Map();
async function readAnchors(path) {
  if (!cache.has(path)) cache.set(path, anchorsFor(path));
  return cache.get(path);
}

const errors = [];
let checkedLinks = 0;

for (const inputPath of files) {
  const absolutePath = resolve(inputPath);
  const { markdown } = await readAnchors(absolutePath);
  const visibleMarkdown = markdownOutsideFences(markdown);
  const links = visibleMarkdown.matchAll(/!?\[[^\]]*\]\(([^)]+)\)/g);

  for (const match of links) {
    const destination = match[1].trim();
    if (/^(https?:|mailto:)/.test(destination)) continue;
    checkedLinks += 1;

    const [relativePath, rawAnchor = ""] = destination.split("#", 2);
    const targetPath = relativePath
      ? resolve(dirname(absolutePath), decodeURIComponent(relativePath))
      : absolutePath;

    try {
      await access(targetPath);
    } catch {
      errors.push(`${inputPath}: missing file ${destination}`);
      continue;
    }

    if (rawAnchor && targetPath.endsWith(".md")) {
      const { anchors } = await readAnchors(targetPath);
      const anchor = decodeURIComponent(rawAnchor);
      if (!anchors.has(anchor)) {
        errors.push(`${inputPath}: missing anchor ${destination}`);
      }
    }
  }
}

if (errors.length > 0) {
  throw new Error(`Documentation link check failed:\n${errors.join("\n")}`);
}

process.stdout.write(
  `Checked ${checkedLinks} local documentation links across ${files.length} file(s).\n`,
);
