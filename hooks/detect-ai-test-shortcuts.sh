#!/usr/bin/env bash
set -euo pipefail

# PostToolUse hook: detect AI test shortcuts in test files

INPUT=$(cat)

FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty')

if [[ -z "$FILE_PATH" ]]; then
  exit 0
fi

# Check if this is a test file
BASENAME=$(basename "$FILE_PATH")
IS_TEST=false

if echo "$BASENAME" | grep -qE '^test_|_test\.|\.test\.|_spec\.'; then
  IS_TEST=true
fi

if [[ "$IS_TEST" != "true" ]]; then
  exit 0
fi

if [[ ! -f "$FILE_PATH" ]]; then
  exit 0
fi

CONTENT=$(cat "$FILE_PATH")
FOUND=""

# Flag always-passing assertions
if echo "$CONTENT" | grep -qE 'assert\s+True\b|assertTrue\s*\(\s*True\s*\)|expect\s*\(\s*true\s*\)\s*\.\s*toBe\s*\(\s*true\s*\)'; then
  FOUND="${FOUND}Always-passing assertion detected (assert True / assertTrue(True) / expect(true).toBe(true)). "
fi

# Flag test functions with no assertions
# Look for test functions/methods that don't contain assert/expect/should
while IFS= read -r func_name; do
  if [[ -n "$func_name" ]]; then
    # Get the function body (rough heuristic: next function or end of file)
    if ! echo "$CONTENT" | grep -A 50 "$func_name" | grep -qE '(assert|expect|should|verify|check)'; then
      FOUND="${FOUND}Test function '${func_name}' appears to have no assertions. "
      break
    fi
  fi
done < <(echo "$CONTENT" | grep -oE '(def test_\w+|it\s*\(|test\s*\(|describe\s*\()' | head -5)

# Flag skip decorators added to tests
if echo "$CONTENT" | grep -qE '@skip|@unittest\.skip|\.skip\s*\('; then
  FOUND="${FOUND}Test skip decorator detected (@skip / .skip()). Don't skip tests — fix or remove them. "
fi

# Flag TODO assertions
if echo "$CONTENT" | grep -qiE '(//|#)\s*TODO:?\s*(add\s+)?assert'; then
  FOUND="${FOUND}TODO assertion comment detected. Tests must have real assertions, not TODOs. "
fi

if [[ -n "$FOUND" ]]; then
  echo "BLOCKED: AI test shortcuts detected in ${BASENAME}. ${FOUND}Write real, meaningful tests." >&2
  exit 2
fi

exit 0
