# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Universal AI development utilities repository that standardizes AI-assisted development across all projects. One installer, one workflow, one set of conventions — only domain-specific agents/hooks/rules change per project.

## Common Commands

```bash
# Test the installer
./install.sh --list                          # Show all profiles
./install.sh --profile nuv --dry-run         # Preview without changes
./install.sh --profile nuv --skip-tools      # Config only (skip npm/brew)

# Test hooks individually (pipe JSON to stdin)
echo '{"tool_input":{"command":"git push"}}' | hooks/block-main-branch-commit-push.sh
echo '{"tool_input":{"file_path":".env"}}' | hooks/protect-files.sh
# Exit 0 = allow, exit 2 = block

# Validate all JSON configs
find . -name "*.json" -not -path "./.claude/*" -exec python3 -m json.tool {} \; > /dev/null

# Sync cursor rules to a target repo
scripts/sync-cursor-rules.sh ~/Development/nuv shared

# Run tests (bats-core, vendored via git submodules)
make install-test-deps                       # First time: init submodules
make test                                    # Run all 159 tests
make test-hooks                              # Core + plugin hook tests only
make test-install                            # install.sh tests only
make test-sync                               # sync-cursor-rules.sh tests only
make test-json                               # JSON validation only
```

## Architecture

This repo is structured as a **Claude Code plugin marketplace** with a layered architecture:

### Core Plugin (repo root)
The root directory IS the `core-superpowers` plugin. It contains project-agnostic workflow tools:
- `agents/` — 10 shared agents (orchestrator, arch-reviewer, code-reviewer, security-auditor, test-automator, debugger, design-patterns, spec-challenger, spec-validator, grafana-engineer)
- `skills/` — 18 shared skills, each in its own `<name>/SKILL.md` directory
- `commands/` — 13 slash commands (`/brainstorm`, `/spec`, `/write-plan`, `/tdd`, `/execute-plan`, `/debug`, `/review`, `/verify`, `/finish`, `/mr`, `/resolve-reviews`, `/plan-to-jira`, `/update-jira`)
- `hooks/` — 12 safety hook scripts + `hooks.json` configuration

### Domain Plugins (`plugins/`)
Each subdirectory is an independent Claude Code plugin with its own `.claude-plugin/plugin.json`, agents, hooks, and optionally skills/commands. Plugins are added per project as needed.

### Profiles (`profiles/`)
JSON configs that declare which plugins and cursor rules to install for a given project. The installer reads these to determine what to configure.

### Cross-Tool Support
- **Claude Code**: Uses the native plugin system (`.claude-plugin/`, agents/, skills/, commands/, hooks/)
- **Cursor**: Rules in `cursor-rules/` synced to target repos as `.mdc` files
- **Codex**: Mirror in `.agents/skills/` with `SKILL.md` + `agents/openai.yaml` per skill

## Key Design Decisions

**Commands are thin wrappers.** Every command has `disable-model-invocation: true` and simply invokes one skill. All logic lives in skills, never in commands.

**Hooks read JSON from stdin, exit 0 or 2.** PreToolUse hooks receive `{"tool_input": {...}}` and block by exiting 2 with a message to stderr. The `block-unsafe-bash.sh` hook closes the escape hatch — it prevents bypassing Edit/Write hooks via `sed -i`, `python -c`, or `echo >` on protected files.

**The installer is idempotent.** It uses python3 for JSON parsing (with jq fallback). Plugin paths are merged into `~/.claude/settings.json` without overwriting. Second runs noop with "already configured" messages.

**Session-start hook injects the using-superpowers skill** into every conversation via `hookSpecificOutput.additionalContext`. It uses python3 for safe JSON encoding of the SKILL.md content.

## Authoring Conventions

### Agent files (`agents/*.md`)
YAML frontmatter with `name`, `description`, optional `model`. Body is markdown instructions.

### Skill files (`skills/<name>/SKILL.md`)
YAML frontmatter with `name`, `description`. Supporting files (references, assets, scripts) sit alongside SKILL.md in the same directory.

### Hook scripts (`hooks/*.sh`)
Bash with `set -euo pipefail`. Read `INPUT=$(cat)`, parse with `jq -r '.tool_input.command // empty'`. Exit 0 to allow, exit 2 to block (message to stderr).

### Plugin structure
Each plugin mirrors: `.claude-plugin/plugin.json`, `agents/`, `skills/`, `commands/`, `hooks/hooks.json` + scripts.

## Workflow

The enforced development workflow across all projects:
1. `/brainstorm` → explore requirements (small/exploratory work) — *or* `/spec` (granular SDD pipeline for cross-plugin / multi-story / contractual work)
2. `/write-plan` → step-by-step plan (skipped when `/spec` was used; `/spec` produces tasks.md directly)
3. `/tdd` → write tests FIRST (enforced — `/execute-plan` refuses without tests)
4. `/execute-plan` → implement against plan + tests
5. `/review` → dispatches arch-reviewer, code-reviewer, security-auditor in parallel
6. `/verify` → run tests, lint, type-check
7. `/finish` → auto-update docs, prepare branch

### Spec-Driven Development (`/spec`)

`/spec` is the heavier-weight entry point for complex features. Three deterministic modes:

- `/spec "<feature description>"` — author a new spec from scratch.
- `/spec import <source>` — bring an existing PRD, `docs/plans/*.md`, JIRA epic, or Confluence page into the workflow with verbatim mapping; unmapped sections flagged for engineer triage.
- `/spec amend <spec-dir> <change>` — propose changes via engineer-approved `change-set.md`; apply with `/spec amend --apply`.

`/spec` requires a one-time setup of `docs/spec/constitution.md` (project non-negotiables) and `docs/spec/defaults.md` (project-wide defaults the agent is allowed to apply — anything else becomes `[NEEDS CLARIFICATION]`). The full pipeline is constitution → defaults → specify → clarify → plan → tasks → challenge → validate, ending in a deterministic `READY` / `BLOCKED` verdict that gates `/execute-plan`. Decision tree: `skills/spec-driven-development/references/sdd-decision-tree.md`. Research with citations: `docs/research/spec-driven-development-research.md`.

## Git Policy

- Commits/pushes on feature branches: allowed (commit-msg-check hook validates format + blocks AI signatures)
- Commits on `main`/`master`: blocked unless user explicitly approves (override: `ALLOW_MAIN_BRANCH_COMMIT=1`)
- Pushes on or to `main`/`master`: blocked (use feature branches and merge requests; same override available)
- AI attribution: blocked — no Claude, Anthropic, Copilot, GPT, or any AI tool references in commit messages. No Co-Authored-By AI lines. Commits must appear fully human-authored.
- Commit format: `type: [scope] description` (not `type(scope):`)
