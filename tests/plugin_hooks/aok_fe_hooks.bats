#!/usr/bin/env bats

setup() {
  load '../test_helper/common'
  HOOK="$REPO_ROOT/plugins/aok-fe/hooks/protect-generated-dart.sh"
}

@test "blocks .g.dart files" {
  run_hook "$HOOK" '{"tool_input":{"file_path":"lib/models/user.g.dart"}}'
  assert_failure 2
  assert_output --partial "BLOCKED"
}

@test "blocks .freezed.dart files" {
  run_hook "$HOOK" '{"tool_input":{"file_path":"lib/models/user.freezed.dart"}}'
  assert_failure 2
  assert_output --partial "BLOCKED"
}

@test "blocks .mocks.dart files" {
  run_hook "$HOOK" '{"tool_input":{"file_path":"test/mocks/auth.mocks.dart"}}'
  assert_failure 2
  assert_output --partial "BLOCKED"
}

@test "blocks .gr.dart files" {
  run_hook "$HOOK" '{"tool_input":{"file_path":"lib/router/app_router.gr.dart"}}'
  assert_failure 2
  assert_output --partial "BLOCKED"
}

@test "allows normal dart files" {
  run_hook "$HOOK" '{"tool_input":{"file_path":"lib/main.dart"}}'
  assert_success
}

@test "allows empty file_path" {
  run_hook "$HOOK" '{"tool_input":{}}'
  assert_success
}

# --- run-dart-analyze.sh scoping tests ---

setup_dart_analyze_scope() {
  HOOK_DA="$REPO_ROOT/plugins/aok-fe/hooks/run-dart-analyze.sh"
  setup_temp_dir
}

@test "run-dart-analyze: skips when not in a git repo" {
  setup_dart_analyze_scope
  cd "$TEST_TEMP_DIR"
  run_hook "$HOOK_DA" '{"tool_input":{"command":"git commit -m foo"}}'
  assert_success
  refute_output --partial "Running dart analyze"
  teardown_temp_dir
}

@test "run-dart-analyze: skips in a git repo without aok_app/" {
  setup_dart_analyze_scope
  cd "$TEST_TEMP_DIR"
  git init -q
  run_hook "$HOOK_DA" '{"tool_input":{"command":"git commit -m foo"}}'
  assert_success
  refute_output --partial "Running dart analyze"
  teardown_temp_dir
}

@test "run-dart-analyze: runs when aok_app/ marker is present" {
  setup_dart_analyze_scope
  cd "$TEST_TEMP_DIR"
  git init -q
  mkdir aok_app
  # Stub dart so the hook does not depend on dart being installed
  cat > dart <<'STUB'
#!/usr/bin/env bash
echo "Analyzing test..."
echo "No issues found!"
STUB
  chmod +x dart
  PATH="$TEST_TEMP_DIR:$PATH" run_hook "$HOOK_DA" '{"tool_input":{"command":"git commit -m foo"}}'
  assert_success
  assert_output --partial "Running dart analyze"
  teardown_temp_dir
}

@test "run-dart-analyze: ignores non-commit commands" {
  setup_dart_analyze_scope
  run_hook "$HOOK_DA" '{"tool_input":{"command":"git status"}}'
  assert_success
  refute_output --partial "Running dart analyze"
}
