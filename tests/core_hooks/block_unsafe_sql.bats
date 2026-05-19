#!/usr/bin/env bats

setup() {
  load '../test_helper/common'
  HOOK="$REPO_ROOT/hooks/block-unsafe-sql.sh"
}

@test "blocks DROP TABLE" {
  run_hook "$HOOK" '{"tool_input":{"command":"psql -c \"DROP TABLE users\""}}'
  assert_failure 2
  assert_output --partial "BLOCKED"
}

@test "blocks DROP DATABASE" {
  run_hook "$HOOK" '{"tool_input":{"command":"psql -c \"DROP DATABASE mydb\""}}'
  assert_failure 2
  assert_output --partial "BLOCKED"
}

@test "blocks drop table lowercase" {
  run_hook "$HOOK" '{"tool_input":{"command":"psql -c \"drop table users\""}}'
  assert_failure 2
  assert_output --partial "BLOCKED"
}

@test "blocks TRUNCATE" {
  run_hook "$HOOK" '{"tool_input":{"command":"psql -c \"TRUNCATE users\""}}'
  assert_failure 2
  assert_output --partial "BLOCKED"
}

@test "blocks DELETE FROM without WHERE" {
  run_hook "$HOOK" '{"tool_input":{"command":"psql -c \"DELETE FROM users\""}}'
  assert_failure 2
  assert_output --partial "BLOCKED"
}

@test "allows DELETE FROM with WHERE" {
  run_hook "$HOOK" '{"tool_input":{"command":"psql -c \"DELETE FROM users WHERE id = 1\""}}'
  assert_success
}

@test "allows SELECT query" {
  run_hook "$HOOK" '{"tool_input":{"command":"psql -c \"SELECT * FROM users\""}}'
  assert_success
}

@test "allows empty command" {
  run_hook "$HOOK" '{"tool_input":{}}'
  assert_success
}

@test "allows non-SQL command" {
  run_hook "$HOOK" '{"tool_input":{"command":"echo hello"}}'
  assert_success
}
