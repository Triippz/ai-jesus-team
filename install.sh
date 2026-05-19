#!/usr/bin/env bash
# dev-ai-utilities installer - idempotent bootstrap for AI development tools
# Supports macOS, Linux, and Windows (Git Bash / MSYS2 / Cygwin)
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROFILES_DIR="$SCRIPT_DIR/profiles"
SCRIPTS_DIR="$SCRIPT_DIR/scripts"

# --- Colors & Symbols ---
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
BOLD='\033[1m'
NC='\033[0m'

ok()    { echo -e "  ${GREEN}✓${NC}  $*"; }
fail()  { echo -e "  ${RED}✗${NC}  $*"; }
warn()  { echo -e "  ${YELLOW}⚠${NC}  $*"; }
info()  { echo -e "  ${BLUE}→${NC}  $*"; }
header(){ echo -e "\n${BOLD}$*${NC}"; }

# --- Helper: check if command exists ---
has_cmd() { command -v "$1" &>/dev/null; }

# --- Detect OS ---
OS="unknown"
if [[ "$(uname -s)" == "Darwin" ]]; then
    OS="macos"
elif [[ "$(uname -s)" == "Linux" ]]; then
    OS="linux"
elif [[ "$(uname -s)" == MINGW* ]] || [[ "$(uname -s)" == MSYS* ]] || [[ "$(uname -s)" == CYGWIN* ]]; then
    OS="windows"
fi

# --- Python command detection (Windows uses 'python', not 'python3') ---
PYTHON_CMD=""
if has_cmd python3; then
    PYTHON_CMD="python3"
elif has_cmd python; then
    PYTHON_CMD="python"
fi

# --- Windows path conversion helper ---
# Converts Git Bash Unix-style paths (/c/foo) to Windows paths (C:\foo).
# Only needed for extraKnownMarketplaces.source.path — Claude Code itself
# uses Unix-style paths for all other settings keys.
to_win_path() {
    local p="$1"
    if has_cmd cygpath; then
        cygpath -w "$p"
    else
        $PYTHON_CMD -c "
import re, sys
p = sys.argv[1]
m = re.match(r'^/([a-zA-Z])/(.*)', p)
if m:
    print(m.group(1).upper() + ':\\\\' + m.group(2).replace('/', '\\\\'))
else:
    print(p)
" "$p"
    fi
}

# --- Defaults ---
PROFILE=""
DRY_RUN=false
SKIP_TOOLS=false
TARGET_OVERRIDE=""
LIST_PROFILES=false

# --- Parse Arguments ---
while [[ $# -gt 0 ]]; do
    case "$1" in
        --profile)
            PROFILE="$2"
            shift 2
            ;;
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        --skip-tools)
            SKIP_TOOLS=true
            shift
            ;;
        --target)
            TARGET_OVERRIDE="$2"
            shift 2
            ;;
        --list)
            LIST_PROFILES=true
            shift
            ;;
        -h|--help)
            echo "Usage: install.sh [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  --profile <name>   Profile to install (required unless --list)"
            echo "  --dry-run          Preview changes without applying"
            echo "  --skip-tools       Skip tool installation, config only"
            echo "  --target <path>    Override target repository path"
            echo "  --list             List available profiles"
            echo "  -h, --help         Show this help"
            exit 0
            ;;
        *)
            fail "Unknown option: $1"
            exit 1
            ;;
    esac
done

# --- JSON Parsing Helpers ---
# Uses python/python3 as primary, jq as fallback.
# On Windows, Git Bash paths (/c/...) are converted before passing to Python.
json_get() {
    local file="$1"
    local key="$2"
    [[ "$OS" == "windows" ]] && file="$(to_win_path "$file")"
    if [[ -n "$PYTHON_CMD" ]]; then
        $PYTHON_CMD -c "
import json, sys
with open(sys.argv[1]) as f:
    data = json.load(f)
for k in sys.argv[2].split('.'):
    data = data[k]
if isinstance(data, list):
    print('\n'.join(str(x) for x in data))
else:
    print(data)
" "$file" "$key" 2>/dev/null
    elif command -v jq &>/dev/null; then
        jq -r ".$key" "$file" 2>/dev/null
    else
        fail "Neither python nor jq found. Install one to continue."
        exit 1
    fi
}

json_get_array() {
    local file="$1"
    local key="$2"
    [[ "$OS" == "windows" ]] && file="$(to_win_path "$file")"
    if [[ -n "$PYTHON_CMD" ]]; then
        $PYTHON_CMD -c "
import json, sys
with open(sys.argv[1]) as f:
    data = json.load(f)
for item in data.get(sys.argv[2], []):
    print(item)
" "$file" "$key" 2>/dev/null
    elif command -v jq &>/dev/null; then
        jq -r ".$key[]" "$file" 2>/dev/null
    fi
}

# --- List Profiles ---
if [[ "$LIST_PROFILES" == "true" ]]; then
    header "Available Profiles"
    echo ""
    for pfile in "$PROFILES_DIR"/*.json; do
        [[ "$(basename "$pfile")" == "profile-schema.json" ]] && continue
        [[ -f "$pfile" ]] || continue
        pname="$(json_get "$pfile" "name")"
        pdesc="$(json_get "$pfile" "description")"
        printf "  ${BOLD}%-15s${NC} %s\n" "$pname" "$pdesc"
    done
    echo ""
    exit 0
fi

# --- Validate Profile ---
if [[ -z "$PROFILE" ]]; then
    fail "No profile specified. Use --profile <name> or --list to see options."
    exit 1
fi

PROFILE_FILE="$PROFILES_DIR/$PROFILE.json"
if [[ ! -f "$PROFILE_FILE" ]]; then
    fail "Profile not found: $PROFILE_FILE"
    echo ""
    echo "Available profiles:"
    for pfile in "$PROFILES_DIR"/*.json; do
        [[ "$(basename "$pfile")" == "profile-schema.json" ]] && continue
        [[ -f "$pfile" ]] || continue
        echo "  - $(json_get "$pfile" "name")"
    done
    exit 1
fi

# --- Load Profile ---
PROFILE_NAME="$(json_get "$PROFILE_FILE" "name")"
PROFILE_DESC="$(json_get "$PROFILE_FILE" "description")"

# --- Load target: --target flag > profile field > prompt/error ---
if [[ -n "$TARGET_OVERRIDE" ]]; then
    TARGET_REPO="${TARGET_OVERRIDE/#\~/$HOME}"
else
    TARGET_REPO="$(json_get "$PROFILE_FILE" "target_repo" 2>/dev/null || true)"
    TARGET_REPO="${TARGET_REPO/#\~/$HOME}"
fi

if [[ -z "$TARGET_REPO" ]] && [[ "$DRY_RUN" != "true" ]]; then
    if [[ -t 0 ]]; then
        printf "  Enter the path to your %s repo: " "$PROFILE_NAME"
        read -r USER_TARGET
        if [[ -z "$USER_TARGET" ]]; then
            fail "No target path provided. Use --target <path> or enter a path when prompted."
            exit 1
        fi
        TARGET_REPO="${USER_TARGET/#\~/$HOME}"
    else
        fail "No target repo specified. Use --target <path>."
        exit 1
    fi
elif [[ -z "$TARGET_REPO" ]] && [[ "$DRY_RUN" == "true" ]]; then
    TARGET_REPO="<no target specified>"
fi

# If target was provided but doesn't exist, offer to correct it
if [[ "$TARGET_REPO" != "<no target specified>" ]] && [[ ! -d "$TARGET_REPO" ]] && [[ "$DRY_RUN" != "true" ]]; then
    if [[ -t 0 ]]; then
        warn "Target repo not found: $TARGET_REPO"
        printf "  Enter the correct path (or press Enter to use default): "
        read -r USER_TARGET
        if [[ -n "$USER_TARGET" ]]; then
            TARGET_REPO="${USER_TARGET/#\~/$HOME}"
        fi
    else
        warn "Target repo not found: $TARGET_REPO (using default, override with --target)"
    fi
fi

# --- Compute Windows path for marketplace source ---
# extraKnownMarketplaces.source.path requires a Windows path (C:\...) on Windows.
# All other settings keys use Unix format (/c/...) as Claude Code expects.
if [[ "$OS" == "windows" ]]; then
    SCRIPT_DIR_FOR_JSON="$(to_win_path "$SCRIPT_DIR")"
else
    SCRIPT_DIR_FOR_JSON="$SCRIPT_DIR"
fi

PLUGINS=()
while IFS= read -r line; do
    [[ -n "$line" ]] && PLUGINS+=("$line")
done < <(json_get_array "$PROFILE_FILE" "plugins")

CURSOR_RULES=()
while IFS= read -r line; do
    [[ -n "$line" ]] && CURSOR_RULES+=("$line")
done < <(json_get_array "$PROFILE_FILE" "cursor_rules")

header "dev-ai-utilities installer"
echo ""
info "Profile:      $PROFILE_NAME"
info "Description:  $PROFILE_DESC"
info "Target repo:  $TARGET_REPO"
info "Plugins:      ${PLUGINS[*]}"
info "Cursor rules: ${CURSOR_RULES[*]}"
if [[ "$DRY_RUN" == "true" ]]; then
    warn "DRY RUN - no changes will be made"
fi
echo ""

# ============================================================
# STEP 1: Tool Installation
# ============================================================
if [[ "$SKIP_TOOLS" == "false" ]]; then
    header "Step 1: Tool Installation"

    # --- Node.js ---
    if has_cmd node; then
        ok "Node.js already installed ($(node --version))"
    else
        if [[ "$DRY_RUN" == "true" ]]; then
            info "Would install Node.js"
        else
            if [[ "$OS" == "macos" ]] && has_cmd brew; then
                info "Installing Node.js via Homebrew..."
                brew install node
                ok "Node.js installed"
            elif [[ "$OS" == "windows" ]]; then
                if has_cmd winget; then
                    info "Installing Node.js via winget..."
                    winget install --id OpenJS.NodeJS.LTS -e --source winget
                    ok "Node.js installed via winget"
                elif has_cmd choco; then
                    info "Installing Node.js via Chocolatey..."
                    choco install nodejs-lts -y
                    ok "Node.js installed via Chocolatey"
                else
                    warn "Could not auto-install Node.js. Download from https://nodejs.org"
                fi
            elif [[ "$OS" == "linux" ]]; then
                if has_cmd nvm; then
                    info "Installing Node.js via nvm..."
                    nvm install --lts
                    ok "Node.js installed via nvm"
                elif has_cmd apt-get; then
                    info "Installing Node.js via apt..."
                    curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
                    sudo apt-get install -y nodejs
                    ok "Node.js installed"
                else
                    warn "Could not auto-install Node.js. Please install manually."
                fi
            else
                warn "Could not auto-install Node.js. Please install manually."
            fi
        fi
    fi

    # --- Claude Code ---
    if has_cmd claude; then
        ok "Claude Code already installed"
    else
        if [[ "$DRY_RUN" == "true" ]]; then
            if [[ "$OS" == "macos" ]] && has_cmd brew; then
                info "Would install Claude Code (brew install --cask claude-code)"
            else
                info "Would install Claude Code (native installer: curl -fsSL https://claude.ai/install.sh | bash)"
            fi
        else
            if [[ "$OS" == "macos" ]] && has_cmd brew; then
                info "Installing Claude Code via Homebrew..."
                brew install --cask claude-code
                ok "Claude Code installed via Homebrew"
            else
                info "Installing Claude Code via native installer..."
                curl -fsSL https://claude.ai/install.sh | bash
                ok "Claude Code installed"
            fi
        fi
    fi

    # --- Codex ---
    if has_cmd codex; then
        ok "Codex already installed"
    else
        if [[ "$DRY_RUN" == "true" ]]; then
            if [[ "$OS" == "macos" ]] && has_cmd brew; then
                info "Would install Codex (brew install --cask codex)"
            else
                info "Would install Codex (npm i -g @openai/codex)"
            fi
        else
            if [[ "$OS" == "macos" ]] && has_cmd brew; then
                info "Installing Codex via Homebrew..."
                brew install --cask codex
                ok "Codex installed via Homebrew"
            elif has_cmd npm; then
                info "Installing Codex via npm..."
                npm i -g @openai/codex
                ok "Codex installed via npm"
            else
                warn "Neither Homebrew nor npm found. Install Codex manually: https://github.com/openai/codex"
            fi
        fi
    fi

    # --- Cursor ---
    CURSOR_INSTALLED=false
    if has_cmd cursor; then
        CURSOR_INSTALLED=true
    elif [[ "$OS" == "windows" ]] && [[ -n "${LOCALAPPDATA:-}" ]] && [[ -f "$(cygpath -u "$LOCALAPPDATA" 2>/dev/null || echo "")/Programs/cursor/Cursor.exe" ]]; then
        CURSOR_INSTALLED=true
    elif [[ -d "/Applications/Cursor.app" ]]; then
        CURSOR_INSTALLED=true
    fi

    if [[ "$CURSOR_INSTALLED" == "true" ]]; then
        ok "Cursor already installed"
    else
        if [[ "$DRY_RUN" == "true" ]]; then
            info "Would install Cursor (download from https://cursor.com/download)"
        else
            if [[ "$OS" == "windows" ]]; then
                info "Opening Cursor download page..."
                start "https://cursor.com/download" 2>/dev/null || true
                warn "Download Cursor from https://cursor.com/download and run the installer"
            elif [[ "$OS" == "macos" ]]; then
                info "Opening Cursor download page..."
                open "https://cursor.com/download" 2>/dev/null || true
                warn "Download Cursor from https://cursor.com/download and drag to Applications"
            else
                warn "Download Cursor from https://cursor.com/download (AppImage for Linux)"
            fi
        fi
    fi
else
    header "Step 1: Tool Installation (skipped)"
    warn "Skipped via --skip-tools"
fi

# ============================================================
# STEP 2: Claude Code Configuration
# ============================================================
header "Step 2: Claude Code Configuration"

CLAUDE_SETTINGS="$HOME/.claude/settings.json"
CLAUDE_DIR="$HOME/.claude"

# Ensure directory exists
if [[ ! -d "$CLAUDE_DIR" ]]; then
    if [[ "$DRY_RUN" == "true" ]]; then
        info "Would create $CLAUDE_DIR"
    else
        mkdir -p "$CLAUDE_DIR"
        ok "Created $CLAUDE_DIR"
    fi
fi

# Ensure settings.json exists
if [[ ! -f "$CLAUDE_SETTINGS" ]]; then
    if [[ "$DRY_RUN" == "true" ]]; then
        info "Would create $CLAUDE_SETTINGS with empty config"
    else
        echo '{}' > "$CLAUDE_SETTINGS"
        ok "Created $CLAUDE_SETTINGS"
    fi
fi

# Merge plugin config into ~/.claude/settings.json.
# Writes:
#   - extraKnownMarketplaces  (registers this repo as a local marketplace)
#   - projects.<path>.plugins (direct plugin paths — Claude Code uses Unix paths as keys)
# On Windows, $SCRIPT_DIR_FOR_JSON is a Windows path used only for the marketplace
# source.path field; all other paths use the Unix format Claude Code expects.
merge_plugins() {
    local settings_file="$1"
    [[ "$OS" == "windows" ]] && settings_file="$(to_win_path "$settings_file")"
    shift
    local plugins_csv=""
    for p in "$@"; do
        plugins_csv="${plugins_csv:+$plugins_csv,}$p"
    done

    $PYTHON_CMD -c "
import json, sys

settings_file  = sys.argv[1]
repo_root_unix = sys.argv[2]
plugins_str    = sys.argv[3]
target_repo    = sys.argv[4]
repo_root_win  = sys.argv[5]

plugins = [p.strip() for p in plugins_str.split(',') if p.strip()]

with open(settings_file) as f:
    settings = json.load(f)

# --- extraKnownMarketplaces ---
if 'extraKnownMarketplaces' not in settings:
    settings['extraKnownMarketplaces'] = {}
if 'dev-ai-utilities' not in settings['extraKnownMarketplaces']:
    settings['extraKnownMarketplaces']['dev-ai-utilities'] = {
        'source': {'source': 'directory', 'path': repo_root_win}
    }
    print('marketplace:dev-ai-utilities')

# --- projects.<path>.plugins ---
if 'projects' not in settings:
    settings['projects'] = {}

plugin_dir_map = {
    'aok-fe-superpowers': 'plugins/aok-fe',
    'aok-be-superpowers': 'plugins/aok-be',
    'atlas-superpowers': 'plugins/atlas-superpowers',
    'atlas-infra-superpowers': 'plugins/atlas-infra-superpowers',
}

plugin_paths = []
for plugin in plugins:
    if plugin == 'core-superpowers':
        path = repo_root_unix
    else:
        rel = plugin_dir_map.get(plugin, f'plugins/{plugin}')
        path = repo_root_unix + '/' + rel
    plugin_paths.append(path)

if target_repo not in settings['projects']:
    settings['projects'][target_repo] = {}
project = settings['projects'][target_repo]

existing = set(project.get('plugins', []))
added = []
for p in plugin_paths:
    if p not in existing:
        added.append(p)
        existing.add(p)
project['plugins'] = sorted(existing)

with open(settings_file, 'w') as f:
    json.dump(settings, f, indent=2)

for a in added:
    print(f'added:{a}')
" "$settings_file" "$SCRIPT_DIR" "$plugins_csv" "$TARGET_REPO" "$SCRIPT_DIR_FOR_JSON" 2>/dev/null
}

# Write enabledPlugins to <target>/.claude/settings.local.json
configure_project_plugins() {
    local target="$1"
    shift
    local plugins=("$@")
    local claude_dir="$target/.claude"
    local local_settings="$claude_dir/settings.local.json"

    mkdir -p "$claude_dir"
    [[ -f "$local_settings" ]] || echo '{}' > "$local_settings"

    local win_local_settings
    [[ "$OS" == "windows" ]] && win_local_settings="$(to_win_path "$local_settings")" || win_local_settings="$local_settings"

    local plugins_csv=""
    for p in "${plugins[@]}"; do
        plugins_csv="${plugins_csv:+$plugins_csv,}$p"
    done

    $PYTHON_CMD -c "
import json, sys

local_settings = sys.argv[1]
plugins_str    = sys.argv[2]
plugins        = [p.strip() for p in plugins_str.split(',') if p.strip()]

with open(local_settings) as f:
    settings = json.load(f)

if 'enabledPlugins' not in settings:
    settings['enabledPlugins'] = {}

for plugin in plugins:
    key = f'{plugin}@dev-ai-utilities'
    if key not in settings['enabledPlugins']:
        settings['enabledPlugins'][key] = True
        print(f'enabled:{key}')

with open(local_settings, 'w') as f:
    json.dump(settings, f, indent=2)
" "$win_local_settings" "$plugins_csv" 2>/dev/null
}

if [[ "$DRY_RUN" == "true" ]]; then
    info "Would register dev-ai-utilities marketplace in $CLAUDE_SETTINGS"
    info "Would merge plugin paths into $CLAUDE_SETTINGS"
    for plugin in "${PLUGINS[@]}"; do
        info "  Plugin: $plugin"
    done
    if [[ "$TARGET_REPO" != "<no target specified>" ]]; then
        info "Would enable plugins in $TARGET_REPO/.claude/settings.local.json"
    fi
else
    MERGE_RESULT="$(merge_plugins "$CLAUDE_SETTINGS" "${PLUGINS[@]}")"
    while IFS= read -r line; do
        case "$line" in
            marketplace:*) ok "Registered marketplace: ${line#marketplace:}" ;;
            added:*)       ok "Added plugin path: ${line#added:}" ;;
        esac
    done <<< "$MERGE_RESULT"
    [[ -z "$MERGE_RESULT" ]] && ok "Claude Code user settings already up to date"

    if [[ -d "$TARGET_REPO" ]]; then
        PROJECT_RESULT="$(configure_project_plugins "$TARGET_REPO" "${PLUGINS[@]}")"
        if [[ -z "$PROJECT_RESULT" ]]; then
            ok "Project plugin settings already up to date"
        else
            while IFS= read -r line; do
                [[ "$line" == enabled:* ]] && ok "Enabled: ${line#enabled:}"
            done <<< "$PROJECT_RESULT"
        fi
    fi
fi

# ============================================================
# STEP 3: Cursor Rules
# ============================================================
header "Step 3: Cursor Rules"

if [[ ! -d "$TARGET_REPO" ]]; then
    warn "Target repo does not exist yet: $TARGET_REPO"
    warn "Skipping cursor rules sync. Run again after creating the repo."
else
    if [[ "$DRY_RUN" == "true" ]]; then
        info "Would sync cursor rules to $TARGET_REPO/.cursor/rules/"
        for rule in "${CURSOR_RULES[@]}"; do
            info "  Rule set: $rule"
        done
    else
        if [[ -x "$SCRIPTS_DIR/sync-cursor-rules.sh" ]]; then
            "$SCRIPTS_DIR/sync-cursor-rules.sh" "$TARGET_REPO" "${CURSOR_RULES[@]}"
        else
            chmod +x "$SCRIPTS_DIR/sync-cursor-rules.sh"
            "$SCRIPTS_DIR/sync-cursor-rules.sh" "$TARGET_REPO" "${CURSOR_RULES[@]}"
        fi
    fi
fi

# ============================================================
# STEP 4: Codex Configuration
# ============================================================
header "Step 4: Codex Configuration"

AGENTS_SRC="$SCRIPT_DIR/.agents"

if [[ ! -d "$AGENTS_SRC" ]]; then
    warn "No .agents/ directory found in dev-ai-utilities. Skipping Codex config."
else
    if [[ ! -d "$TARGET_REPO" ]]; then
        warn "Target repo does not exist: $TARGET_REPO. Skipping Codex config."
    else
        CODEX_TARGET_AGENTS="$TARGET_REPO/.agents"

        if [[ "$DRY_RUN" == "true" ]]; then
            info "Would copy .agents/ to $CODEX_TARGET_AGENTS"
            for plugin in "${PLUGINS[@]}"; do
                [[ "$plugin" == "core-superpowers" ]] && continue
                _plugin_rel=""
                case "$plugin" in
                    aok-fe-superpowers)       _plugin_rel="plugins/aok-fe" ;;
                    aok-be-superpowers)       _plugin_rel="plugins/aok-be" ;;
                    atlas-superpowers)        _plugin_rel="plugins/atlas-superpowers" ;;
                    atlas-infra-superpowers)  _plugin_rel="plugins/atlas-infra-superpowers" ;;
                    *)                        _plugin_rel="plugins/$plugin" ;;
                esac
                if [[ -d "$SCRIPT_DIR/$_plugin_rel/.agents/skills" ]]; then
                    info "Would merge Codex skills from $plugin"
                fi
            done
        else
            if [[ -d "$AGENTS_SRC/skills" ]]; then
                if diff -rq "$AGENTS_SRC/skills" "$CODEX_TARGET_AGENTS/skills" > /dev/null 2>&1; then
                    ok "Codex agent skills already current"
                else
                    cp -r "$AGENTS_SRC/skills" "$CODEX_TARGET_AGENTS/"
                    ok "Synced Codex agent skills"
                fi
            fi

            AGENTS_MD_SRC="$SCRIPT_DIR/AGENTS.md"
            if [[ -f "$AGENTS_MD_SRC" ]]; then
                AGENTS_MD_TARGET="$TARGET_REPO/AGENTS.md"
                if [[ -f "$AGENTS_MD_TARGET" ]]; then
                    ok "AGENTS.md exists in target (not overwriting project-owned file)"
                else
                    cp "$AGENTS_MD_SRC" "$AGENTS_MD_TARGET"
                    ok "Seeded AGENTS.md (no existing file found)"
                fi
            fi

            # Merge plugin-specific Codex skills into target
            for plugin in "${PLUGINS[@]}"; do
                [[ "$plugin" == "core-superpowers" ]] && continue
                _plugin_rel=""
                case "$plugin" in
                    aok-fe-superpowers)       _plugin_rel="plugins/aok-fe" ;;
                    aok-be-superpowers)       _plugin_rel="plugins/aok-be" ;;
                    atlas-superpowers)        _plugin_rel="plugins/atlas-superpowers" ;;
                    atlas-infra-superpowers)  _plugin_rel="plugins/atlas-infra-superpowers" ;;
                    *)                        _plugin_rel="plugins/$plugin" ;;
                esac
                _plugin_agents_src="$SCRIPT_DIR/$_plugin_rel/.agents/skills"
                if [[ -d "$_plugin_agents_src" ]]; then
                    mkdir -p "$CODEX_TARGET_AGENTS/skills"
                    if diff -rq "$_plugin_agents_src" "$CODEX_TARGET_AGENTS/skills" > /dev/null 2>&1; then
                        ok "Codex skills from $plugin already current"
                    else
                        cp -r "$_plugin_agents_src/"* "$CODEX_TARGET_AGENTS/skills/"
                        ok "Merged Codex skills from $plugin"
                    fi
                fi
            done
        fi
    fi
fi

# ============================================================
# Summary
# ============================================================
header "Installation Complete"
echo ""
ok "Profile:      $PROFILE_NAME"
ok "Target repo:  $TARGET_REPO"
if [[ "$DRY_RUN" == "true" ]]; then
    warn "This was a dry run. No changes were made."
    echo ""
    info "Run without --dry-run to apply changes."
fi
echo ""
