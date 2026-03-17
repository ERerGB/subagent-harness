import { readFileSync } from "node:fs";

const filePath = process.argv[2];
if (!filePath) {
  console.error("E_PROD_RUNTIME_ARG: missing production artifact path");
  process.exit(2);
}

const parsed = JSON.parse(readFileSync(filePath, "utf8"));
if (!parsed || typeof parsed !== "object") {
  console.error("E_PROD_RUNTIME_JSON: artifact is not an object");
  process.exit(2);
}

if (typeof parsed.name !== "string" || !parsed.name) {
  console.error("E_PROD_RUNTIME_NAME: missing name");
  process.exit(2);
}
if (typeof parsed.prompt !== "string" || !parsed.prompt) {
  console.error("E_PROD_RUNTIME_PROMPT: missing prompt");
  process.exit(2);
}

// "Execute" a tiny runtime behavior in a separate Node process.
const promptBytes = Buffer.byteLength(parsed.prompt, "utf8");
if (promptBytes <= 0) {
  console.error("E_PROD_RUNTIME_EXEC: prompt byte size is zero");
  process.exit(2);
}

console.log(
  JSON.stringify({
    ok: true,
    name: parsed.name,
    promptBytes,
  }),
);
