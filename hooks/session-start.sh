#!/usr/bin/env bash
# SessionStart hook: loads the using-superpowers skill into context
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]:-$0}")" && pwd)"
PLUGIN_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

SKILL_FILE="$PLUGIN_ROOT/skills/using-superpowers/SKILL.md"

if [[ ! -f "$SKILL_FILE" ]]; then
  echo '{"hookSpecificOutput": {"additionalContext": "Warning: using-superpowers SKILL.md not found"}}'
  exit 0
fi

# Use python3 for safe JSON encoding of arbitrary file content
python3 -c "
import json, sys

with open('$SKILL_FILE', 'r') as f:
    content = f.read()

wrapper = '<EXTREMELY_IMPORTANT>\nYou have superpowers.\n\n**Below is the full content of your using-superpowers skill. For all other skills, use the Skill tool:**\n\n' + content + '\n\n</EXTREMELY_IMPORTANT>'

output = {
    'hookSpecificOutput': {
        'hookEventName': 'SessionStart',
        'additionalContext': wrapper
    }
}
print(json.dumps(output))
"

exit 0
