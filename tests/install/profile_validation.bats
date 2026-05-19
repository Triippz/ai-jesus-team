#!/usr/bin/env bats

setup() {
  load '../test_helper/common'
  load '../test_helper/install_helper'
  setup_install_env
}

teardown() {
  teardown_install_env
}

@test "fails with nonexistent profile" {
  run_install "--profile nonexistent --skip-tools"
  assert_failure
  assert_output --partial "Profile not found"
}

@test "dry run with valid profile succeeds" {
  run_install "--profile aok --dry-run --skip-tools --target $FAKE_TARGET"
  assert_success
  assert_output --partial "DRY RUN"
}
