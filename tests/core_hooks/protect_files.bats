#!/usr/bin/env bats

setup() {
  load '../test_helper/common'
  HOOK="$REPO_ROOT/hooks/protect-files.sh"
}

@test "blocks .env file" {
  run_hook "$HOOK" '{"tool_input":{"file_path":".env"}}'
  assert_failure 2
  assert_output --partial "BLOCKED"
}

@test "blocks .env.local" {
  run_hook "$HOOK" '{"tool_input":{"file_path":".env.local"}}'
  assert_failure 2
  assert_output --partial "BLOCKED"
}

@test "blocks .env.production" {
  run_hook "$HOOK" '{"tool_input":{"file_path":".env.production"}}'
  assert_failure 2
  assert_output --partial "BLOCKED"
}

@test "blocks nested .env" {
  run_hook "$HOOK" '{"tool_input":{"file_path":"config/.env"}}'
  assert_failure 2
  assert_output --partial "BLOCKED"
}

@test "blocks .git directory" {
  run_hook "$HOOK" '{"tool_input":{"file_path":".git/config"}}'
  assert_failure 2
  assert_output --partial "BLOCKED"
}

@test "blocks google-services.json" {
  run_hook "$HOOK" '{"tool_input":{"file_path":"android/app/google-services.json"}}'
  assert_failure 2
  assert_output --partial "BLOCKED"
}

@test "blocks GoogleService-Info.plist" {
  run_hook "$HOOK" '{"tool_input":{"file_path":"ios/Runner/GoogleService-Info.plist"}}'
  assert_failure 2
  assert_output --partial "BLOCKED"
}

@test "blocks .key files" {
  run_hook "$HOOK" '{"tool_input":{"file_path":"server.key"}}'
  assert_failure 2
  assert_output --partial "BLOCKED"
}

@test "blocks .pem files" {
  run_hook "$HOOK" '{"tool_input":{"file_path":"cert.pem"}}'
  assert_failure 2
  assert_output --partial "BLOCKED"
}

@test "blocks .secret files" {
  run_hook "$HOOK" '{"tool_input":{"file_path":"app.secret"}}'
  assert_failure 2
  assert_output --partial "BLOCKED"
}

@test "allows normal files" {
  run_hook "$HOOK" '{"tool_input":{"file_path":"src/main.py"}}'
  assert_success
}

@test "allows empty file_path" {
  run_hook "$HOOK" '{"tool_input":{}}'
  assert_success
}
