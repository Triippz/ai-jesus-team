#!/usr/bin/env bash
set -euo pipefail

# Block destructive git operations

INPUT=$(cat)

COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command // empty')

if [[ -z "$COMMAND" ]]; then
  exit 0
fi

# Only check git commands
if ! echo "$COMMAND" | grep -qE '^\s*git\s|;\s*git\s|&&\s*git\s|\|\s*git\s'; then
  exit 0
fi

# Block git reset --hard
if echo "$COMMAND" | grep -qE 'git\s+reset\s+--hard'; then
  echo "BLOCKED: git reset --hard discards all uncommitted changes. This is a destructive operation." >&2
  exit 2
fi

# Block git clean -f / -fd
if echo "$COMMAND" | grep -qE 'git\s+clean\s+-f'; then
  echo "BLOCKED: git clean -f permanently deletes untracked files. This is a destructive operation." >&2
  exit 2
fi

# Block --no-verify on any git command
if echo "$COMMAND" | grep -qE 'git\s+.*--no-verify'; then
  echo "BLOCKED: --no-verify skips safety hooks. Do not bypass verification." >&2
  exit 2
fi

# Block deleting main/master branches
if echo "$COMMAND" | grep -qE 'git\s+branch\s+-D\s+(main|master)'; then
  echo "BLOCKED: Deleting main/master branch is not allowed." >&2
  exit 2
fi

# Block force push
if echo "$COMMAND" | grep -qE 'git\s+push\s+(--force|-f)'; then
  echo "BLOCKED: Force push is not allowed. It rewrites remote history." >&2
  exit 2
fi

# Block git checkout . (discard all changes)
if echo "$COMMAND" | grep -qE 'git\s+checkout\s+\.\s*$'; then
  echo "BLOCKED: git checkout . discards all uncommitted changes. This is a destructive operation." >&2
  exit 2
fi

# Block git stash drop without context
if echo "$COMMAND" | grep -qE 'git\s+stash\s+drop'; then
  echo "BLOCKED: git stash drop permanently removes stashed changes. Confirm with the user first." >&2
  exit 2
fi

exit 0
