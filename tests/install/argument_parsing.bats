#!/usr/bin/env bats

setup() {
  load '../test_helper/common'
  load '../test_helper/install_helper'
  setup_install_env
}

teardown() {
  teardown_install_env
}

@test "shows help with --help" {
  run_install "--help"
  assert_success
  assert_output --partial "Usage:"
}

@test "shows help with -h" {
  run_install "-h"
  assert_success
  assert_output --partial "Usage:"
}

@test "lists profiles with --list" {
  run_install "--list"
  assert_success
  assert_output --partial "Available Profiles"
}

@test "fails on unknown option" {
  run_install "--invalid-option"
  assert_failure
  assert_output --partial "Unknown option"
}

@test "fails without profile" {
  run_install ""
  assert_failure
  assert_output --partial "No profile specified"
}
