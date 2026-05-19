#!/usr/bin/env bash
set -euo pipefail

# Block git commits/pushes that target the main/master branch without explicit
# permission. Commits and pushes on feature branches are always allowed.
#
# Override for a single command: ALLOW_MAIN_BRANCH_COMMIT=1 git push origin main

INPUT=$(cat)

COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command // empty')
CWD=$(echo "$INPUT" | jq -r '.cwd // empty')

if [[ -z "$COMMAND" ]]; then
  exit 0
fi

# Only inspect git commit/push invocations (stand-alone or chained).
if ! echo "$COMMAND" | grep -qE '(^|[;&|]|\s)git\s+(commit|push)\b'; then
  exit 0
fi

# User-approved bypass.
if [[ "${ALLOW_MAIN_BRANCH_COMMIT:-0}" == "1" ]]; then
  exit 0
fi

WORK_DIR="${CWD:-$PWD}"

block() {
  local reason="$1"
  echo "BLOCKED: $reason" >&2
  echo "Main/master commits and pushes require explicit user permission." >&2
  echo "Options:" >&2
  echo "  1. Create a feature branch: git checkout -b feat/<topic>" >&2
  echo "  2. After confirming with the user, re-run with ALLOW_MAIN_BRANCH_COMMIT=1 prefixed." >&2
  exit 2
}

# Explicit push to main/master by name (e.g. `git push origin main[:main]`).
if echo "$COMMAND" | grep -qE 'git\s+push\s+\S+\s+(HEAD:)?(main|master)(\b|:)'; then
  block "pushing to main/master."
fi

# Current-branch check. Only run inside a real git repo.
if BRANCH=$(git -C "$WORK_DIR" symbolic-ref --short HEAD 2>/dev/null); then
  if [[ "$BRANCH" == "main" || "$BRANCH" == "master" ]]; then
    if echo "$COMMAND" | grep -qE 'git\s+commit\b'; then
      block "committing directly to $BRANCH."
    fi
    if echo "$COMMAND" | grep -qE 'git\s+push\b'; then
      block "pushing from $BRANCH."
    fi
  fi
fi

exit 0
