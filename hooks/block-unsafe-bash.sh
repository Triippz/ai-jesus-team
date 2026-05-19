#!/usr/bin/env bash
set -euo pipefail

# Block bash escape hatches that could bypass file protections

INPUT=$(cat)

COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command // empty')

if [[ -z "$COMMAND" ]]; then
  exit 0
fi

# Protected file patterns for sed/echo/cat/python bypass detection
PROTECTED_PATTERNS='(\.env($|\..*)|(^|/)\.git/|google-services\.json|GoogleService-Info\.plist|\.(secret|key|pem)$)'

# Block sed -i on protected files
if echo "$COMMAND" | grep -qE 'sed\s+-i' && echo "$COMMAND" | grep -qE "$PROTECTED_PATTERNS"; then
  echo "BLOCKED: sed -i on protected files is not allowed." >&2
  exit 2
fi

# Block python -c / python3 -c writing to protected files
if echo "$COMMAND" | grep -qE 'python3?\s+-c' && echo "$COMMAND" | grep -qE "$PROTECTED_PATTERNS"; then
  echo "BLOCKED: python -c writing to protected files is not allowed." >&2
  exit 2
fi

# Block echo/cat redirects to protected files
if echo "$COMMAND" | grep -qE '(echo|cat)\s+.*>+' && echo "$COMMAND" | grep -qE "$PROTECTED_PATTERNS"; then
  echo "BLOCKED: Redirecting output to protected files is not allowed." >&2
  exit 2
fi

# Block rm -rf /
if echo "$COMMAND" | grep -qE 'rm\s+-rf\s+/\s*$|rm\s+-rf\s+/$'; then
  echo "BLOCKED: rm -rf / is never allowed." >&2
  exit 2
fi

# Block curl | bash and wget | bash (piped execution)
if echo "$COMMAND" | grep -qE '(curl|wget)\s+.*\|\s*(bash|sh|zsh)'; then
  echo "BLOCKED: Piping downloaded content to a shell is not allowed." >&2
  exit 2
fi

# Block chmod 777
if echo "$COMMAND" | grep -qE 'chmod\s+777'; then
  echo "BLOCKED: chmod 777 (world-writable) is not allowed. Use more restrictive permissions." >&2
  exit 2
fi

# Block eval with variable expansion
if echo "$COMMAND" | grep -qE 'eval\s+.*\$'; then
  echo "BLOCKED: eval with variable expansion is not allowed due to injection risk." >&2
  exit 2
fi

exit 0
