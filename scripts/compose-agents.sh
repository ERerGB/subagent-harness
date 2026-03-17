#!/usr/bin/env bash
set -euo pipefail

# Canonical compose script for subagent-harness.
# Compose rich *.agent.md files into runtime-compatible .md subagent files.
#
# Usage:
#   ./scripts/compose-agents.sh --src <source_dir> --dst <target_dir> [--apply|--clean|--dry-run]
#   AGENTS_SRC=... AGENTS_DST=... ./scripts/compose-agents.sh --apply
#
# Defaults:
#   mode: dry-run
#   pattern: *.agent.md

AGENTS_SRC="${AGENTS_SRC:-}"
AGENTS_DST="${AGENTS_DST:-}"
MODE="dry-run"
PATTERN="${AGENTS_PATTERN:-*.agent.md}"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --src)
      AGENTS_SRC="$2"
      shift 2
      ;;
    --dst)
      AGENTS_DST="$2"
      shift 2
      ;;
    --pattern)
      PATTERN="$2"
      shift 2
      ;;
    --apply|--clean|--dry-run)
      MODE="$1"
      shift
      ;;
    *)
      echo "E_COMPOSE_ARG: unknown argument '$1'"
      exit 2
      ;;
  esac
done

if [[ -z "${AGENTS_SRC}" || -z "${AGENTS_DST}" ]]; then
  echo "E_COMPOSE_ARG: --src and --dst are required (or AGENTS_SRC/AGENTS_DST env vars)."
  exit 2
fi
if [[ ! -d "${AGENTS_SRC}" ]]; then
  echo "E_COMPOSE_SRC: source directory not found: ${AGENTS_SRC}"
  exit 2
fi

compose_one() {
  local src="$1"
  local basename
  basename="$(basename "$src" .agent.md)"
  local dst="$AGENTS_DST/${basename}.md"

  local in_frontmatter=0
  local frontmatter_done=0
  local name="" description="" desc_cont=0
  local body=""

  while IFS= read -r line || [[ -n "$line" ]]; do
    if [[ $frontmatter_done -eq 0 ]]; then
      if [[ "$line" == "---" && $in_frontmatter -eq 0 ]]; then
        in_frontmatter=1
        continue
      elif [[ "$line" == "---" && $in_frontmatter -eq 1 ]]; then
        frontmatter_done=1
        continue
      fi

      if [[ $in_frontmatter -eq 1 ]]; then
        if [[ "$line" =~ ^name:\ (.+) ]]; then
          name="${BASH_REMATCH[1]}"
          desc_cont=0
        elif [[ "$line" =~ ^description:\ \> ]]; then
          desc_cont=1
          description=""
        elif [[ "$line" =~ ^description:\ (.+) ]]; then
          description="${BASH_REMATCH[1]}"
          desc_cont=0
        elif [[ $desc_cont -eq 1 && "$line" =~ ^\ \ (.+) ]]; then
          if [[ -n "$description" ]]; then
            description="$description ${BASH_REMATCH[1]}"
          else
            description="${BASH_REMATCH[1]}"
          fi
        else
          desc_cont=0
        fi
      fi
    else
      body+="$line"$'\n'
    fi
  done < "$src"

  if [[ -z "$name" ]]; then
    echo "  SKIP $src (E_COMPOSE_SCHEMA: missing name)"
    return 1
  fi

  if [[ "$MODE" == "--dry-run" || "$MODE" == "dry-run" ]]; then
    echo "  WOULD compose: $src -> $dst"
    echo "    name: $name"
    echo "    description: ${description:0:80}..."
    return 0
  fi

  printf -- '---\nname: %s\ndescription: %s\n---\n%s' \
    "$name" "$description" "$body" > "$dst"

  echo "  COMPOSED: $dst"
}

clean() {
  local count=0
  while IFS= read -r src; do
    local basename
    basename="$(basename "$src" .agent.md)"
    local dst="$AGENTS_DST/${basename}.md"
    if [[ -f "$dst" && "$MODE" == "--clean" ]]; then
      rm "$dst"
      echo "  REMOVED: $dst"
      ((count++))
    fi
  done < <(find "$AGENTS_SRC" -type f -name "$PATTERN" | sort)
  echo "Cleaned $count composed agent files."
}

echo "compose-agents: source=$AGENTS_SRC target=$AGENTS_DST mode=$MODE pattern=$PATTERN"
echo ""

mkdir -p "$AGENTS_DST"

if [[ "$MODE" == "--clean" ]]; then
  clean
  exit 0
fi

count=0
while IFS= read -r src; do
  compose_one "$src" && ((count++))
done < <(find "$AGENTS_SRC" -type f -name "$PATTERN" | sort)

echo ""
echo "Processed $count agent(s). Mode: $MODE"
if [[ "$MODE" == "--dry-run" || "$MODE" == "dry-run" ]]; then
  echo "Run with --apply to write files."
fi

