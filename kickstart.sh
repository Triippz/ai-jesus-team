#!/usr/bin/env bash
# AI Kickstart — one-step clone + install for AI-assisted development
#
# Usage (from inside the cloned repo):
#   ./kickstart.sh --profile aok
#   ./kickstart.sh --profile atlas --skip-tools
#   ./kickstart.sh --list
#
# What it does:
#   1. Clones (or pulls) dev-ai-utilities to ~/.dev-ai-utilities
#   2. Runs install.sh with your arguments
#
set -euo pipefail

# --- Colors ---
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[0;33m'
RED='\033[0;31m'
BOLD='\033[1m'
NC='\033[0m'

ok()   { echo -e "  ${GREEN}✓${NC}  $*"; }
info() { echo -e "  ${BLUE}→${NC}  $*"; }
warn() { echo -e "  ${YELLOW}⚠${NC}  $*"; }
fail() { echo -e "  ${RED}✗${NC}  $*"; }

# --- Config ---
REPO_URL="https://gitlab.com/adyton/commercial/ai-tooling/dev-ai-utilities.git"
REPO_SSH="git@gitlab.com:adyton/commercial/ai-tooling/dev-ai-utilities.git"
INSTALL_DIR="${DEV_AI_UTILITIES_DIR:-$HOME/.dev-ai-utilities}"
BRANCH="${DEV_AI_UTILITIES_BRANCH:-main}"

echo -e "\n${BOLD}AI Kickstart${NC}\n"

# --- Clone or update ---
if [[ -d "$INSTALL_DIR/.git" ]]; then
    info "Updating dev-ai-utilities in $INSTALL_DIR..."
    git -C "$INSTALL_DIR" fetch --quiet origin "$BRANCH" 2>/dev/null
    git -C "$INSTALL_DIR" reset --quiet --hard "origin/$BRANCH" 2>/dev/null
    ok "Updated to latest"
else
    info "Installing dev-ai-utilities to $INSTALL_DIR..."

    # Try SSH first (for users with keys configured), fall back to HTTPS
    if git clone --quiet --depth 1 --branch "$BRANCH" "$REPO_SSH" "$INSTALL_DIR" 2>/dev/null; then
        ok "Cloned via SSH"
    elif git clone --quiet --depth 1 --branch "$BRANCH" "$REPO_URL" "$INSTALL_DIR" 2>/dev/null; then
        ok "Cloned via HTTPS"
    else
        fail "Could not clone repository. Check your GitLab access."
        echo ""
        echo "  SSH:   $REPO_SSH"
        echo "  HTTPS: $REPO_URL"
        echo ""
        echo "  Make sure you have access to the adyton/commercial/ai-tooling group."
        exit 1
    fi
fi

# --- Make scripts executable ---
chmod +x "$INSTALL_DIR/install.sh" "$INSTALL_DIR/scripts/sync-cursor-rules.sh"
find "$INSTALL_DIR" -name "*.sh" -path "*/hooks/*" -exec chmod +x {} \;

# --- Run installer ---
echo ""
exec "$INSTALL_DIR/install.sh" "$@"
