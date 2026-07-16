import { readdir, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { parseDocument } from "yaml";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const workflowDirectory = path.join(root, ".github", "workflows");
const workflowFiles = (await readdir(workflowDirectory))
  .filter((file) => /\.ya?ml$/u.test(file))
  .sort();

const failures = [];

for (const file of workflowFiles) {
  const relativePath = path.posix.join(".github", "workflows", file);
  const source = await readFile(path.join(workflowDirectory, file), "utf8");
  const document = parseDocument(source, {
    prettyErrors: true,
    uniqueKeys: true
  });

  for (const error of document.errors) {
    failures.push(`${relativePath}: ${error.message}`);
  }

  if (document.errors.length > 0) {
    continue;
  }

  const workflow = document.toJS();
  if (!workflow || typeof workflow !== "object" || Array.isArray(workflow)) {
    failures.push(`${relativePath}: expected a top-level mapping`);
    continue;
  }

  if (!("on" in workflow)) {
    failures.push(`${relativePath}: missing top-level \"on\" trigger`);
  }

  if (!("jobs" in workflow)) {
    failures.push(`${relativePath}: missing top-level \"jobs\" mapping`);
  }
}

if (failures.length > 0) {
  console.error("Workflow validation failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log(`Checked ${workflowFiles.length} GitHub Actions workflow file(s).`);
