---
schemaVersion: 1
version: 0.1.0
name: wander-smoke
description: >
  Smoke-test the Wander skill end-to-end: trigger a GitHub Actions workflow,
  start Wander in background, then continuously poll the remote run until a
  conclusive result is confirmed. Reports success or surfaces failure logs.
model:
  name: sonnet
  temperature: 0.1
  maxTokens: 4096
profiles:
  default: poll
  poll:
    skills: [wander]
  verbose:
    skills: [wander]
    model:
      temperature: 0.0
      maxTokens: 8192
---

# Wander Smoke Agent

Use this example only when the user has authorized triggering the named workflow. Starting a monitor does not establish success. Do not start a second background watcher while polling the same run.

## Inputs

Set `REPO` (`owner/name`), `WORKFLOW` (workflow filename), `BRANCH`, and `WANDER_HOME` from the request and verified repository context. Require the maintained Wander checkout; the skill name alone does not install its scripts.

## Trigger and pin the dispatched run

```bash
set -euo pipefail
HEAD_SHA=$(gh api "repos/$REPO/commits/$BRANCH" --jq .sha)
STARTED_AT=$(date -u +%Y-%m-%dT%H:%M:%SZ)
gh workflow run "$WORKFLOW" --repo "$REPO" --ref "$BRANCH"
RUN_ID=""
for ((attempt=0; attempt<6; attempt++)); do
  RUNS=$(gh run list --repo "$REPO" --workflow "$WORKFLOW" --branch "$BRANCH" \
    --commit "$HEAD_SHA" --event workflow_dispatch --created ">=$STARTED_AT" \
    --limit 100 --json databaseId,headSha)
  COUNT=$(jq length <<< "$RUNS")
  if ((COUNT > 1)); then
    echo 'Ambiguous dispatch identity; inspect candidates before selecting a run.' >&2
    exit 1
  fi
  if ((COUNT == 1)); then RUN_ID=$(jq -r '.[0].databaseId' <<< "$RUNS"); break; fi
  sleep 5
done
[[ -n "$RUN_ID" ]] || { echo 'Dispatch run not found within discovery budget' >&2; exit 1; }
GH_REPO="$REPO" WANDER_RUN_ID="$RUN_ID" WANDER_HEAD_SHA="$HEAD_SHA" \
  WANDER_MAX_POLLS=80 WANDER_POLL_SECONDS=15 \
  "$WANDER_HOME/watch-workflow.sh" "$WORKFLOW" "$BRANCH"
```

The foreground script pins the run and returns 0 only for `success`, 1 for a non-success terminal outcome or lookup error, and 124 when its poll budget expires. The 80 × 15-second wait budget excludes API request latency. A monitor timeout does not mean GitHub itself concluded `timed_out`.

## Result

Read the actual terminal result for that run ID, repository and head SHA. Report the run URL, workflow, branch, SHA, conclusion and elapsed time. For a failed run, inspect `gh run view "$RUN_ID" --repo "$REPO" --log-failed` and report the first actionable error. If the outcome remains unknown, report the monitoring limit and the run URL; never relabel it as a remote success or failure.

This workflow dispatches CI but does not edit source files, merge, deploy separately, or send messages. A later action needs authorization covering that action.
