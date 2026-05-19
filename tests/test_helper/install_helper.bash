#!/usr/bin/env bash
# install.sh-specific test helpers

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

# --- Install environment setup ---

setup_install_env() {
  FAKE_HOME="$(mktemp -d)"
  FAKE_TARGET="$(mktemp -d)"
  FAKE_CLAUDE_DIR="$FAKE_HOME/.claude"
  MOCK_BIN="$(mktemp -d)"

  export FAKE_HOME FAKE_TARGET FAKE_CLAUDE_DIR MOCK_BIN

  # Create mock commands that just exit 0
  for cmd in brew node npm claude codex cursor; do
    printf '#!/usr/bin/env bash\nexit 0\n' > "$MOCK_BIN/$cmd"
    chmod +x "$MOCK_BIN/$cmd"
  done

  # Make node --version return something
  cat > "$MOCK_BIN/node" << 'MOCKEOF'
#!/usr/bin/env bash
if [[ "$1" == "--version" ]]; then
  echo "v20.0.0"
else
  exit 0
fi
MOCKEOF
  chmod +x "$MOCK_BIN/node"

  export PATH="$MOCK_BIN:$PATH"
}

teardown_install_env() {
  [[ -n "${FAKE_HOME:-}" ]] && rm -rf "$FAKE_HOME"
  [[ -n "${FAKE_TARGET:-}" ]] && rm -rf "$FAKE_TARGET"
  [[ -n "${MOCK_BIN:-}" ]] && rm -rf "$MOCK_BIN"
}

# Run install.sh with fake HOME
run_install() {
  run bash -c "HOME='$FAKE_HOME' bash '$REPO_ROOT/install.sh' $* 2>&1"
}
