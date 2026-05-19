#!/usr/bin/env bats

setup() {
  load '../test_helper/common'
  HOOK="$REPO_ROOT/hooks/protect-infrastructure.sh"
}

@test "blocks GitHub Actions workflow" {
  run_hook "$HOOK" '{"tool_input":{"file_path":".github/workflows/ci.yml"}}'
  assert_failure 2
  assert_output --partial "BLOCKED"
}

@test "blocks GitLab CI" {
  run_hook "$HOOK" '{"tool_input":{"file_path":".gitlab-ci.yml"}}'
  assert_failure 2
  assert_output --partial "BLOCKED"
}

@test "blocks Dockerfile" {
  run_hook "$HOOK" '{"tool_input":{"file_path":"Dockerfile"}}'
  assert_failure 2
  assert_output --partial "BLOCKED"
}

@test "blocks nested Dockerfile" {
  run_hook "$HOOK" '{"tool_input":{"file_path":"services/api/Dockerfile"}}'
  assert_failure 2
  assert_output --partial "BLOCKED"
}

@test "blocks docker-compose.yml" {
  run_hook "$HOOK" '{"tool_input":{"file_path":"docker-compose.yml"}}'
  assert_failure 2
  assert_output --partial "BLOCKED"
}

@test "blocks docker-compose.override.yml" {
  run_hook "$HOOK" '{"tool_input":{"file_path":"docker-compose.override.yml"}}'
  assert_failure 2
  assert_output --partial "BLOCKED"
}

@test "blocks Makefile" {
  run_hook "$HOOK" '{"tool_input":{"file_path":"Makefile"}}'
  assert_failure 2
  assert_output --partial "BLOCKED"
}

@test "blocks hook scripts" {
  run_hook "$HOOK" '{"tool_input":{"file_path":"hooks/block-git.sh"}}'
  assert_failure 2
  assert_output --partial "BLOCKED"
}

@test "blocks hooks.json" {
  run_hook "$HOOK" '{"tool_input":{"file_path":"hooks/hooks.json"}}'
  assert_failure 2
  assert_output --partial "BLOCKED"
}

@test "blocks plugin config" {
  run_hook "$HOOK" '{"tool_input":{"file_path":".claude-plugin/plugin.json"}}'
  assert_failure 2
  assert_output --partial "BLOCKED"
}

@test "allows normal source files" {
  run_hook "$HOOK" '{"tool_input":{"file_path":"src/app.py"}}'
  assert_success
}

@test "allows empty file_path" {
  run_hook "$HOOK" '{"tool_input":{}}'
  assert_success
}
