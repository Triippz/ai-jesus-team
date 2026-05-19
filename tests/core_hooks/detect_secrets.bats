#!/usr/bin/env bats

setup() {
  load '../test_helper/common'
  setup_temp_dir
  HOOK="$REPO_ROOT/hooks/detect-secrets.sh"
}

teardown() {
  teardown_temp_dir
}

@test "detects API key in content" {
  local input
  input=$(make_content_input 'api_key = "sk-abcdefghijklmnop"')
  run_hook_safe "$HOOK" "$input"
  assert_failure 2
  assert_output --partial "BLOCKED"
}

@test "detects AWS key in content" {
  local input
  input=$(make_content_input 'AWS_KEY = "AKIAIOSFODNN7EXAMPLE"')
  run_hook_safe "$HOOK" "$input"
  assert_failure 2
  assert_output --partial "BLOCKED"
}

@test "detects GitHub PAT in content" {
  local input
  input=$(make_content_input 'token = "ghp_ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijkl"')
  run_hook_safe "$HOOK" "$input"
  assert_failure 2
  assert_output --partial "BLOCKED"
}

@test "detects Bearer token in content" {
  local input
  input=$(make_content_input 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.payload.signature')
  run_hook_safe "$HOOK" "$input"
  assert_failure 2
  assert_output --partial "BLOCKED"
}

@test "detects hardcoded password" {
  local input
  input=$(make_content_input 'password = "super_secret_123"')
  run_hook_safe "$HOOK" "$input"
  assert_failure 2
  assert_output --partial "BLOCKED"
}

@test "allows placeholder password" {
  local input
  input=$(make_content_input 'password = "changeme"')
  run_hook_safe "$HOOK" "$input"
  assert_success
}

@test "allows placeholder password - placeholder" {
  local input
  input=$(make_content_input 'password = "placeholder"')
  run_hook_safe "$HOOK" "$input"
  assert_success
}

@test "detects secret in new_string" {
  local input
  input=$(make_new_string_input "/tmp/file.py" 'secret = "my_real_secret_value"')
  run_hook_safe "$HOOK" "$input"
  assert_failure 2
  assert_output --partial "BLOCKED"
}

@test "detects hardcoded token" {
  local input
  input=$(make_content_input 'token = "abcdefghijklmnop"')
  run_hook_safe "$HOOK" "$input"
  assert_failure 2
  assert_output --partial "BLOCKED"
}

@test "detects secret in file" {
  echo 'api_key = "sk-realkey12345678"' > "$TEST_TEMP_DIR/secrets.py"
  local input
  input=$(make_file_input "$TEST_TEMP_DIR/secrets.py")
  run_hook_safe "$HOOK" "$input"
  assert_failure 2
  assert_output --partial "BLOCKED"
}

@test "allows clean content" {
  local input
  input=$(make_content_input 'name = "hello world"')
  run_hook_safe "$HOOK" "$input"
  assert_success
}

@test "allows empty input" {
  run_hook "$HOOK" '{"tool_input":{}}'
  assert_success
}
