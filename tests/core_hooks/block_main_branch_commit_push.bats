#!/usr/bin/env bats

setup() {
  load '../test_helper/common'
  HOOK="$REPO_ROOT/hooks/block-main-branch-commit-push.sh"

  # Isolated temp repo for branch-sensitive tests
  TMP_REPO="$(mktemp -d)"
  git -C "$TMP_REPO" init -q -b main
  git -C "$TMP_REPO" commit -q --allow-empty -m "init"
}

teardown() {
  rm -rf "$TMP_REPO"
}

run_with_cwd() {
  local cwd="$1" cmd="$2"
  run bash -c "printf '%s' '{\"tool_input\":{\"command\":\"$cmd\"},\"cwd\":\"$cwd\"}' | $HOOK"
}

@test "blocks commit while on main" {
  run_with_cwd "$TMP_REPO" "git commit -m test"
  assert_failure 2
  assert_output --partial "BLOCKED"
  assert_output --partial "main"
}

@test "blocks push while on main" {
  run_with_cwd "$TMP_REPO" "git push"
  assert_failure 2
  assert_output --partial "BLOCKED"
}

@test "blocks explicit push to main regardless of branch" {
  git -C "$TMP_REPO" checkout -q -b feat/x
  run_with_cwd "$TMP_REPO" "git push origin main"
  assert_failure 2
  assert_output --partial "BLOCKED"
}

@test "blocks explicit push to master regardless of branch" {
  git -C "$TMP_REPO" checkout -q -b feat/x
  run_with_cwd "$TMP_REPO" "git push origin master"
  assert_failure 2
  assert_output --partial "BLOCKED"
}

@test "allows commit on feature branch" {
  git -C "$TMP_REPO" checkout -q -b feat/x
  run_with_cwd "$TMP_REPO" "git commit -m test"
  assert_success
}

@test "allows push on feature branch" {
  git -C "$TMP_REPO" checkout -q -b feat/x
  run_with_cwd "$TMP_REPO" "git push"
  assert_success
}

@test "allows push to feature branch by name" {
  git -C "$TMP_REPO" checkout -q -b feat/x
  run_with_cwd "$TMP_REPO" "git push origin feat/x"
  assert_success
}

@test "respects ALLOW_MAIN_BRANCH_COMMIT override" {
  run bash -c "printf '%s' '{\"tool_input\":{\"command\":\"git push origin main\"},\"cwd\":\"$TMP_REPO\"}' | ALLOW_MAIN_BRANCH_COMMIT=1 $HOOK"
  assert_success
}

@test "allows non-git commands" {
  run_hook "$HOOK" '{"tool_input":{"command":"echo hello"}}'
  assert_success
}

@test "allows empty command" {
  run_hook "$HOOK" '{"tool_input":{"command":""}}'
  assert_success
}

@test "allows missing command field" {
  run_hook "$HOOK" '{"tool_input":{}}'
  assert_success
}

@test "allows git log on main" {
  run_with_cwd "$TMP_REPO" "git log --oneline"
  assert_success
}

@test "allows git status on main" {
  run_with_cwd "$TMP_REPO" "git status"
  assert_success
}
