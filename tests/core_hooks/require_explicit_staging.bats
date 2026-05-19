#!/usr/bin/env bats

setup() {
  load '../test_helper/common'
  HOOK="$REPO_ROOT/hooks/require-explicit-staging.sh"
}

@test "blocks git add -A" {
  run_hook "$HOOK" '{"tool_input":{"command":"git add -A"}}'
  assert_failure 2
  assert_output --partial "BLOCKED"
}

@test "blocks git add --all" {
  run_hook "$HOOK" '{"tool_input":{"command":"git add --all"}}'
  assert_failure 2
  assert_output --partial "BLOCKED"
}

@test "blocks git add ." {
  run_hook "$HOOK" '{"tool_input":{"command":"git add ."}}'
  assert_failure 2
  assert_output --partial "BLOCKED"
}

@test "allows git add with specific file" {
  run_hook "$HOOK" '{"tool_input":{"command":"git add src/main.py"}}'
  assert_success
}

@test "allows git add with multiple files" {
  run_hook "$HOOK" '{"tool_input":{"command":"git add src/main.py src/utils.py"}}'
  assert_success
}

@test "allows empty command" {
  run_hook "$HOOK" '{"tool_input":{}}'
  assert_success
}

@test "allows non-git command" {
  run_hook "$HOOK" '{"tool_input":{"command":"echo hello"}}'
  assert_success
}
