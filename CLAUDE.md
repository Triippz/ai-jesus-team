# ai-jesus-team — claude code instructions

This file provides guidance to Claude Code when working in this repository.

## project overview

Personal plugin factory and workflow toolkit for Claude Code. Generates self-contained, stack-tailored plugins from project profiles. Contains the template factory system, core workflow skills, specialist review agents, and safety hooks.

## common commands

```bash
# factory
node scripts/generate.js --profile profiles/nuv.json
node scripts/generate.js --profile profiles/nuv.json --update
node scripts/install-plugin.js --plugin generated/nuv-superpowers --target <path>
node scripts/doctor.js --target <path>
node scripts/repair.js --target <path> --source generated/nuv-superpowers
node scripts/validate-schemas.js

# tests
npm test                                     # all Node.js tests (184)
make test                                    # all bats tests (hooks + installer)
node --test tests/factory/generate.test.js   # specific test file

# hooks (pipe JSON to stdin)
echo '{"tool_input":{"command":"git push"}}' | hooks/block-main-branch-commit-push.sh
echo '{"tool_input":{"file_path":".env"}}' | hooks/protect-files.sh
```

## commit message format

Required format: `type: [scope] description`

Do not use: `type(scope): description`

Allowed types: `feat`, `fix`, `perf`, `build`, `ci`, `docs`, `refactor`, `test`

Examples:
```bash
feat: [factory] add new review agent template
fix: [hooks] resolve gateguard session timeout
docs: [factory] update profile guide
refactor: [lib] simplify template engine conditionals
test: [conformance] add doctor edge case tests
```

Do not include AI tool names (Claude, Copilot, GPT, etc.) in commit messages.

## semantic versioning

This repo follows semantic versioning. Commit types drive version bumps:
- `feat` → minor (0.X.0)
- `fix` → patch (0.0.X)
- `feat!` or body contains `BREAKING CHANGE` → major (X.0.0)

## repo structure

```
scripts/              # factory CLI commands (generate, install-plugin, doctor, repair)
scripts/lib/          # foundational modules (template engine, file ops, schema validator, etc.)
schemas/              # JSON schemas for all structured data
templates/            # core template (agents, skills, hooks, knowledge, prompts)
profiles/             # project profiles (JSON)
generated/            # output: self-contained generated plugins
tests/                # Node.js tests (factory, conformance, schemas, templates)
hooks/                # safety hooks (commit msg, secrets, destructive ops, file protection)
agents/               # core-superpowers team agents
skills/               # core-superpowers workflow skills
commands/             # core-superpowers slash commands
plugins/              # plugin directory
cursor-rules/         # cursor IDE rules by scope
docs/factory/         # factory documentation (architecture, guides, references)
specs/                # spec-driven development artifacts
```

## design principles

- **idempotent**: re-running any operation with same input produces zero changes
- **deterministic**: same profile + template version = byte-identical output
- **schema-validated**: all structured output validates against JSON Schema before writing
- **test-first**: no implementation without failing tests (Article I)
- **evidence-driven**: no vague adjectives without quantification (Article II)

## key conventions

- Node.js 20+ with ESM (`"type": "module"`)
- No external test framework — use `node:test` built-in runner
- AJV for JSON Schema validation (only external dependency)
- Template placeholders: `{{profile.variable}}` and `{% if condition %}`
- Atomic writes: temp file → validate → rename
- Hook profiles: `minimal`, `standard`, `strict` (set via `HOOK_PROFILE` env var)
- File operations return status enums: `created`, `updated`, `skipped`, `protected`, `merged`, `conflicted`
