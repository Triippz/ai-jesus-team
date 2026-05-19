#!/usr/bin/env bash
set -euo pipefail

# Block dangerous SQL operations in bash commands

INPUT=$(cat)

COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command // empty')

if [[ -z "$COMMAND" ]]; then
  exit 0
fi

# Case-insensitive checks
COMMAND_UPPER=$(echo "$COMMAND" | tr '[:lower:]' '[:upper:]')

# Block DROP TABLE / DROP DATABASE
if echo "$COMMAND_UPPER" | grep -qE 'DROP\s+(TABLE|DATABASE)'; then
  echo "BLOCKED: DROP TABLE/DATABASE is a destructive SQL operation. This permanently deletes data." >&2
  exit 2
fi

# Block TRUNCATE
if echo "$COMMAND_UPPER" | grep -qE 'TRUNCATE\s'; then
  echo "BLOCKED: TRUNCATE is a destructive SQL operation. This permanently deletes all data in the table." >&2
  exit 2
fi

# Block DELETE FROM without WHERE
if echo "$COMMAND_UPPER" | grep -qE 'DELETE\s+FROM\s+' && ! echo "$COMMAND_UPPER" | grep -qE 'DELETE\s+FROM\s+\S+\s+WHERE'; then
  echo "BLOCKED: DELETE FROM without a WHERE clause deletes all rows. Add a WHERE clause to target specific rows." >&2
  exit 2
fi

exit 0
