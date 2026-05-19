#!/usr/bin/env bats

setup() {
  load '../test_helper/common'
  setup_temp_dir
  HOOK="$REPO_ROOT/hooks/detect-ai-test-shortcuts.sh"
}

teardown() {
  teardown_temp_dir
}

@test "detects assert True in test file" {
  cat > "$TEST_TEMP_DIR/test_example.py" << 'EOF'
def test_something():
    assert True
EOF
  local input
  input=$(make_file_input "$TEST_TEMP_DIR/test_example.py")
  run_hook_safe "$HOOK" "$input"
  assert_failure 2
  assert_output --partial "BLOCKED"
}

@test "detects assertTrue(True) in test file" {
  cat > "$TEST_TEMP_DIR/test_example.py" << 'EOF'
def test_something():
    assertTrue(True)
EOF
  local input
  input=$(make_file_input "$TEST_TEMP_DIR/test_example.py")
  run_hook_safe "$HOOK" "$input"
  assert_failure 2
  assert_output --partial "BLOCKED"
}

@test "detects @skip decorator" {
  cat > "$TEST_TEMP_DIR/test_example.py" << 'EOF'
@skip
def test_something():
    assert x == 1
EOF
  local input
  input=$(make_file_input "$TEST_TEMP_DIR/test_example.py")
  run_hook_safe "$HOOK" "$input"
  assert_failure 2
  assert_output --partial "BLOCKED"
}

@test "detects TODO assert" {
  cat > "$TEST_TEMP_DIR/test_example.py" << 'EOF'
def test_something():
    # TODO: add assertions
    pass
EOF
  local input
  input=$(make_file_input "$TEST_TEMP_DIR/test_example.py")
  run_hook_safe "$HOOK" "$input"
  assert_failure 2
  assert_output --partial "BLOCKED"
}

@test "ignores non-test files" {
  cat > "$TEST_TEMP_DIR/main.py" << 'EOF'
assert True
EOF
  local input
  input=$(make_file_input "$TEST_TEMP_DIR/main.py")
  run_hook_safe "$HOOK" "$input"
  assert_success
}

@test "allows test file with real assertions" {
  cat > "$TEST_TEMP_DIR/test_real.py" << 'EOF'
def test_addition():
    assert 1 + 1 == 2
EOF
  local input
  input=$(make_file_input "$TEST_TEMP_DIR/test_real.py")
  run_hook_safe "$HOOK" "$input"
  assert_success
}

@test "detects shortcuts in _spec files" {
  cat > "$TEST_TEMP_DIR/auth_spec.js" << 'EOF'
describe('auth', () => {
  it('should work', () => {
    expect(true).toBe(true)
  })
})
EOF
  local input
  input=$(make_file_input "$TEST_TEMP_DIR/auth_spec.js")
  run_hook_safe "$HOOK" "$input"
  assert_failure 2
  assert_output --partial "BLOCKED"
}

@test "detects shortcuts in .test. files" {
  cat > "$TEST_TEMP_DIR/utils.test.js" << 'EOF'
test('should work', () => {
  expect(true).toBe(true)
})
EOF
  local input
  input=$(make_file_input "$TEST_TEMP_DIR/utils.test.js")
  run_hook_safe "$HOOK" "$input"
  assert_failure 2
  assert_output --partial "BLOCKED"
}

@test "allows empty file_path" {
  run_hook "$HOOK" '{"tool_input":{}}'
  assert_success
}
