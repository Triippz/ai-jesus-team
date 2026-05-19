#!/usr/bin/env bats

setup() {
  load '../test_helper/common'
  load '../test_helper/install_helper'
  setup_install_env
  mkdir -p "$FAKE_CLAUDE_DIR"
}

teardown() {
  teardown_install_env
}

@test "creates settings.json and merges plugins" {
  echo '{}' > "$FAKE_CLAUDE_DIR/settings.json"
  run_install "--profile aok --skip-tools --target $FAKE_TARGET"
  assert_success
  # Verify settings.json has plugins
  python3 -c "
import json
with open('$FAKE_CLAUDE_DIR/settings.json') as f:
    data = json.load(f)
assert 'projects' in data
"
}

@test "second run is idempotent" {
  echo '{}' > "$FAKE_CLAUDE_DIR/settings.json"
  run_install "--profile aok --skip-tools --target $FAKE_TARGET"
  assert_success
  # Run again
  run_install "--profile aok --skip-tools --target $FAKE_TARGET"
  assert_success
  assert_output --partial "already up to date"
}
