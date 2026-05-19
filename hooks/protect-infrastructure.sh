#!/usr/bin/env bash
set -euo pipefail

# Block edits to infrastructure files (CI/CD, Docker, Makefile, hooks)

INPUT=$(cat)

FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty')

if [[ -z "$FILE_PATH" ]]; then
  exit 0
fi

BLOCKED=""

# CI/CD files
if echo "$FILE_PATH" | grep -qE '\.github/workflows/.*\.yml$'; then
  BLOCKED="GitHub Actions workflow"
fi

if echo "$FILE_PATH" | grep -qE '\.gitlab-ci\.yml$'; then
  BLOCKED="GitLab CI configuration"
fi

# Docker files
if echo "$FILE_PATH" | grep -qE '(^|/)Dockerfile$'; then
  BLOCKED="Dockerfile"
fi

if echo "$FILE_PATH" | grep -qE '(^|/)docker-compose.*\.yml$'; then
  BLOCKED="Docker Compose configuration"
fi

# Makefile
if echo "$FILE_PATH" | grep -qE '(^|/)Makefile$'; then
  BLOCKED="Makefile"
fi

# Hooks themselves
if echo "$FILE_PATH" | grep -qE '(^|/)hooks/.*\.sh$'; then
  BLOCKED="hook script"
fi

if echo "$FILE_PATH" | grep -qE '(^|/)hooks/hooks\.json$'; then
  BLOCKED="hooks configuration"
fi

# Plugin config
if echo "$FILE_PATH" | grep -qE '(^|/)\.claude-plugin/.*\.json$'; then
  BLOCKED="plugin configuration"
fi

if [[ -n "$BLOCKED" ]]; then
  echo "BLOCKED: Cannot edit ${BLOCKED}. These are protected infrastructure files. Edit them manually or ask the user for explicit permission." >&2
  exit 2
fi

exit 0
