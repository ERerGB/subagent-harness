import { readFileSync } from "node:fs";

export async function runSubjectArtifactProbe({ artifactPath, timeoutMs }) {
  const startedAt = Date.now();
  const parsed = JSON.parse(readFileSync(artifactPath, "utf8"));
  const ok = typeof parsed.name === "string" && typeof parsed.prompt === "string";
  return {
    ok,
    latencyMs: Math.min(timeoutMs, Date.now() - startedAt),
    details: {
      name: parsed.name,
      promptBytes: Buffer.byteLength(parsed.prompt ?? "", "utf8"),
    },
    errorCode: ok ? undefined : "E_MOCK_SUBJECT_API",
  };
}

