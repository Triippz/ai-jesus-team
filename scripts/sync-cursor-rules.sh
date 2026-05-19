#!/usr/bin/env bash
# Sync cursor rules from dev-ai-utilities to target repo
# Usage: sync-cursor-rules.sh <target_repo> <rule_dir1> [rule_dir2] ...
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
CURSOR_RULES_SRC="$REPO_ROOT/cursor-rules"

# --- Colors ---
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m'

info()  { echo -e "${BLUE}[INFO]${NC}  $*"; }
ok()    { echo -e "${GREEN}[✓]${NC}     $*"; }
warn()  { echo -e "${YELLOW}[⚠]${NC}     $*"; }
err()   { echo -e "${RED}[✗]${NC}     $*" >&2; }

# --- Validate arguments ---
if [[ $# -lt 2 ]]; then
    err "Usage: sync-cursor-rules.sh <target_repo> <rule_dir1> [rule_dir2] ..."
    exit 1
fi

TARGET_REPO="$1"
shift
RULE_DIRS=("$@")

# Expand ~ in target path
TARGET_REPO="${TARGET_REPO/#\~/$HOME}"

if [[ ! -d "$TARGET_REPO" ]]; then
    err "Target repo does not exist: $TARGET_REPO"
    exit 1
fi

if [[ ! -d "$CURSOR_RULES_SRC" ]]; then
    err "Cursor rules source not found: $CURSOR_RULES_SRC"
    exit 1
fi

TARGET_RULES_DIR="$TARGET_REPO/.cursor/rules"

# --- Backup existing rules if present ---
if [[ -d "$TARGET_RULES_DIR" ]]; then
    TIMESTAMP=$(date +"%Y%m%d-%H%M%S")
    BACKUP_DIR="$TARGET_REPO/.cursor/rules.backup-$TIMESTAMP"

    # Check if there are any files that would actually change
    CHANGES_NEEDED=false
    for RULE_DIR in "${RULE_DIRS[@]}"; do
        SRC_DIR="$CURSOR_RULES_SRC/$RULE_DIR"
        if [[ ! -d "$SRC_DIR" ]]; then
            continue
        fi
        for SRC_FILE in "$SRC_DIR"/*.mdc; do
            [[ -f "$SRC_FILE" ]] || continue
            BASENAME="$(basename "$SRC_FILE")"
            TARGET_FILE="$TARGET_RULES_DIR/$BASENAME"
            if [[ ! -f "$TARGET_FILE" ]] || ! diff -q "$SRC_FILE" "$TARGET_FILE" > /dev/null 2>&1; then
                CHANGES_NEEDED=true
                break 2
            fi
        done
    done

    if [[ "$CHANGES_NEEDED" == "true" ]]; then
        info "Backing up existing rules to $BACKUP_DIR"
        cp -R "$TARGET_RULES_DIR" "$BACKUP_DIR"
    else
        ok "All cursor rules are already up to date"
        exit 0
    fi
fi

# --- Create target rules directory ---
mkdir -p "$TARGET_RULES_DIR"

# --- Sync each rule directory ---
SYNCED=0
SKIPPED=0

for RULE_DIR in "${RULE_DIRS[@]}"; do
    SRC_DIR="$CURSOR_RULES_SRC/$RULE_DIR"

    if [[ ! -d "$SRC_DIR" ]]; then
        warn "Rule directory not found, skipping: $SRC_DIR"
        continue
    fi

    for SRC_FILE in "$SRC_DIR"/*.mdc; do
        [[ -f "$SRC_FILE" ]] || continue
        BASENAME="$(basename "$SRC_FILE")"
        TARGET_FILE="$TARGET_RULES_DIR/$BASENAME"

        # Skip if identical
        if [[ -f "$TARGET_FILE" ]] && diff -q "$SRC_FILE" "$TARGET_FILE" > /dev/null 2>&1; then
            ok "Already current: $BASENAME"
            SKIPPED=$((SKIPPED + 1))
            continue
        fi

        cp "$SRC_FILE" "$TARGET_FILE"
        ok "Synced: $BASENAME (from $RULE_DIR/)"
        SYNCED=$((SYNCED + 1))
    done
done

# --- Summary ---
echo ""
info "Cursor rules sync complete: $SYNCED synced, $SKIPPED already current"
