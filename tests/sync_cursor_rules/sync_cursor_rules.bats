#!/usr/bin/env bats

setup() {
  load '../test_helper/common'
  setup_temp_dir
  SYNC_SCRIPT="$REPO_ROOT/scripts/sync-cursor-rules.sh"

  # Create fake cursor-rules source
  FAKE_RULES_SRC="$TEST_TEMP_DIR/source/cursor-rules"
  mkdir -p "$FAKE_RULES_SRC/shared"
  echo "rule1 content" > "$FAKE_RULES_SRC/shared/rule1.mdc"
  echo "rule2 content" > "$FAKE_RULES_SRC/shared/rule2.mdc"

  # Create fake target repo
  FAKE_TARGET="$TEST_TEMP_DIR/target"
  mkdir -p "$FAKE_TARGET"
}

teardown() {
  teardown_temp_dir
}

@test "fails with too few arguments" {
  run bash -c "'$SYNC_SCRIPT' 2>&1"
  assert_failure
  assert_output --partial "Usage"
}

@test "fails with one argument" {
  run bash -c "'$SYNC_SCRIPT' /tmp 2>&1"
  assert_failure
  assert_output --partial "Usage"
}

@test "fails with nonexistent target" {
  run bash -c "'$SYNC_SCRIPT' /nonexistent/path shared 2>&1"
  assert_failure
  assert_output --partial "does not exist"
}

@test "syncs cursor rules to target using real source" {
  # Use real cursor-rules dir if it exists
  if [[ -d "$REPO_ROOT/cursor-rules" ]]; then
    # Find a rule dir that exists
    local rule_dir
    rule_dir=$(ls "$REPO_ROOT/cursor-rules/" | head -1)
    if [[ -n "$rule_dir" ]] && [[ -d "$REPO_ROOT/cursor-rules/$rule_dir" ]]; then
      run bash -c "'$SYNC_SCRIPT' '$FAKE_TARGET' '$rule_dir' 2>&1"
      assert_success
      # Check files were created
      [[ -d "$FAKE_TARGET/.cursor/rules" ]]
    else
      skip "No cursor rules directories found"
    fi
  else
    skip "No cursor-rules directory in repo"
  fi
}

@test "second sync is idempotent" {
  if [[ -d "$REPO_ROOT/cursor-rules" ]]; then
    local rule_dir
    rule_dir=$(ls "$REPO_ROOT/cursor-rules/" | head -1)
    if [[ -n "$rule_dir" ]] && [[ -d "$REPO_ROOT/cursor-rules/$rule_dir" ]]; then
      # First sync
      run bash -c "'$SYNC_SCRIPT' '$FAKE_TARGET' '$rule_dir' 2>&1"
      assert_success
      # Second sync
      run bash -c "'$SYNC_SCRIPT' '$FAKE_TARGET' '$rule_dir' 2>&1"
      assert_success
      assert_output --partial "already up to date"
    else
      skip "No cursor rules directories found"
    fi
  else
    skip "No cursor-rules directory in repo"
  fi
}
