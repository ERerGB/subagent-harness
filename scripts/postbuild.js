// Ensure CLI entry has shebang and is executable.
import { readFileSync, writeFileSync, chmodSync } from "node:fs";

const CLI = "dist/cli.js";
const SHEBANG = "#!/usr/bin/env node\n";

const content = readFileSync(CLI, "utf8");
if (!content.startsWith("#!")) {
  writeFileSync(CLI, SHEBANG + content, "utf8");
}
chmodSync(CLI, 0o755);
