#!/usr/bin/env bash
set -euo pipefail

# Block edits to sensitive files: .env, .git/, credentials, keys, secrets

INPUT=$(cat)

FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty')

if [[ -z "$FILE_PATH" ]]; then
  exit 0
fi

# Check against protected patterns
if echo "$FILE_PATH" | grep -qE '(^|/)\.env($|\..*)'; then
  echo "BLOCKED: Cannot edit .env files. These contain secrets and should be managed manually." >&2
  exit 2
fi

if echo "$FILE_PATH" | grep -qE '(^|/)\.git/'; then
  echo "BLOCKED: Cannot edit files inside .git/ directory." >&2
  exit 2
fi

if echo "$FILE_PATH" | grep -qE '(^|/)google-services\.json$'; then
  echo "BLOCKED: Cannot edit google-services.json. This contains sensitive configuration." >&2
  exit 2
fi

if echo "$FILE_PATH" | grep -qE '(^|/)GoogleService-Info\.plist$'; then
  echo "BLOCKED: Cannot edit GoogleService-Info.plist. This contains sensitive configuration." >&2
  exit 2
fi

if echo "$FILE_PATH" | grep -qE '\.(secret|key|pem)$'; then
  echo "BLOCKED: Cannot edit secret/key/certificate files (*.secret, *.key, *.pem)." >&2
  exit 2
fi

exit 0
