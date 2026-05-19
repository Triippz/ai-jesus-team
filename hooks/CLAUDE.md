# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Purpose

Safety hook scripts for the core-superpowers plugin. Hooks enforce policies automatically during Claude Code sessions.

## Hooks

| Hook | Trigger | Purpose |
|------|---------|---------|
| session-start.sh | SessionStart | Inject using-superpowers skill into session context |
| block-main-branch-commit-push.sh | PreToolUse:Bash | Block commits/pushes on or to main/master without explicit permission |
| commit-msg-check.sh | PreToolUse:Bash | Enforce `type: [scope] description` format; block AI attribution |
| block-unsafe-bash.sh | PreToolUse:Bash | Close bash escape hatch — block sed/python/echo on protected files |
| block-destructive-git.sh | PreToolUse:Bash | Block reset --hard, clean -f, --no-verify, force push |
| require-explicit-staging.sh | PreToolUse:Bash | Block git add -A / git add . — require explicit file names |
| block-unsafe-sql.sh | PreToolUse:Bash | Block DROP, TRUNCATE, DELETE without WHERE |
| protect-files.sh | PreToolUse:Edit\|Write | Block .env, .git/, secrets, keys, credentials |
| detect-secrets.sh | PreToolUse+PostToolUse:Edit\|Write | Scan for hardcoded API keys, tokens, passwords |
| protect-infrastructure.sh | PreToolUse:Edit\|Write | Block edits to CI/CD, Docker, Makefile, hooks |
| warn-large-diff.sh | PostToolUse:Edit\|Write | Warn at 500+ lines, block at 2000+ |
| detect-ai-test-shortcuts.sh | PostToolUse:Edit\|Write | Flag always-passing assertions, missing assertions, skip decorators |

## Hook Configuration

`hooks.json` maps hooks to event triggers (SessionStart, PreToolUse, PostToolUse) and tool matchers (Bash, Edit|Write).

## Testing Hooks

```bash
# Pipe simulated JSON input to test a hook
echo '{"tool_input":{"command":"git push"}}' | hooks/block-main-branch-commit-push.sh
echo '{"tool_input":{"file_path":".env"}}' | hooks/protect-files.sh
# Exit 0 = allow, exit 2 = block (message to stderr)
```

## Script Pattern

All hooks follow the same structure:
```bash
#!/usr/bin/env bash
set -euo pipefail
INPUT=$(cat)
COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command // empty')
# ... validation logic ...
exit 0  # allow, or exit 2 to block
```
