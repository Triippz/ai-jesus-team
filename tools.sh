#!/usr/bin/env bash
# dev-ai-utilities tool catalog — browse and install optional tools
#
# Usage:
#   ./tools.sh list                     # List all available tools
#   ./tools.sh list --category mcp-servers  # Filter by category
#   ./tools.sh list --bundle mcp-essentials # Show bundle contents
#   ./tools.sh bundles                  # List all bundles
#   ./tools.sh search <query>           # Search tools by name/tag
#   ./tools.sh info <tool-id>           # Show tool details
#   ./tools.sh install <tool-id>        # Install a single tool
#   ./tools.sh install --bundle <name>  # Install a bundle
#   ./tools.sh status                   # Show installed vs available
#   ./tools.sh --dry-run install ...    # Preview without installing
#
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CATALOG="$SCRIPT_DIR/catalog/tools.json"

# --- Colors ---
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
DIM='\033[2m'
NC='\033[0m'

ok()     { echo -e "  ${GREEN}✓${NC}  $*"; }
fail()   { echo -e "  ${RED}✗${NC}  $*"; }
warn()   { echo -e "  ${YELLOW}⚠${NC}  $*"; }
info()   { echo -e "  ${BLUE}→${NC}  $*"; }
header() { echo -e "\n${BOLD}$*${NC}"; }

# --- Detect OS ---
OS="unknown"
if [[ "$(uname -s)" == "Darwin" ]]; then OS="macos"
elif [[ "$(uname -s)" == "Linux" ]]; then OS="linux"
fi

# --- Check catalog exists ---
if [[ ! -f "$CATALOG" ]]; then
    fail "Tool catalog not found: $CATALOG"
    exit 1
fi

# --- JSON helper ---
py_query() {
    python3 -c "
import json, sys
with open('$CATALOG') as f:
    catalog = json.load(f)
$1
" 2>/dev/null
}

# --- Parse global flags ---
DRY_RUN=false
args=()
for arg in "$@"; do
    if [[ "$arg" == "--dry-run" ]]; then
        DRY_RUN=true
    else
        args+=("$arg")
    fi
done
set -- "${args[@]:-}"

# --- Commands ---
cmd_list() {
    local filter_cat=""
    local filter_bundle=""

    while [[ $# -gt 0 ]]; do
        case "$1" in
            --category) filter_cat="$2"; shift 2 ;;
            --bundle)   filter_bundle="$2"; shift 2 ;;
            *) shift ;;
        esac
    done

    if [[ -n "$filter_bundle" ]]; then
        header "Bundle: $filter_bundle"
        py_query "
bundle = catalog.get('bundles', {}).get('$filter_bundle')
if not bundle:
    print('  Bundle not found: $filter_bundle')
    sys.exit(1)
print(f'  {bundle[\"description\"]}')
print()
tool_map = {t['id']: t for t in catalog['tools']}
for tid in bundle['tools']:
    t = tool_map.get(tid, {})
    name = t.get('name', tid)
    desc = t.get('description', '')
    print(f'  {tid:<25s} {name:<30s} {desc}')
"
        return
    fi

    header "Available Tools"
    echo ""

    py_query "
categories = catalog.get('categories', {})
tools = catalog['tools']
filter_cat = '$filter_cat'

by_cat = {}
for t in tools:
    cat = t['category']
    if filter_cat and cat != filter_cat:
        continue
    by_cat.setdefault(cat, []).append(t)

for cat, cat_tools in sorted(by_cat.items()):
    cat_desc = categories.get(cat, '')
    print(f'  \033[1m{cat}\033[0m  {cat_desc}')
    for t in sorted(cat_tools, key=lambda x: x['id']):
        tags = ', '.join(t.get('tags', []))
        print(f'    {t[\"id\"]:<25s} {t[\"name\"]:<30s} {t[\"description\"]}')
    print()
"
}

cmd_bundles() {
    header "Available Bundles"
    echo ""
    py_query "
bundles = catalog.get('bundles', {})
for name, bundle in sorted(bundles.items()):
    tools_list = ', '.join(bundle['tools'])
    print(f'  \033[1m{name:<25s}\033[0m {bundle[\"description\"]}')
    print(f'  {\"\":<25s} \033[2mtools: {tools_list}\033[0m')
    print()
"
}

cmd_search() {
    local query="${1:-}"
    if [[ -z "$query" ]]; then
        fail "Usage: ./tools.sh search <query>"
        exit 1
    fi

    header "Search: $query"
    echo ""
    py_query "
query = '$query'.lower()
results = []
for t in catalog['tools']:
    searchable = ' '.join([
        t['id'], t['name'], t.get('description',''),
        t.get('category',''), ' '.join(t.get('tags',[]))
    ]).lower()
    if query in searchable:
        results.append(t)

if not results:
    print('  No tools found matching \"$query\"')
else:
    for t in results:
        tags = ', '.join(t.get('tags', []))
        print(f'  {t[\"id\"]:<25s} {t[\"name\"]:<30s} {t[\"description\"]}')
        print(f'  {\"\":<25s} \033[2mcategory: {t[\"category\"]}  tags: {tags}\033[0m')
        print()
"
}

cmd_info() {
    local tool_id="${1:-}"
    if [[ -z "$tool_id" ]]; then
        fail "Usage: ./tools.sh info <tool-id>"
        exit 1
    fi

    py_query "
tool = None
for t in catalog['tools']:
    if t['id'] == '$tool_id':
        tool = t
        break

if not tool:
    print(f'  Tool not found: $tool_id')
    sys.exit(1)

print(f'  \033[1m{tool[\"name\"]}\033[0m ({tool[\"id\"]})')
print(f'  {tool[\"description\"]}')
print()
print(f'  Category:  {tool[\"category\"]}')
tags = ', '.join(tool.get('tags', []))
print(f'  Tags:      {tags}')
if tool.get('homepage'):
    print(f'  Homepage:  {tool[\"homepage\"]}')
profiles = tool.get('profiles', [])
if profiles:
    print(f'  Profiles:  {chr(44).join(profiles)}')
requires = tool.get('requires', [])
if requires:
    print(f'  Requires:  {chr(44).join(requires)}')

install = tool.get('install', {})
itype = install.get('type', '?')
print()
print(f'  Install type: {itype}')
if itype == 'mcp':
    config = install.get('config', {})
    cmd = config.get('command', '?')
    args_list = ' '.join(config.get('args', []))
    print(f'  Command:      {cmd} {args_list}')
    env = install.get('env', {})
    if env:
        print(f'  Required env:')
        for k, v in env.items():
            desc = v.get('description', '')
            print(f'    {k}: {desc}')
elif itype == 'cli':
    os_name = '$OS'
    cmd = install.get(os_name, install.get('macos', '?'))
    check = install.get('check', '?')
    print(f'  Install ($OS): {cmd}')
    print(f'  Check:         {check}')
"
}

cmd_install() {
    local tool_id=""
    local bundle_name=""

    while [[ $# -gt 0 ]]; do
        case "$1" in
            --bundle) bundle_name="$2"; shift 2 ;;
            *) tool_id="$1"; shift ;;
        esac
    done

    if [[ -n "$bundle_name" ]]; then
        header "Installing bundle: $bundle_name"
        if [[ "$DRY_RUN" == "true" ]]; then warn "DRY RUN — no changes will be made"; fi
        echo ""

        tool_ids=$(py_query "
bundle = catalog.get('bundles', {}).get('$bundle_name')
if not bundle:
    print('ERROR')
    sys.exit(1)
print(' '.join(bundle['tools']))
")
        if [[ "$tool_ids" == "ERROR" ]]; then
            fail "Bundle not found: $bundle_name"
            exit 1
        fi

        for tid in $tool_ids; do
            install_single_tool "$tid"
        done
        return
    fi

    if [[ -z "$tool_id" ]]; then
        fail "Usage: ./tools.sh install <tool-id> or ./tools.sh install --bundle <name>"
        exit 1
    fi

    install_single_tool "$tool_id"
}

install_single_tool() {
    local tool_id="$1"

    local tool_json
    tool_json=$(py_query "
import os
tool = None
for t in catalog['tools']:
    if t['id'] == '$tool_id':
        tool = t
        break
if not tool:
    print('NOT_FOUND')
    sys.exit(0)

install = tool.get('install', {})
itype = install.get('type', 'unknown')
print(f'TYPE={itype}')
print(f'NAME={tool[\"name\"]}')

if itype == 'cli':
    check_cmd = install.get('check', '')
    os_name = '$OS'
    install_cmd = install.get(os_name, install.get('macos', ''))
    print(f'CHECK={check_cmd}')
    print(f'CMD={install_cmd}')
elif itype == 'mcp':
    config = install.get('config', {})
    cmd = config.get('command', '')
    args_list = '|'.join(config.get('args', []))
    scope = install.get('scope', 'global')
    print(f'MCP_CMD={cmd}')
    print(f'MCP_ARGS={args_list}')
    print(f'MCP_SCOPE={scope}')
    env = install.get('env', {})
    for k, v in env.items():
        req = v.get('required', False)
        desc = v.get('description', '')
        print(f'ENV={k}|{req}|{desc}')
")

    if [[ "$tool_json" == "NOT_FOUND" ]]; then
        fail "Tool not found: $tool_id"
        return 1
    fi

    local tool_type="" tool_name="" check_cmd="" install_cmd=""
    local mcp_cmd="" mcp_args="" mcp_scope=""
    local -a env_vars=()

    while IFS= read -r line; do
        case "$line" in
            TYPE=*)     tool_type="${line#TYPE=}" ;;
            NAME=*)     tool_name="${line#NAME=}" ;;
            CHECK=*)    check_cmd="${line#CHECK=}" ;;
            CMD=*)      install_cmd="${line#CMD=}" ;;
            MCP_CMD=*)  mcp_cmd="${line#MCP_CMD=}" ;;
            MCP_ARGS=*) mcp_args="${line#MCP_ARGS=}" ;;
            MCP_SCOPE=*) mcp_scope="${line#MCP_SCOPE=}" ;;
            ENV=*)      env_vars+=("${line#ENV=}") ;;
        esac
    done <<< "$tool_json"

    if [[ "$tool_type" == "cli" ]]; then
        # Check if already installed
        if [[ -n "$check_cmd" ]]; then
            local check_bin="${check_cmd%% *}"
            if command -v "$check_bin" &>/dev/null; then
                local version
                version=$(eval "$check_cmd" 2>/dev/null | head -1) || version="installed"
                ok "$tool_name already installed ($version)"
                return 0
            fi
        fi

        if [[ "$DRY_RUN" == "true" ]]; then
            info "Would install $tool_name: $install_cmd"
        else
            info "Installing $tool_name..."
            eval "$install_cmd"
            ok "$tool_name installed"
        fi

    elif [[ "$tool_type" == "mcp" ]]; then
        # Handle required env vars (prompt once, reuse across all tools)
        local env_json="{"
        local env_toml_lines=""
        local first_env=true
        for env_entry in "${env_vars[@]:-}"; do
            [[ -z "$env_entry" ]] && continue
            IFS='|' read -r env_key env_required env_desc <<< "$env_entry"

            local env_val="${!env_key:-}"
            if [[ -z "$env_val" ]]; then
                echo ""
                echo -e "  ${CYAN}$tool_name${NC} requires ${BOLD}$env_key${NC}"
                echo -e "  ${DIM}$env_desc${NC}"
                echo -n "  Enter value (or press Enter to skip): "
                read -r env_val
                if [[ -z "$env_val" ]]; then
                    warn "Skipping $tool_name — $env_key not provided"
                    return 0
                fi
            fi

            if [[ "$first_env" == "true" ]]; then first_env=false; else env_json+=","; fi
            env_json+="\"$env_key\":\"$env_val\""
            env_toml_lines+="$env_key = \"$env_val\"\n"
        done
        env_json+="}"

        # Build args
        local args_json="["
        local args_toml="["
        local first_arg=true
        IFS='|' read -ra arg_array <<< "$mcp_args"
        for arg in "${arg_array[@]}"; do
            if [[ "$first_arg" == "true" ]]; then first_arg=false
            else args_json+=","; args_toml+=", "; fi
            args_json+="\"$arg\""
            args_toml+="\"$arg\""
        done
        args_json+="]"
        args_toml+="]"

        if [[ "$DRY_RUN" == "true" ]]; then
            info "Would configure $tool_name in:"
            info "  Claude Code: ~/.claude/settings.json"
            info "  Cursor:      ~/.cursor/mcp.json"
            info "  Codex:       ~/.codex/config.toml"
            return 0
        fi

        local configured_count=0

        # --- Claude Code: ~/.claude/settings.json ---
        python3 -c "
import json, os
settings_file = os.path.expanduser('~/.claude/settings.json')
os.makedirs(os.path.dirname(settings_file), exist_ok=True)
try:
    with open(settings_file) as f:
        settings = json.load(f)
except (FileNotFoundError, json.JSONDecodeError):
    settings = {}
if 'mcpServers' not in settings:
    settings['mcpServers'] = {}
if '$tool_id' in settings['mcpServers']:
    print('SKIP')
else:
    server_config = {'command': '$mcp_cmd', 'args': json.loads('$args_json')}
    env_data = json.loads('$env_json')
    if env_data:
        server_config['env'] = env_data
    settings['mcpServers']['$tool_id'] = server_config
    with open(settings_file, 'w') as f:
        json.dump(settings, f, indent=2)
    print('OK')
" 2>/dev/null | while read -r result; do
            if [[ "$result" == "OK" ]]; then
                ok "$tool_name → Claude Code"
            else
                ok "$tool_name → Claude Code (already configured)"
            fi
        done

        # --- Cursor: ~/.cursor/mcp.json ---
        python3 -c "
import json, os
mcp_file = os.path.expanduser('~/.cursor/mcp.json')
os.makedirs(os.path.dirname(mcp_file), exist_ok=True)
try:
    with open(mcp_file) as f:
        mcp_config = json.load(f)
except (FileNotFoundError, json.JSONDecodeError):
    mcp_config = {}
if 'mcpServers' not in mcp_config:
    mcp_config['mcpServers'] = {}
if '$tool_id' in mcp_config['mcpServers']:
    print('SKIP')
else:
    server_config = {'command': '$mcp_cmd', 'args': json.loads('$args_json')}
    env_data = json.loads('$env_json')
    if env_data:
        server_config['env'] = env_data
    mcp_config['mcpServers']['$tool_id'] = server_config
    with open(mcp_file, 'w') as f:
        json.dump(mcp_config, f, indent=2)
    print('OK')
" 2>/dev/null | while read -r result; do
            if [[ "$result" == "OK" ]]; then
                ok "$tool_name → Cursor"
            else
                ok "$tool_name → Cursor (already configured)"
            fi
        done

        # --- Codex: ~/.codex/config.toml ---
        local codex_config="$HOME/.codex/config.toml"
        mkdir -p "$(dirname "$codex_config")"
        if [[ -f "$codex_config" ]] && grep -q "\[mcp_servers\.$tool_id\]" "$codex_config" 2>/dev/null; then
            ok "$tool_name → Codex (already configured)"
        else
            {
                echo ""
                echo "[mcp_servers.$tool_id]"
                echo "command = \"$mcp_cmd\""
                echo "args = $args_toml"
                if [[ -n "$env_toml_lines" ]]; then
                    echo ""
                    echo "[mcp_servers.$tool_id.env]"
                    echo -e "$env_toml_lines"
                fi
            } >> "$codex_config"
            ok "$tool_name → Codex"
        fi
    fi
}

cmd_status() {
    header "Tool Status"
    echo ""
    py_query "
import subprocess, shutil, os, json as j

# Load configs for all three tools
claude_servers = {}
cursor_servers = {}
codex_servers = set()

try:
    with open(os.path.expanduser('~/.claude/settings.json')) as f:
        claude_servers = j.load(f).get('mcpServers', {})
except: pass

try:
    with open(os.path.expanduser('~/.cursor/mcp.json')) as f:
        cursor_servers = j.load(f).get('mcpServers', {})
except: pass

codex_config = os.path.expanduser('~/.codex/config.toml')
if os.path.isfile(codex_config):
    with open(codex_config) as f:
        for line in f:
            if line.strip().startswith('[mcp_servers.'):
                name = line.strip().split('.', 1)[1].rstrip(']').split('.')[0]
                codex_servers.add(name)

for t in sorted(catalog['tools'], key=lambda x: (x['category'], x['id'])):
    install = t.get('install', {})
    itype = install.get('type', '?')
    tid = t['id']

    if itype == 'cli':
        check = install.get('check', '')
        if check:
            bin_name = check.split()[0]
            installed = shutil.which(bin_name) is not None
        else:
            installed = False
        status = '\033[0;32m✓\033[0m' if installed else '\033[2m·\033[0m'
        label = 'installed' if installed else 'available'
        print(f'  {status}  {tid:<25s} {t[\"name\"]:<30s} [{label}]')

    elif itype == 'mcp':
        in_claude = tid in claude_servers
        in_cursor = tid in cursor_servers
        in_codex = tid in codex_servers
        tools_list = []
        if in_claude: tools_list.append('claude')
        if in_cursor: tools_list.append('cursor')
        if in_codex: tools_list.append('codex')

        if tools_list:
            status = '\033[0;32m✓\033[0m'
            label = ', '.join(tools_list)
        else:
            status = '\033[2m·\033[0m'
            label = 'available'
        print(f'  {status}  {tid:<25s} {t[\"name\"]:<30s} [{label}]')
"
}

# --- Usage ---
cmd_usage() {
    echo -e "${BOLD}dev-ai-utilities tool catalog${NC}"
    echo ""
    echo "Usage:"
    echo "  ./tools.sh list                          List all tools"
    echo "  ./tools.sh list --category mcp-servers   Filter by category"
    echo "  ./tools.sh list --bundle mcp-essentials  Show bundle contents"
    echo "  ./tools.sh bundles                       List all bundles"
    echo "  ./tools.sh search <query>                Search tools"
    echo "  ./tools.sh info <tool-id>                Tool details"
    echo "  ./tools.sh install <tool-id>             Install a tool"
    echo "  ./tools.sh install --bundle <name>       Install a bundle"
    echo "  ./tools.sh status                        Show what's installed"
    echo ""
    echo "Flags:"
    echo "  --dry-run                                Preview without changes"
}

# --- Main ---
case "${1:-}" in
    list)     shift; cmd_list "$@" ;;
    bundles)  cmd_bundles ;;
    search)   shift; cmd_search "$@" ;;
    info)     shift; cmd_info "$@" ;;
    install)  shift; cmd_install "$@" ;;
    status)   cmd_status ;;
    help|-h|--help) cmd_usage ;;
    *)        cmd_usage ;;
esac
