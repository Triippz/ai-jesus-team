#!/usr/bin/env bash
set -euo pipefail

# PostToolUse hook: warn on large diffs after Edit/Write operations

INPUT=$(cat)

# Get the file path
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty')

if [[ -z "$FILE_PATH" ]] || [[ ! -f "$FILE_PATH" ]]; then
  exit 0
fi

# Count lines in the file
LINE_COUNT=$(wc -l < "$FILE_PATH" 2>/dev/null | tr -d ' ')

if [[ -z "$LINE_COUNT" ]]; then
  exit 0
fi

# Check if we're in a git repo and can get diff stats
if git rev-parse --git-dir >/dev/null 2>&1; then
  DIFF_LINES=$(git diff --numstat -- "$FILE_PATH" 2>/dev/null | awk '{print $1 + $2}')
  if [[ -n "$DIFF_LINES" ]] && [[ "$DIFF_LINES" -ge 2000 ]]; then
    echo "BLOCKED: This change affects ${DIFF_LINES} lines. Changes over 2000 lines should be broken into smaller, reviewable pieces." >&2
    exit 2
  elif [[ -n "$DIFF_LINES" ]] && [[ "$DIFF_LINES" -ge 500 ]]; then
    echo "WARNING: This change affects ${DIFF_LINES} lines. Consider breaking large changes into smaller, more reviewable pieces." >&2
    exit 0
  elif [[ -n "$DIFF_LINES" ]]; then
    exit 0
  fi
fi

# Fallback: check file size for new files (not in git yet)
if [[ "$LINE_COUNT" -ge 2000 ]]; then
  echo "BLOCKED: This file is ${LINE_COUNT} lines long. Files over 2000 lines should be broken into smaller, reviewable pieces." >&2
  exit 2
elif [[ "$LINE_COUNT" -ge 500 ]]; then
  echo "WARNING: This file is ${LINE_COUNT} lines long. Consider breaking large files into smaller, more reviewable pieces." >&2
  exit 0
fi

exit 0
