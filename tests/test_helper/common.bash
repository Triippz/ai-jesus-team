#!/usr/bin/env bash
# Shared test helpers for bats tests

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

# Load bats libraries
load "$(dirname "${BASH_SOURCE[0]}")/bats-support/load"
load "$(dirname "${BASH_SOURCE[0]}")/bats-assert/load"

# --- Temp dir management ---

setup_temp_dir() {
  TEST_TEMP_DIR="$(mktemp -d)"
  export TEST_TEMP_DIR
}

teardown_temp_dir() {
  if [[ -n "${TEST_TEMP_DIR:-}" ]] && [[ -d "$TEST_TEMP_DIR" ]]; then
    rm -rf "$TEST_TEMP_DIR"
  fi
}

# --- Hook runners ---

# Run a hook script with JSON piped to stdin
# Usage: run_hook <hook_path> <json_string>
# Captures merged stdout+stderr, sets $status, $output, $lines
# Uses positional args to bash -c to avoid quoting issues with \" in JSON
run_hook() {
  local hook_path="$1"
  local json_input="$2"
  run bash -c 'printf "%s" "$1" | "$2" 2>&1' _ "$json_input" "$hook_path"
}

# Alias for backward compatibility — same implementation now
run_hook_safe() {
  run_hook "$@"
}

# --- JSON builders ---

# Build Bash tool input JSON: {"tool_input":{"command":"..."}, "cwd":"..."}
make_bash_input() {
  local command="$1"
  local cwd="${2:-}"
  if [[ -n "$cwd" ]]; then
    printf '{"tool_input":{"command":"%s"},"cwd":"%s"}' "$command" "$cwd"
  else
    printf '{"tool_input":{"command":"%s"}}' "$command"
  fi
}

# Build file tool input JSON: {"tool_input":{"file_path":"..."}}
make_file_input() {
  local file_path="$1"
  printf '{"tool_input":{"file_path":"%s"}}' "$file_path"
}

# Build content tool input JSON using jq for safe encoding
make_content_input() {
  local content="$1"
  jq -n --arg content "$content" '{"tool_input":{"content":$content}}'
}

# Build new_string tool input JSON: {"tool_input":{"file_path":"...","new_string":"..."}}
make_new_string_input() {
  local file_path="$1"
  local new_string="$2"
  jq -n --arg fp "$file_path" --arg ns "$new_string" \
    '{"tool_input":{"file_path":$fp,"new_string":$ns}}'
}
