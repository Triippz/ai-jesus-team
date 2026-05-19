#!/usr/bin/env bats

setup() {
  load '../test_helper/common'
  HOOK="$REPO_ROOT/hooks/session-start.sh"
}

@test "produces valid JSON output" {
  run_hook "$HOOK" '{}'
  assert_success
  # Verify it's valid JSON
  echo "$output" | python3 -m json.tool > /dev/null 2>&1
  assert_equal $? 0
}

@test "output contains hookSpecificOutput" {
  run_hook "$HOOK" '{}'
  assert_success
  echo "$output" | python3 -c "import json,sys; d=json.load(sys.stdin); assert 'hookSpecificOutput' in d"
}

@test "output contains additionalContext" {
  run_hook "$HOOK" '{}'
  assert_success
  echo "$output" | python3 -c "import json,sys; d=json.load(sys.stdin); assert 'additionalContext' in d['hookSpecificOutput']"
}

@test "output contains EXTREMELY_IMPORTANT wrapper" {
  run_hook "$HOOK" '{}'
  assert_success
  assert_output --partial "EXTREMELY_IMPORTANT"
}

@test "output contains superpowers reference" {
  run_hook "$HOOK" '{}'
  assert_success
  assert_output --partial "superpowers"
}
