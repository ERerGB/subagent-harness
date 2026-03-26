#!/usr/bin/env bash
set -euo pipefail

if [[ -z "${SUBJECT_ARTIFACT_PATH:-}" ]]; then
  echo "missing SUBJECT_ARTIFACT_PATH" >&2
  exit 1
fi

if [[ ! -f "${SUBJECT_ARTIFACT_PATH}" ]]; then
  echo "artifact not found: ${SUBJECT_ARTIFACT_PATH}" >&2
  exit 1
fi

echo "subject-cli-ok"

