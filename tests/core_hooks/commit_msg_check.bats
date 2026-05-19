#!/usr/bin/env bats

setup() {
  load '../test_helper/common'
  HOOK="$REPO_ROOT/hooks/commit-msg-check.sh"
}

@test "allows valid feat commit" {
  run_hook "$HOOK" '{"tool_input":{"command":"git commit -m \"feat: add login\""}}'
  assert_success
}

@test "allows valid fix commit" {
  run_hook "$HOOK" '{"tool_input":{"command":"git commit -m \"fix: resolve crash\""}}'
  assert_success
}

@test "allows scoped commit" {
  run_hook "$HOOK" '{"tool_input":{"command":"git commit -m \"feat(auth): add login\""}}'
  assert_success
}

@test "allows all valid types" {
  for type in feat fix docs refactor test perf build ci chore; do
    run_hook "$HOOK" "{\"tool_input\":{\"command\":\"git commit -m \\\"${type}: some change\\\"\"}}"
    assert_success
  done
}

@test "blocks bad format" {
  run_hook "$HOOK" '{"tool_input":{"command":"git commit -m \"added stuff\""}}'
  assert_failure 2
  assert_output --partial "BLOCKED"
}

@test "blocks AI attribution - claude" {
  run_hook "$HOOK" '{"tool_input":{"command":"git commit -m \"feat: add login by Claude\""}}'
  assert_failure 2
  assert_output --partial "BLOCKED"
}

@test "blocks AI attribution - anthropic" {
  run_hook "$HOOK" '{"tool_input":{"command":"git commit -m \"feat: Anthropic generated code\""}}'
  assert_failure 2
  assert_output --partial "BLOCKED"
}

@test "blocks AI attribution - co-authored-by AI" {
  run_hook "$HOOK" '{"tool_input":{"command":"git commit -m \"feat: add login Co-Authored-By AI\""}}'
  assert_failure 2
  assert_output --partial "BLOCKED"
}

@test "allows git commit without -m flag" {
  run_hook "$HOOK" '{"tool_input":{"command":"git commit --amend"}}'
  assert_success
}

@test "allows non-git commands" {
  run_hook "$HOOK" '{"tool_input":{"command":"echo hello"}}'
  assert_success
}

@test "allows empty command" {
  run_hook "$HOOK" '{"tool_input":{}}'
  assert_success
}
