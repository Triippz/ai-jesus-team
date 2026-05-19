#!/usr/bin/env bats

setup() {
  load '../test_helper/common'
  load '../test_helper/install_helper'
  setup_install_env
  mkdir -p "$FAKE_CLAUDE_DIR"
  echo '{}' > "$FAKE_CLAUDE_DIR/settings.json"
}

teardown() {
  teardown_install_env
}

@test "target exists — no warning, no prompt" {
  run_install "--profile aok --skip-tools --target $FAKE_TARGET"
  assert_success
  refute_output --partial "Target repo not found"
  refute_output --partial "using default"
  assert_output --partial "Target repo:"
}

@test "target missing, non-interactive — warns with default" {
  run bash -c "HOME='$FAKE_HOME' bash '$REPO_ROOT/install.sh' --profile aok --skip-tools --target /nonexistent-path-abc123 < /dev/null 2>&1"
  assert_success
  assert_output --partial "using default, override with --target"
}

@test "dry run skips prompt even when target missing" {
  run_install "--profile aok --dry-run --target /nonexistent-path-abc123"
  assert_success
  refute_output --partial "Target repo not found"
  refute_output --partial "using default"
  assert_output --partial "DRY RUN"
}

@test "steps 3/4 skip when target does not exist" {
  run bash -c "HOME='$FAKE_HOME' bash '$REPO_ROOT/install.sh' --profile aok --skip-tools --target /nonexistent-path-abc123 < /dev/null 2>&1"
  assert_success
  assert_output --partial "Target repo does not exist"
}

@test "steps 3/4 run when target exists" {
  run_install "--profile aok --skip-tools --target $FAKE_TARGET"
  assert_success
  refute_output --partial "Target repo does not exist"
}

@test "target path appears in summary" {
  run_install "--profile aok --skip-tools --target $FAKE_TARGET"
  assert_success
  assert_output --partial "Target repo:  $FAKE_TARGET"
}

# --- New tests for target_repo removal ---

@test "no target, non-interactive — errors with clear message" {
  run bash -c "HOME='$FAKE_HOME' bash '$REPO_ROOT/install.sh' --profile aok --skip-tools < /dev/null 2>&1"
  assert_failure
  assert_output --partial "No target repo specified"
}

@test "no target, dry-run — succeeds with placeholder" {
  run_install "--profile aok --dry-run"
  assert_success
  assert_output --partial "no target specified"
}

@test "tilde expansion via --target" {
  # Pass a literal ~ that should be expanded by install.sh
  run_install "--profile aok --skip-tools --dry-run --target ~/nonexistent-test-path"
  assert_success
  assert_output --partial "$HOME/nonexistent-test-path"
  refute_output --partial "~/nonexistent-test-path"
}

@test "--skip-tools shows skipped message" {
  run_install "--profile aok --skip-tools --target $FAKE_TARGET"
  assert_success
  assert_output --partial "Skipped via --skip-tools"
}

@test "non-interactive with valid --target — no warnings" {
  run bash -c "HOME='$FAKE_HOME' bash '$REPO_ROOT/install.sh' --profile aok --skip-tools --target '$FAKE_TARGET' < /dev/null 2>&1"
  assert_success
  refute_output --partial "Target repo not found"
  refute_output --partial "No target repo specified"
}

@test "step 3 runs sync when target exists" {
  run_install "--profile aok --skip-tools --target $FAKE_TARGET"
  assert_success
  refute_output --partial "Skipping cursor rules sync"
}
