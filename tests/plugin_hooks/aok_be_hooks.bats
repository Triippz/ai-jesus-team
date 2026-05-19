#!/usr/bin/env bats

setup() {
  load '../test_helper/common'
  HOOK="$REPO_ROOT/plugins/aok-be/hooks/protect-migrations.sh"
}

@test "blocks existing migration edit" {
  run_hook "$HOOK" '{"tool_input":{"file_path":"apps/users/migrations/0001_initial.py"}}'
  assert_failure 2
  assert_output --partial "BLOCKED"
}

@test "blocks migration with higher number" {
  run_hook "$HOOK" '{"tool_input":{"file_path":"apps/core/migrations/0042_add_field.py"}}'
  assert_failure 2
  assert_output --partial "BLOCKED"
}

@test "allows normal python files" {
  run_hook "$HOOK" '{"tool_input":{"file_path":"apps/users/models.py"}}'
  assert_success
}

@test "allows non-migration files in migrations dir" {
  run_hook "$HOOK" '{"tool_input":{"file_path":"apps/users/migrations/__init__.py"}}'
  assert_success
}

@test "allows empty file_path" {
  run_hook "$HOOK" '{"tool_input":{}}'
  assert_success
}
