#!/usr/bin/env bash
set -euo pipefail

# Block broad git staging commands — require explicit file names

INPUT=$(cat)

COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command // empty')

if [[ -z "$COMMAND" ]]; then
  exit 0
fi

# Block git add -A
if echo "$COMMAND" | grep -qE 'git\s+add\s+-A'; then
  echo "BLOCKED: Use explicit file names with git add instead of staging everything. 'git add -A' stages all changes including potentially sensitive files." >&2
  exit 2
fi

# Block git add --all
if echo "$COMMAND" | grep -qE 'git\s+add\s+--all'; then
  echo "BLOCKED: Use explicit file names with git add instead of staging everything. 'git add --all' stages all changes including potentially sensitive files." >&2
  exit 2
fi

# Block git add .
if echo "$COMMAND" | grep -qE 'git\s+add\s+\.\s*$'; then
  echo "BLOCKED: Use explicit file names with git add instead of staging everything. 'git add .' stages all changes including potentially sensitive files." >&2
  exit 2
fi

exit 0
