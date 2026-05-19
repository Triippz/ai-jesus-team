#!/usr/bin/env bash
set -euo pipefail

# Enforce commit message format: type: [scope] description
# Block AI attribution in commit messages

INPUT=$(cat)

COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command // empty')

if [[ -z "$COMMAND" ]]; then
  exit 0
fi

# Only check git commit commands with -m flag
if ! echo "$COMMAND" | grep -qE 'git\s+commit.*-m'; then
  exit 0
fi

# Extract commit message (handle both -m "msg" and -m 'msg')
COMMIT_MSG=$(echo "$COMMAND" | sed -n "s/.*-m[[:space:]]*[\"']\([^\"']*\)[\"'].*/\1/p")

if [[ -z "$COMMIT_MSG" ]]; then
  exit 0
fi

# Check for AI attribution (comprehensive)
if echo "$COMMIT_MSG" | grep -qiE '\b(claude|anthropic|copilot|gpt|openai|cursor|gemini)\b'; then
  echo "BLOCKED: Commit messages must not contain AI tool references. Remove all AI references — commits must appear fully human-authored." >&2
  exit 2
fi

# Check for Co-Authored-By AI lines
if echo "$COMMAND" | grep -qiE 'co-authored-by.*\b(claude|anthropic|copilot|gpt|openai|cursor|gemini)\b'; then
  echo "BLOCKED: Commit must not contain Co-Authored-By AI attribution. Remove the Co-Authored-By line." >&2
  exit 2
fi

# Check for noreply@anthropic.com or similar AI emails
if echo "$COMMAND" | grep -qiF 'noreply@anthropic.com'; then
  echo "BLOCKED: Commit must not contain AI email addresses." >&2
  exit 2
fi

# Allowed types
ALLOWED_TYPES="feat|fix|docs|refactor|test|perf|build|ci|chore"

# Check format: type: description or type(scope): description
if ! echo "$COMMIT_MSG" | grep -qE "^($ALLOWED_TYPES)(\(.+\))?\s*:\s*.+"; then
  echo "BLOCKED: Commit message must follow format 'type: [scope] description'. Allowed types: feat, fix, docs, refactor, test, perf, build, ci, chore. Example: 'feat: add user authentication'" >&2
  exit 2
fi

exit 0
