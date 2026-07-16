#!/usr/bin/env bash

set -euo pipefail

if [[ -z "${GH_TOKEN:-}" ]]; then
  echo "::notice::DOWNSTREAM_NOTIFY_TOKEN is not set; downstream notifications are disabled"
  exit 0
fi

if [[ ! -f downstream.json ]]; then
  echo "::notice::downstream.json is not present; there are no consumers to notify"
  exit 0
fi

if [[ -n "${GITHUB_EVENT_PATH:-}" && -f "$GITHUB_EVENT_PATH" ]]; then
  if [[ -z "${RELEASE_TAG:-}" ]]; then
    RELEASE_TAG=$(jq -er '.release.tag_name' "$GITHUB_EVENT_PATH")
  fi
  if [[ -z "${RELEASE_URL:-}" ]]; then
    RELEASE_URL=$(jq -er '.release.html_url' "$GITHUB_EVENT_PATH")
  fi
  if [[ -z "${RELEASE_BODY:-}" ]]; then
    RELEASE_BODY=$(jq -r '.release.body // ""' "$GITHUB_EVENT_PATH")
  fi
fi

: "${RELEASE_TAG:?RELEASE_TAG is required}"
: "${RELEASE_URL:?RELEASE_URL is required}"

if ! jq -e '.consumers | type == "array"' downstream.json >/dev/null; then
  echo "::error file=downstream.json::Expected a top-level consumers array"
  exit 1
fi

consumer_count=$(jq '.consumers | length' downstream.json)
if ((consumer_count == 0)); then
  echo "::notice::downstream.json contains no registered consumers"
  exit 0
fi

temporary_directory=$(mktemp -d)
trap 'rm -rf "$temporary_directory"' EXIT

echo "Found ${consumer_count} registered consumer(s)"

for ((index = 0; index < consumer_count; index += 1)); do
  repository=$(jq -er ".consumers[$index].repo" downstream.json)
  contact=$(jq -er ".consumers[$index].contact" downstream.json)
  dependency_type=$(jq -er ".consumers[$index].dependencyType" downstream.json)

  if [[ "$contact" != "issue" ]]; then
    echo "Skipping ${repository} (contact: ${contact})"
    continue
  fi

  notice_file="${temporary_directory}/consumer-${index}.md"
  {
    printf '## Upstream Release Notice\n\n'
    printf '[`subagent-harness`](https://github.com/ERerGB/subagent-harness) **%s** has been published.\n\n' "$RELEASE_TAG"
    printf '**Dependency type in this project:** `%s`\n\n' "$dependency_type"
    printf '### Release notes\n\n'
    printf '%s\n\n' "${RELEASE_BODY:-}"
    printf '%s\n\n' '---'
    printf '**Full release:** %s\n\n' "$RELEASE_URL"
    printf '%s\n' '*This issue was automatically created because this project is registered in [downstream.json](https://github.com/ERerGB/subagent-harness/blob/main/downstream.json). To stop receiving these notifications, submit a PR to change your `contact` field to `"none"`.*'
  } >"$notice_file"

  echo "Notifying ${repository}..."
  if ! gh issue create \
    --repo "$repository" \
    --title "upstream: subagent-harness ${RELEASE_TAG} released" \
    --body-file "$notice_file"; then
    echo "::warning file=downstream.json::Failed to notify ${repository}"
  fi
done
