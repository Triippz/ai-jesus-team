#!/usr/bin/env bats

setup() {
  load '../test_helper/common'
  HOOK="$REPO_ROOT/hooks/block-destructive-git.sh"
}

@test "blocks git reset --hard" {
  run_hook "$HOOK" '{"tool_input":{"command":"git reset --hard HEAD~1"}}'
  assert_failure 2
  assert_output --partial "BLOCKED"
}

@test "blocks git clean -f" {
  run_hook "$HOOK" '{"tool_input":{"command":"git clean -fd"}}'
  assert_failure 2
  assert_output --partial "BLOCKED"
}

@test "blocks --no-verify" {
  run_hook "$HOOK" '{"tool_input":{"command":"git commit --no-verify -m \"test\""}}'
  assert_failure 2
  assert_output --partial "BLOCKED"
}

@test "blocks force push" {
  run_hook "$HOOK" '{"tool_input":{"command":"git push --force origin main"}}'
  assert_failure 2
  assert_output --partial "BLOCKED"
}

@test "blocks force push short flag" {
  run_hook "$HOOK" '{"tool_input":{"command":"git push -f origin main"}}'
  assert_failure 2
  assert_output --partial "BLOCKED"
}

@test "blocks branch -D main" {
  run_hook "$HOOK" '{"tool_input":{"command":"git branch -D main"}}'
  assert_failure 2
  assert_output --partial "BLOCKED"
}

@test "blocks branch -D master" {
  run_hook "$HOOK" '{"tool_input":{"command":"git branch -D master"}}'
  assert_failure 2
  assert_output --partial "BLOCKED"
}

@test "blocks git checkout ." {
  run_hook "$HOOK" '{"tool_input":{"command":"git checkout ."}}'
  assert_failure 2
  assert_output --partial "BLOCKED"
}

@test "blocks git stash drop" {
  run_hook "$HOOK" '{"tool_input":{"command":"git stash drop"}}'
  assert_failure 2
  assert_output --partial "BLOCKED"
}

@test "allows non-git command" {
  run_hook "$HOOK" '{"tool_input":{"command":"echo hello"}}'
  assert_success
}

@test "allows git log" {
  run_hook "$HOOK" '{"tool_input":{"command":"git log --oneline"}}'
  assert_success
}

@test "allows git diff" {
  run_hook "$HOOK" '{"tool_input":{"command":"git diff HEAD"}}'
  assert_success
}

@test "allows empty command" {
  run_hook "$HOOK" '{"tool_input":{}}'
  assert_success
}
