# ai-jesus-team

Personal AI development utilities — a plugin factory and workflow toolkit for Claude Code. Generates self-contained, stack-tailored plugins from project profiles with full conformance enforcement.

## what this repo does

- **Plugin template factory** — generates complete Claude Code plugins from project profiles, tailored to each project's language, framework, and conventions
- **Workflow skills** — enforces brainstorm → plan → TDD → execute → review → verify → finish
- **Specialist review agents** — 10 review agents producing structured JSON output with confidence-gated auto-fix
- **Safety hooks** — profile-gated hooks (minimal/standard/strict) protecting against destructive ops, secrets, and undisciplined workflow
- **Conformance system** — drift detection (doctor) and repair for installed plugins

## quick start

```bash
# install dependencies
npm install

# generate a plugin from a profile
node scripts/generate.js --profile profiles/nuv.json

# install into a project
node scripts/install-plugin.js --plugin generated/nuv-superpowers --target ~/PersonalDevelopment/nuvcard

# check for drift
node scripts/doctor.js --target ~/PersonalDevelopment/nuvcard

# repair drifted files
node scripts/repair.js --target ~/PersonalDevelopment/nuvcard --source generated/nuv-superpowers

# validate all schemas
node scripts/validate-schemas.js
```

All commands support `--dry-run` (preview without writing), `--json` (machine-readable output), and `--help`.

## profiles

Each profile defines a project's tech stack, review thresholds, and conventions.

| Profile | Stack | Description |
|---------|-------|-------------|
| `nuv` | Deno, Hono, HTMX, Supabase, Tailwind | NUVCard digital profile SaaS |

See [docs/factory/profile-guide.md](docs/factory/profile-guide.md) for the full field reference and how to create new profiles.

## factory commands

| Command | Purpose |
|---------|---------|
| `generate` | Profile + templates → self-contained plugin |
| `generate --update` | Propagate template changes to existing plugin |
| `install-plugin` | Plugin → project repo (idempotent, skip_if_exists, deep-merge) |
| `doctor` | Detect drift between installed and expected state |
| `repair` | Fix drifted/missing files from source |
| `validate-schemas` | CI schema validation for all structured files |

## workflow

```
brainstorm → write-plan → tdd → execute-plan → review → verify → finish
```

For complex features: `/spec` (spec-driven development) → `/execute-plan` → `/review` → `/verify` → `/finish`

## commit conventions

This repo enforces semantic commit messages via hook:

```
type: [scope] description
```

Allowed types: `feat`, `fix`, `perf`, `build`, `ci`, `docs`, `refactor`, `test`

Examples:
```bash
feat: [factory] add new review agent template
fix: [hooks] resolve gateguard session timeout
docs: [factory] update profile guide with new fields
```

Versioning follows [semantic versioning](https://semver.org/). Commit types map to version bumps:
- `feat` → minor version
- `fix` → patch version
- `feat!` or `BREAKING CHANGE` in body → major version

## testing

```bash
npm test                    # all 184 Node.js tests
make test                   # all bats tests (hooks + installer)
node scripts/validate-schemas.js  # schema validation
```

## documentation

| Document | Description |
|----------|-------------|
| [architecture](docs/factory/architecture.md) | System overview, data flow, components, design principles |
| [getting started](docs/factory/getting-started.md) | Step-by-step first use guide |
| [profile guide](docs/factory/profile-guide.md) | Field reference, thresholds, creating profiles |
| [agent catalog](docs/factory/agent-catalog.md) | All agents with model tiers, dispatch rules |
| [review process](docs/factory/review-process.md) | Full pipeline: dispatch → scoring → auto-fix |
| [skills catalog](docs/factory/skills-catalog.md) | All workflow skills with commands and phases |
| [hook system](docs/factory/hook-system.md) | Profile gating, GateGuard, dispatcher |
| [schema reference](docs/factory/schema-reference.md) | All 7 JSON schemas with examples |
| [troubleshooting](docs/factory/troubleshooting.md) | Common issues with symptoms, causes, fixes |

## license

Private repository. All rights reserved.
