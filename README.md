# dev-ai-utilities

Universal AI development utilities repository. One installer, one workflow, one set of conventions — standardizing AI-assisted development across all projects. Only domain-specific agents, hooks, and rules change per project.

## What This Repo Does

This repo is a **centralized plugin marketplace** for AI coding tools. It provides:

- **Workflow skills** that enforce a consistent development process (brainstorm → plan → TDD → execute → review → verify → finish)
- **Shared agents** for code review, security auditing, architecture review, debugging, and testing strategy
- **Safety hooks** that prevent destructive operations, protect sensitive files, block secrets from being committed, and enforce git conventions
- **Domain plugins** with project-specific agents and hooks for project-specific stacks
- **Cursor rules** centralized and synced per project profile
- **Codex compatibility** via mirrored skill definitions

The installer reads a profile (e.g., `aok`, `atlas`) and configures Claude Code, Cursor, and Codex for the target project in one command.

## plugin template factory

In addition to the reference-based installer, the repo includes a **template factory** that generates self-contained, stack-tailored plugins from project profiles.

### factory commands

```bash
node scripts/generate.js --profile profiles/atlas.json          # generate a plugin
node scripts/generate.js --profile profiles/atlas.json --update  # propagate template changes
node scripts/install-plugin.js --plugin generated/atlas-superpowers --target ~/Development/atlas
node scripts/doctor.js --target ~/Development/atlas              # detect drift
node scripts/repair.js --target ~/Development/atlas --source generated/atlas-superpowers
node scripts/validate-schemas.js                                 # CI schema validation
```

All commands support `--dry-run` (preview without writing) and `--json` (machine-readable output).

### how it works

1. **profiles** (`profiles/*.json`) define each project's tech stack, review thresholds, and conventions
2. **templates** (`templates/`) contain agent, skill, hook, and knowledge file templates with `{{profile.*}}` placeholders
3. **generate** reads profile + templates and produces a complete plugin in `generated/<name>-superpowers/`
4. **install** copies the plugin into a project repo with idempotent writes (skip_if_exists for CLAUDE.md, deep-merge for settings.json)
5. **doctor** compares installed files against the install-state manifest to detect drift
6. **repair** restores drifted files from the generated plugin source

Generated plugins include 10 specialist review agents (complexity, naming, concurrency, domain, test quality, structure, spec compliance, performance, documentation, progress), 4 plan review personas, knowledge files, and profile-gated hooks.

## Quick Start

### 1. Clone the repo

```bash
git clone git@github.com:your-username/dev-ai-utilities.git ~/.dev-ai-utilities
```

### 2. Run the installer

```bash
cd ~/.dev-ai-utilities

./install.sh --list                                          # See available profiles
./install.sh --profile aok --dry-run                         # Preview without changes
./install.sh --profile nuv --target ~/Development/nuv        # Install for Nuv (Deno/Hono)
./install.sh --profile my-project --target ~/Development/my-project  # Install for any project
```

Common flags:
```bash
./install.sh --profile nuv --target ~/Development/nuv --skip-tools  # Config only (skip brew/npm installs)
./install.sh --profile nuv                    # No --target: prompts interactively for path
```

### 3. Update

```bash
cd ~/.dev-ai-utilities && git pull
```

The installer is idempotent — re-run it after pulling to pick up any new plugins, hooks, or cursor rules. Second runs noop with "already configured" messages.

### Kickstart (alternative)

If you prefer a one-liner, `kickstart.sh` clones (or updates) the repo and runs the installer in one step:

```bash
cd ~/.dev-ai-utilities && ./kickstart.sh --profile nuv
```

You can customize the install location and branch:
```bash
DEV_AI_UTILITIES_DIR=~/my-path DEV_AI_UTILITIES_BRANCH=develop ./kickstart.sh --profile nuv
```

### Windows

```powershell
.\install.ps1 -Profile nuv              # Install
.\install.ps1 -Profile nuv -DryRun      # Preview
.\install.ps1 -List                      # Show profiles
```

## Profiles

Each profile declares which plugins and cursor rules to install for a target project.

| Profile | Description | Plugins | Cursor Rules |
|---------|-------------|---------|--------------|
| `nuv` | NUVCard SaaS (Deno, Hono, HTMX) | core + nuv | — |

## What the Installer Does

The installer is **fully idempotent** — run it as many times as you want. Second runs noop with "already configured" messages.

### Step 1: Tool Installation (unless `--skip-tools`)

| Tool | macOS | Linux | Windows |
|------|-------|-------|---------|
| Node.js | `brew install node` | `nvm install --lts` | `winget install OpenJS.NodeJS.LTS` |
| Claude Code | `brew install --cask claude-code` | `curl -fsSL https://claude.ai/install.sh \| bash` | `irm https://claude.ai/install.ps1 \| iex` |
| Codex | `brew install --cask codex` | `npm i -g @openai/codex` | `npm i -g @openai/codex` |
| Cursor | [cursor.com/download](https://cursor.com/download) | [cursor.com/download](https://cursor.com/download) | [cursor.com/download](https://cursor.com/download) |

> **Note:** Claude Code's npm install (`npm i -g @anthropic-ai/claude-code`) is deprecated. The native installer is recommended — no runtime dependencies, auto-updates.

### Step 2: Claude Code Configuration (reference-based)

Merges plugin paths into `~/.claude/settings.json` under `projects.<target_repo>.plugins` without overwriting existing settings. Each profile maps to plugin directories in this repo.

Claude Code reads each plugin's `.claude-plugin/plugin.json` to discover agents, skills, commands, and hooks automatically. The plugins stay in `~/.dev-ai-utilities` (or wherever you cloned the repo) — nothing is copied into your project. Re-running kickstart updates plugins in place.

### Step 3: Cursor Rules

Backs up existing `.cursor/rules/` in the target repo, then syncs the profile's rule sets. Rules are `.mdc` files organized by scope (shared, shared-flutter, project-specific).

### Step 4: Codex Configuration (copy-based)

Copies `.agents/skills/` and `AGENTS.md` into the target repo for Codex skill discovery. Unlike Claude Code (which references plugins externally), Codex requires files to live inside the project directory. Each skill has a `SKILL.md` (plain markdown, no YAML frontmatter) and an `agents/openai.yaml` for Codex agent registration.

> **Note:** Because these are copied files, they will appear in `git status`. Re-running the installer updates them if the source has changed. You may want to add `.agents/` to your `.gitignore` or commit them — either approach works.

## Required Tools for Workflow Skills

Some skills depend on external tools. If a tool is missing, the skill will print setup instructions and stop — nothing will silently fail.

### GitLab CLI (`glab`) — required for `/mr` and `/resolve-reviews`

```bash
brew install glab          # macOS/Linux
glab auth login            # Authenticate (one-time)
```

Used by `/mr` (push + create merge request) and `/resolve-reviews` (fetch discussions, reply to threads, resolve comments). Without `glab`, these skills will print: *"glab not found. Install with `brew install glab`."*

### Atlassian MCP Server — required for `/plan-to-jira` and `/update-jira`

```bash
# In Claude Code:
/plugin                    # Search for "Atlassian", install it
/mcp                       # Authenticate with your Atlassian account
```

Used by `/plan-to-jira` (create JIRA issues), `/update-jira` (update issues with implementation details), and the auto-transitions in `/execute-plan` and `/finish`. Without the Atlassian MCP server, these skills will print: *"Atlassian MCP server not connected. Install via `/plugin` and authenticate via `/mcp`."*

> **Note:** JIRA features are fully optional. All non-JIRA skills work without it. The `/execute-plan` and `/finish` skills silently skip JIRA transitions when no `.jira-map.json` linkage file exists.

## Tool Catalog (optional extras)

Beyond the core installer, a **tool catalog** (`catalog/tools.json`) provides optional MCP servers, CLI tools, and AI assistants you can install individually or as bundles. These are not installed by `kickstart.sh` — they're opt-in extras.

> **Status:** The `tools.sh` installer script is not yet built. The catalog currently serves as documentation. See `catalog/readme.md` for full tool descriptions and planned CLI usage.

### Available tools

| Category | Tools |
|----------|-------|
| **MCP Servers** | Atlassian, Context7, Perplexity, Firecrawl, Puppeteer, Notion, Slack, Sentry, Sequential Thinking, Serena, Mermaid Chart |
| **CLI Tools** | jq, ripgrep, gh, glab, uv, delta, fzf |
| **AI Assistants** | Task Master, Beads |
| **Code Quality** | Ruff, Dart, Flutter, Rust, Terraform |

### Bundles

| Bundle | What's included |
|--------|----------------|
| `mcp-essentials` | Context7 + Sequential Thinking + Puppeteer (no API keys needed) |
| `mcp-research` | Context7 + Perplexity + Firecrawl |
| `mcp-productivity` | Atlassian + Notion + Slack + Sentry + Mermaid Chart |
| `cli-essentials` | jq + ripgrep + gh + glab + fzf + delta + uv |

MCP servers are configured uniformly across Claude Code (`~/.claude/settings.json`), Cursor (`~/.cursor/mcp.json`), and Codex (`~/.codex/config.toml`).

## Development Workflow

Every project uses the same enforced workflow, available as slash commands:

```
/brainstorm      → Explore requirements, design ideas, constraints
/spec            → Spec-driven development: granular, unambiguous PRD with adversarial review
/write-plan      → Create step-by-step implementation plan
/tdd             → Write failing tests FIRST (enforced)
/execute-plan    → Implement against plan + tests (refuses without tests)
/debug           → Structured: reproduce → isolate → hypothesize → verify → fix
/review          → Dispatches arch-reviewer + code-reviewer + security-auditor
/verify          → Run tests, lint, type-check — block if failures
/finish          → Auto-update docs, prepare branch for merge/PR
/mr              → Push branch and create GitLab merge request via glab
/resolve-reviews → Research-backed triage of MR review comments, reply to all threads
/plan-to-jira    → Convert implementation plan into JIRA issues (parent + subtasks)
/update-jira     → Update JIRA issues with implementation details and QA test steps
```

**TDD is enforced.** The `/execute-plan` command refuses to write implementation code unless tests exist. This is not optional.

### Spec-Driven Development (`/spec`)

`/spec` is an opt-in heavier-weight entry point for complex features where misinterpretation by an implementing agent would be expensive. It runs a multi-phase pipeline (constitution + defaults catalog → specify → clarify → plan → tasks → challenge → validate) that produces a granular PRD/spec leaving zero room for interpretation, plus deterministic structural validation and adversarial substantive review by two purpose-built agents (`spec-challenger`, `spec-validator`). Output goes to `specs/<NNN>-<slug>/` and is consumed by `/execute-plan`.

Three entry modes, all deterministic:

- **`/spec "<feature description>"`** — author a new spec from scratch.
- **`/spec import <source>`** — bring an existing PRD, `docs/plans/*.md`, JIRA epic, or Confluence page into the workflow. Verbatim mapping; unmapped sections flagged for engineer triage.
- **`/spec amend <spec-dir> <change-description>`** — propose changes to an existing spec via an engineer-approved `change-set.md`. Read-only until `/spec amend --apply` is invoked; one git commit per accepted row.

The agent never invents priorities, IDs, Independent Tests, or defaults outside `docs/spec/defaults.md`. Two runs of `/spec import` against the same source produce byte-identical artifacts.

Use the decision tree in `skills/spec-driven-development/references/sdd-decision-tree.md` to choose between `/brainstorm` (small/exploratory) and `/spec` (cross-plugin, multi-story, contractual, brownfield evolution). Research synthesis with full citations: `docs/research/spec-driven-development-research.md`.

**Main-branch commits require approval.** The `block-main-branch-commit-push` hook blocks `git commit` and `git push` when you're on `main`/`master`, or when a push targets `main`/`master` by name. Feature-branch work is unblocked. To override for a single command after user approval, prefix it with `ALLOW_MAIN_BRANCH_COMMIT=1`.

### JIRA Integration (Optional)

If the Atlassian MCP server is installed (`/plugin` → Atlassian → `/mcp` to authenticate), three additional commands become available:

```
/plan-to-jira    → Creates a parent Story/Epic + subtasks in JIRA from a plan
/update-jira     → Updates JIRA issues with implementation details and QA test steps
```

Additionally, `/execute-plan` and `/finish` automatically transition linked JIRA issues to "In Progress" and "In Review" when a `.jira-map.json` linkage file exists (created by `/plan-to-jira`). If no JIRA linkage exists, these skills behave exactly as before.

**Skills are mandatory.** A session-start hook injects the skill catalog into every conversation. If a skill applies, it must be used.

## Safety Hooks

12 hook scripts enforce safety policies automatically during Claude Code sessions:

| Hook | What It Does |
|------|-------------|
| **session-start** | Injects the using-superpowers skill catalog into every session |
| **block-main-branch-commit-push** | Blocks `git commit`/`git push` on or to `main`/`master` without explicit permission |
| **commit-msg-check** | Enforces `type: [scope] description` format; blocks AI attribution |
| **protect-files** | Blocks edits to `.env`, `.git/`, secrets, keys, credentials |
| **block-unsafe-bash** | Closes the bash escape hatch — blocks `sed -i`/`python -c`/`echo >` on protected files |
| **detect-secrets** | Scans for hardcoded API keys (`sk-`, `AKIA`), tokens, passwords |
| **protect-infrastructure** | Blocks edits to CI/CD, Dockerfiles, Makefiles, hooks themselves |
| **block-destructive-git** | Blocks `reset --hard`, `clean -f`, `--no-verify`, `force push` |
| **require-explicit-staging** | Blocks `git add -A` / `git add .` — requires explicit file names |
| **block-unsafe-sql** | Blocks `DROP TABLE`, `TRUNCATE`, `DELETE` without `WHERE` |
| **warn-large-diff** | Warns at 500+ lines changed, blocks at 2000+ |
| **detect-ai-test-shortcuts** | Catches `assert True`, tests with no assertions, `@skip` on existing tests |

**Bash escape hatch is closed.** The `block-unsafe-bash` hook prevents circumventing Edit/Write hooks by using `sed -i`, `python -c`, or shell redirects on protected files.

## Shared Agents

7 project-agnostic agents available in every profile:

| Agent | Purpose |
|-------|---------|
| **orchestrator** | Detects project type, routes to domain agents, enforces workflow |
| **arch-reviewer** | Architecture compliance — boundaries, dependency direction, circular deps |
| **code-reviewer** | Code quality — SOLID, DRY, KISS, naming, complexity |
| **security-auditor** | Security — OWASP top 10, secrets, injection, auth |
| **test-automator** | Test strategy — coverage gaps, quality, framework-appropriate patterns |
| **debugger** | Structured debugging — reproduce, isolate, hypothesize, verify, fix |
| **design-patterns** | Pattern selection — GoF, functional, concurrent, anti-pattern detection |

## Domain Plugins

Each plugin adds project-specific agents and hooks:

Domain plugins are added per project as needed. Each plugin follows the same layout: `.claude-plugin/plugin.json`, agents, hooks, optional skills and commands.

## Git Policy

- **Commits**: Allowed — commit-msg-check hook validates format and blocks AI signatures
- **Pushes to feature branches**: Allowed
- **Pushes to main/master**: Blocked — use feature branches and merge requests
- **AI attribution**: Blocked — no Claude, Anthropic, Copilot, GPT, or any AI tool references in commits. Commits must appear fully human-authored.
- **Commit format**: `type: [scope] description` (allowed types: feat, fix, docs, refactor, test, perf, build, ci, chore)

## Testing

A bats-core test suite covers all hooks, the installer, sync script, and JSON validation. bats-core and its helpers are vendored as git submodules — no global installs needed.

```bash
# First time: pull bats submodules
make install-test-deps

# Run everything (159 tests)
make test

# Run subsets
make test-hooks      # 12 core hooks + 3 plugin hooks (138 tests)
make test-install    # install.sh argument parsing, JSON helpers, profile validation, plugin merging (13 tests)
make test-sync       # sync-cursor-rules.sh argument validation, sync, idempotency (5 tests)
make test-json       # All .json files in repo parse cleanly (3 tests)
```

Test structure:
```
tests/
├── test_helper/
│   ├── common.bash              # Shared: temp dirs, run_hook, JSON builders
│   └── install_helper.bash      # install.sh-specific: fake HOME, mock commands
├── core_hooks/                  # 12 .bats files (one per core hook)
├── plugin_hooks/                # 3 .bats files (aok-fe, aok-be, atlas-infra)
├── install/                     # 4 .bats files (args, json helpers, merge, profiles)
├── sync_cursor_rules/           # 1 .bats file
└── json_validation/             # 1 .bats file
```

## Repository Structure

```
dev-ai-utilities/
├── install.sh / install.ps1          # Idempotent installers
├── .claude-plugin/                   # Core plugin metadata + marketplace
├── agents/                           # 7 shared agents
├── skills/                           # 17 shared workflow skills
├── commands/                         # 14 slash commands
├── hooks/                            # 12 safety hooks + hooks.json
├── plugins/                          # Domain-specific plugins (one per project)
├── cursor-rules/                     # Centralized Cursor rules by scope
│   ├── shared/                       # All repos (4 rules)
│   └── shared-flutter/               # Flutter repos (4 rules)
├── catalog/                          # Optional tool catalog (tools.json + readme)
├── profiles/                         # Installation profiles (4 + schema)
├── scripts/                          # sync-cursor-rules.sh
├── tests/                            # bats-core test suite (159 tests)
│   ├── bats/                         # bats-core (git submodule)
│   ├── test_helper/                  # Shared helpers + bats-support/assert
│   ├── core_hooks/                   # 12 core hook test files
│   ├── plugin_hooks/                 # 3 plugin hook test files
│   ├── install/                      # 4 installer test files
│   ├── sync_cursor_rules/            # Sync script tests
│   └── json_validation/              # JSON config validation
├── Makefile                          # Test targets (make test, etc.)
└── .agents/skills/                   # Codex-compatible skill mirror (18 skills)
```

## Adding a New Project

1. Create a plugin directory under `plugins/<name>/` with `.claude-plugin/plugin.json`, agents, and hooks
2. Register the plugin in `.claude-plugin/marketplace.json`
3. Create cursor rules under `cursor-rules/<name>/`
4. Create a profile at `profiles/<name>.json` specifying plugins and cursor rules
5. Test: `./install.sh --profile <name> --dry-run`

## Cross-Tool Compatibility

| Tool | How It Works | Where Files Live |
|------|-------------|-----------------|
| **Claude Code** | Native plugin system — reads `.claude-plugin/plugin.json` to discover agents/, skills/, commands/, hooks/ | **External** — referenced via paths in `~/.claude/settings.json`, files stay in `~/.dev-ai-utilities` |
| **Cursor** | `.mdc` rules synced to target repo's `.cursor/rules/` | **Copied** — rule files live in the target repo |
| **Codex** | `.agents/skills/` mirror with SKILL.md + `agents/openai.yaml` per skill | **Copied** — skill files live in the target repo |

Claude Code's reference-based approach means updates are instant (re-run kickstart and restart Claude). Cursor and Codex use copied files, so updates require re-running the installer to sync changes into the target repo.

## Authoring Conventions

See [CLAUDE.md](./CLAUDE.md) for detailed conventions on writing agents, skills, commands, hooks, plugins, and profiles.

## How It Works

For a deep-dive into the internals — hook system design, installer logic, sync mechanics, and test architecture — see [docs/how-it-works.md](./docs/how-it-works.md).
