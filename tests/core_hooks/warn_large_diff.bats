#!/usr/bin/env bats

setup() {
  load '../test_helper/common'
  setup_temp_dir
  HOOK="$REPO_ROOT/hooks/warn-large-diff.sh"

  # Create a temp git repo so git operations work on temp files
  cd "$TEST_TEMP_DIR"
  git init -q
  git config user.email "test@test.com"
  git config user.name "Test"
}

teardown() {
  cd "$REPO_ROOT"
  teardown_temp_dir
}

@test "allows small file" {
  for i in $(seq 1 50); do echo "line $i"; done > "$TEST_TEMP_DIR/small.txt"
  git -C "$TEST_TEMP_DIR" add small.txt
  git -C "$TEST_TEMP_DIR" commit -q -m "init"
  local input
  input=$(make_file_input "$TEST_TEMP_DIR/small.txt")
  run_hook "$HOOK" "$input"
  assert_success
  refute_output --partial "WARNING"
}

@test "warns on 500+ line file" {
  for i in $(seq 1 600); do echo "line $i"; done > "$TEST_TEMP_DIR/medium.txt"
  # Commit a small version first, then make it large (to get git diff stats)
  echo "initial" > "$TEST_TEMP_DIR/medium.txt"
  git -C "$TEST_TEMP_DIR" add medium.txt
  git -C "$TEST_TEMP_DIR" commit -q -m "init"
  for i in $(seq 1 600); do echo "line $i"; done > "$TEST_TEMP_DIR/medium.txt"
  local input
  input=$(make_file_input "$TEST_TEMP_DIR/medium.txt")
  run_hook "$HOOK" "$input"
  assert_success
  assert_output --partial "WARNING"
}

@test "blocks 2000+ line file" {
  echo "initial" > "$TEST_TEMP_DIR/large.txt"
  git -C "$TEST_TEMP_DIR" add large.txt
  git -C "$TEST_TEMP_DIR" commit -q -m "init"
  for i in $(seq 1 2100); do echo "line $i"; done > "$TEST_TEMP_DIR/large.txt"
  local input
  input=$(make_file_input "$TEST_TEMP_DIR/large.txt")
  run_hook "$HOOK" "$input"
  assert_failure 2
  assert_output --partial "BLOCKED"
}

@test "blocks new 2000+ line file via fallback" {
  # New file not in git — uses wc -l fallback
  for i in $(seq 1 2100); do echo "line $i"; done > "$TEST_TEMP_DIR/newlarge.txt"
  local input
  input=$(make_file_input "$TEST_TEMP_DIR/newlarge.txt")
  run_hook "$HOOK" "$input"
  assert_failure 2
  assert_output --partial "BLOCKED"
}

@test "warns new 500+ line file via fallback" {
  for i in $(seq 1 600); do echo "line $i"; done > "$TEST_TEMP_DIR/newmedium.txt"
  local input
  input=$(make_file_input "$TEST_TEMP_DIR/newmedium.txt")
  run_hook "$HOOK" "$input"
  assert_success
  assert_output --partial "WARNING"
}

@test "allows missing file" {
  local input
  input=$(make_file_input "$TEST_TEMP_DIR/nonexistent.txt")
  run_hook "$HOOK" "$input"
  assert_success
}

@test "allows empty file_path" {
  run_hook "$HOOK" '{"tool_input":{}}'
  assert_success
}
