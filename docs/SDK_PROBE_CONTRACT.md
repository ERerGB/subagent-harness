# SDK Probe Contract

This document defines the runtime probe contract for `subagent-harness` L3 checks.

The goal is to validate that composed production artifacts can be instantiated and executed by a real downstream runtime (for now, Subject-Harness via CLI and Node API).

## Scope

- Stage: `l3`
- Runtime signal: real process execution, not static shape checks
- Primary artifact: production JSON composed from `.agent.md`

## Input Contract

All probes should accept this logical input:

- `artifactPath` (string, required): Absolute or relative path to production JSON.
- `target` (string, required): Probe target identifier (`production`, `subject-cli`, `subject-api`, etc.).
- `mode` (string, required): `strict` or `lenient`.
- `timeoutMs` (number, optional): Probe timeout in milliseconds. Default is implementation-defined.

Environment-specific adapters (CLI/API) can accept additional configuration variables, but they must map back to this input model.

## Output Contract

All probes must emit a normalized JSON object:

```json
{
  "ok": true,
  "stage": "l3",
  "target": "subject-api",
  "latencyMs": 42,
  "errorCode": "",
  "details": {
    "message": "probe passed"
  }
}
```

Required fields:

- `ok` (boolean): Pass/fail status.
- `stage` (string): Must be `l3`.
- `target` (string): Target identifier.
- `latencyMs` (number): End-to-end probe latency.
- `details` (object): Additional structured context.

Optional field:

- `errorCode` (string): Required when `ok` is `false`.

## Exit Code Semantics

Probe and matrix scripts should follow these codes:

- `0`: Success.
- `1`: Runtime/business failure (probe executed but failed).
- `2`: Configuration or argument error (missing command/module, invalid input, bad flags).

## PRG (Production-Ready Gap) Checklist

L3 should explicitly validate these items:

1. Artifact can be loaded.
2. Runtime instance can be created from artifact.
3. Minimal run path can execute and return structured output.
4. Timeout and error surfaces are observable.

These checks close the gap between "artifact is parseable" and "artifact is executable in a real runtime."
