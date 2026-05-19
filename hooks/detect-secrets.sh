#!/usr/bin/env bash
set -euo pipefail

# Detect hardcoded secrets in file content (PreToolUse and PostToolUse)

INPUT=$(cat)

# Determine content to scan based on context
# PreToolUse: check tool_input.content or tool_input.new_string
# PostToolUse: read the file and scan

CONTENT=""

# Try tool_input.content first
CONTENT=$(echo "$INPUT" | jq -r '.tool_input.content // empty')

# Try tool_input.new_string
if [[ -z "$CONTENT" ]]; then
  CONTENT=$(echo "$INPUT" | jq -r '.tool_input.new_string // empty')
fi

# Try reading the file (PostToolUse case)
if [[ -z "$CONTENT" ]]; then
  FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty')
  if [[ -n "$FILE_PATH" ]] && [[ -f "$FILE_PATH" ]]; then
    CONTENT=$(cat "$FILE_PATH" 2>/dev/null || true)
  fi
fi

if [[ -z "$CONTENT" ]]; then
  exit 0
fi

FOUND=""

# API keys: sk-, pk_, AKIA, ghp_, gho_, github_pat_
if echo "$CONTENT" | grep -qE '(sk-[a-zA-Z0-9]{8,}|pk_[a-zA-Z0-9]{8,}|AKIA[0-9A-Z]{16}|ghp_[a-zA-Z0-9]{36,}|gho_[a-zA-Z0-9]{36,}|github_pat_[a-zA-Z0-9_]{20,})'; then
  FOUND="${FOUND}API key detected. "
fi

# Bearer tokens
if echo "$CONTENT" | grep -qE 'Bearer\s+[a-zA-Z0-9._-]{20,}'; then
  FOUND="${FOUND}Bearer token detected. "
fi

# Passwords (not empty or placeholder)
if echo "$CONTENT" | grep -qE 'password\s*=\s*["'"'"'][^"'"'"']{3,}["'"'"']'; then
  if ! echo "$CONTENT" | grep -qE 'password\s*=\s*["'"'"'](placeholder|changeme|xxx|your[_-]password|TODO|REPLACE)["'"'"']'; then
    FOUND="${FOUND}Hardcoded password detected. "
  fi
fi

# AWS access key
if echo "$CONTENT" | grep -qE 'AKIA[0-9A-Z]{16}'; then
  # Already caught above but be explicit
  FOUND="${FOUND}AWS access key detected. "
fi

# Generic secrets
if echo "$CONTENT" | grep -qE 'secret\s*=\s*["'"'"'][^"'"'"']{3,}["'"'"']'; then
  FOUND="${FOUND}Hardcoded secret detected. "
fi

# Generic tokens
if echo "$CONTENT" | grep -qE 'token\s*=\s*["'"'"'][^"'"'"']{8,}["'"'"']'; then
  FOUND="${FOUND}Hardcoded token detected. "
fi

if [[ -n "$FOUND" ]]; then
  echo "BLOCKED: Potential secrets detected in content. ${FOUND}Remove hardcoded secrets and use environment variables or a secrets manager instead." >&2
  exit 2
fi

exit 0
