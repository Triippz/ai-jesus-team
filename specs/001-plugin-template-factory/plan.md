# Implementation Plan: Plugin Template Factory

**Feature Branch:** `001-plugin-template-factory`
**Date:** 2026-05-17
**Spec:** specs/001-plugin-template-factory/spec.md
**Constitution:** `docs/spec/constitution.md` v1.0.0

This plan describes HOW the feature will be built. The WHAT lives in spec.md. Tasks (DO-THIS) live in tasks.md.

## Summary

The plugin template factory transforms dev-ai-utilities from a manually-authored multi-plugin marketplace into a generation pipeline. A hand-rolled template engine (variable substitution + conditional blocks, not a full Jinja2 implementation) reads project profiles (JSON) and a core template directory (agent/skill/hook/knowledge files with `{{placeholder}}` syntax), producing complete self-contained Claude Code plugins. An install-state tracking system records every generated file, enabling a doctor command to detect drift and a repair command to fix it. The system uses a two-phase plan/apply architecture (resolve plan read-only, then apply idempotently) using a proven two-phase plan/apply architecture.

---

## Technical Context

| Field | Value |
|-------|-------|
| Language / Version | Node.js 20+ (no framework, hand-rolled test runner — established scaffold pattern) |
| Primary Dependencies | `ajv` (JSON Schema validation, draft/2020-12). No template engine library — hand-rolled `{{placeholder}}` substitution (simpler than Jinja2, sufficient for variable replacement + conditional blocks). |
| Storage | JSON files: profiles (`profiles/*.json`), install-state (`.claude/install-state.json`), schemas (`schemas/*.json`). No database. |
| Testing | `bats-core` for hook scripts (159 existing tests). Hand-rolled `test(name, fn)` with `process.exit` for Node.js scripts (per D-TEST-2). AJV schema validation in CI (per D-TEST-3). |
| Target Platform | macOS, Linux (CLI tooling). No Windows requirement. |
| Project Type | CLI tooling / plugin factory within an existing monorepo |
| Performance Goals | Generation <5s per plugin (D-PERF-2). Doctor <2s per audit (D-PERF-3). Hooks <100ms per invocation (D-PERF-1). |
| Constraints | Must work fully offline — no network dependencies for generate, install, doctor, repair. Must produce output compatible with Claude Code's plugin loading system. |
| Scale / Scope | 5 project profiles. ~60-80 files per generated plugin. 10 review agent templates. 4 plan review persona templates. 12 team agent templates. 18 skill templates. |

---

## Constitution Check

- [x] **Gate I — Test-First:** tasks.md will list every test task ID before the implementation task that depends on it.
- [x] **Gate II — Evidence-Driven:** No vague adjectives in this plan. All performance targets quantified (D-PERF-1/2/3).
- [x] **Gate III — CRITICAL-Resolved:** No open CRITICAL findings. Zero NEEDS CLARIFICATION markers in spec.md.
- [x] **Gate IV — Simplicity:** Project structure adds 3 new top-level directories (templates/, generated/, schemas/) to the existing repo. Each justified: templates/ is the source of truth, generated/ is the output, schemas/ validates both. No unnecessary projects or libraries.
- [x] **Gate V — Idempotency:** Every operation function returns `{path, status}` where status is one of `created|updated|skipped|protected|merged|conflicted`. Duplicate-run tests validate zero-diff on second run.
- [x] **Gate VI — Determinism:** Template engine uses deterministic file ordering (sorted alphabetically), no timestamps in generated content, no random IDs. CI job runs generate twice and asserts SHA-256 equality.
- [x] **Gate VII — Schema Validation:** AJV validates profiles, install-state, review output, hook registrations. Every write is preceded by validation. Schemas live in schemas/ with `additionalProperties: false`.
- [x] **Gate VIII — Conformance Tracking:** Install-state manifest written on every install. Doctor reads it for drift detection. Repair uses it for targeted regeneration.

---

## Project Structure

```
dev-ai-utilities/                         # Existing repo root (also core-superpowers plugin)
├── templates/                            # NEW: Core template directory
│   ├── agents/
│   │   ├── team/                         # 12 team agent templates (.md.j2)
│   │   │   ├── orchestrator.md.j2
│   │   │   ├── software-engineer.md.j2
│   │   │   ├── architect.md.j2
│   │   │   ├── security-auditor.md.j2
│   │   │   ├── qa-engineer.md.j2
│   │   │   ├── debugger.md.j2
│   │   │   ├── design-patterns.md.j2
│   │   │   ├── spec-challenger.md.j2
│   │   │   ├── spec-validator.md.j2
│   │   │   ├── grafana-engineer.md.j2
│   │   │   ├── protobuf-expert.md.j2
│   │   │   └── product-manager.md.j2
│   │   └── review/                       # 10 specialist review agent templates (.md.j2)
│   │       ├── complexity-review.md.j2
│   │       ├── naming-review.md.j2
│   │       ├── concurrency-review.md.j2
│   │       ├── domain-review.md.j2
│   │       ├── test-review.md.j2
│   │       ├── structure-review.md.j2
│   │       ├── spec-compliance-review.md.j2
│   │       ├── performance-review.md.j2
│   │       ├── doc-review.md.j2
│   │       └── progress-guardian.md.j2
│   ├── skills/                           # Skill templates (.md.j2)
│   ├── hooks/                            # Hook script templates (.sh.j2 / .js.j2)
│   │   ├── hooks.json.j2                 # Hook registry template
│   │   ├── run-with-flags.js             # Profile-gated hook runner (not templated)
│   │   ├── gateguard.js                  # Investigation gate (not templated)
│   │   └── dispatcher.js                 # Fan-out dispatcher (not templated)
│   ├── knowledge/                        # Knowledge file templates
│   │   ├── review-rubric.md              # Health scoring (not templated — universal)
│   │   ├── review-template.md            # Output format (not templated)
│   │   ├── owasp-detection.md            # OWASP patterns (not templated)
│   │   └── accepted-risks-schema.md      # Suppression rules (not templated)
│   ├── prompts/                          # Plan review persona templates
│   │   ├── plan-review-acceptance.md.j2
│   │   ├── plan-review-design.md.j2
│   │   ├── plan-review-ux.md.j2
│   │   └── plan-review-strategic.md.j2
│   ├── commands/                         # Slash command templates (.md.j2)
│   ├── CLAUDE.md.j2                      # Project CLAUDE.md template
│   ├── AGENTS.md.j2                      # Project AGENTS.md template
│   └── plugin.json.j2                    # Plugin manifest template
├── profiles/                             # ENHANCED: Profile definitions (JSON)
│   ├── nuv.json                          # NEW
│   ├── aok-be.json                       # ENHANCED (add required fields)
│   ├── aok-fe.json                       # ENHANCED
│   ├── atlas.json                        # ENHANCED
│   └── atlas-storage.json                # NEW
├── generated/                            # NEW: Output directory for generated plugins
│   ├── nuv-superpowers/
│   ├── aok-be-superpowers/
│   ├── aok-fe-superpowers/
│   ├── atlas-superpowers/
│   └── atlas-storage-superpowers/
├── schemas/                              # NEW: JSON Schema definitions
│   ├── profile.schema.json
│   ├── install-state.schema.json
│   ├── review-output.schema.json
│   ├── hooks-registry.schema.json
│   └── plugin-manifest.schema.json
├── scripts/                              # ENHANCED: Factory scripts
│   ├── generate.js                       # NEW: Template → plugin generator
│   ├── install-plugin.js                 # NEW: Plugin → project installer
│   ├── doctor.js                         # NEW: Conformance checker
│   ├── repair.js                         # NEW: Drift repair
│   └── lib/                              # NEW: Shared utilities
│       ├── template-engine.js            # {{placeholder}} substitution
│       ├── install-state.js              # State read/write/validate
│       ├── deep-merge.js                 # JSON deep merge
│       ├── schema-validator.js           # AJV wrapper
│       ├── file-operations.js            # Atomic write, status reporting
│       └── plan-resolver.js              # Read-only plan resolution
├── hooks/                                # ENHANCED: Add profile gating
├── tests/                                # ENHANCED: Add factory tests
│   ├── core_hooks/                       # Existing (159 tests)
│   ├── plugin_hooks/                     # Existing
│   ├── install/                          # Existing
│   ├── factory/                          # NEW: Generator tests
│   │   ├── generate.test.js
│   │   ├── determinism.test.js
│   │   └── idempotency.test.js
│   ├── conformance/                      # NEW: Doctor/repair tests
│   │   ├── doctor.test.js
│   │   └── repair.test.js
│   ├── schemas/                          # NEW: Schema validation tests
│   │   └── validate-all.test.js
│   └── templates/                        # NEW: Template rendering tests
│       └── render.test.js
├── plugins/
│   └── atlas-infra-superpowers/          # Unchanged (manually authored)
├── cursor-rules/                         # Unchanged
├── catalog/                              # Unchanged
├── Makefile                              # ENHANCED: Add generate/doctor/repair targets
└── install.sh                            # ENHANCED: Support generated plugins
```

**Structure Decision:** Three new top-level directories (templates/, generated/, schemas/) are the minimum additions for a template factory. templates/ is the source of truth for all plugin content. generated/ is the output — kept in-repo so generated plugins are version-controlled and diffable. schemas/ validates both input (profiles) and output (generated files, install-state). This satisfies Gate IV (Simplicity) — each directory has a single clear purpose. The scripts/lib/ directory consolidates shared utilities to avoid duplication across the 4 CLI commands (Gate IV).

---

## Phase 0 — Research

No NEEDS CLARIFICATION items remain in Technical Context.

**Research tasks for dependencies:**

1. **AJV integration pattern:** AJV is the only external dependency. Decision: Use `ajv` npm package with `ajv-formats` for format validation. Rationale: AJV is the standard JSON Schema validator in the Node.js ecosystem, used by established scaffold implementations for this purpose. Alternative considered: hand-rolled validator (rejected — reinventing JSON Schema validation is complex and error-prone).

2. **Template engine design:** Decision: Hand-rolled `{{variable}}` substitution with `{% if condition %}` / `{% endif %}` conditional blocks. No loops, no filters, no inheritance. Rationale: The templates need variable substitution and conditional sections (e.g., include Rust-specific content only for Rust profiles). A full Jinja2 engine (Nunjucks) would add complexity without proportional value — we have ~15 distinct placeholders per template, not hundreds. Alternative considered: Nunjucks (rejected — overkill for variable substitution + conditionals; adds a dependency).

3. **Hook runner adaptation:** Decision: Port the profile-gated hook runner pattern — in-process `require()` for Node.js hooks, `spawnSync` for shell hooks, profile gating via env var. Rationale: This is a proven pattern with <100ms execution time. Alternative considered: writing a new runner from scratch (rejected — this is a proven pattern and well-documented).

---

## Phase 1 — Design & Contracts

### 1.1 Data Model

- **Profile:** JSON document validated against `schemas/profile.schema.json`. Required fields: `name` (string), `stack` (object: `language`, `framework`), `orm` (string or null), `test_framework` (string), `concurrency_model` (string), `ci_platform` (string: "gitlab" | "github" | "none"). Optional fields: `review_thresholds` (object overriding per-language defaults from FR-022), `hook_profile` (string: "minimal" | "standard" | "strict", default "standard"), `additional_agents` (array of agent file paths to include verbatim), `knowledge_overrides` (object mapping knowledge file names to override content), `deploy_target`, `auth_model`, `serialization_format`, `database`, `message_broker`, `feature_flag_system`, `observability_stack`, `commit_format`. Plus `extensions` (object, arbitrary key-value pairs). Lifecycle: created once per project, edited by engineer, read by generator.

- **Core Template:** A directory tree mirroring the Claude Code plugin structure. Files ending in `.j2` are rendered through the template engine; all other files are copied verbatim. Template variables come exclusively from the profile — no external data sources. Variables: `{{profile.name}}`, `{{profile.stack.language}}`, `{{profile.stack.framework}}`, `{{profile.orm}}`, etc. Conditionals: `{% if profile.stack.language == "rust" %}...{% endif %}`. Lifecycle: maintained by the plugin factory author (Mark), versioned in git.

- **Generated Plugin:** A directory containing all Claude Code plugin artifacts (agents/, skills/, hooks/, knowledge/, commands/, plugin.json, CLAUDE.md). No `.j2` files — all placeholders resolved. Validated against `schemas/plugin-manifest.schema.json` before being written. Lifecycle: generated from template + profile, committed to git, installed into project repos.

- **Install-State Manifest:** JSON document at `.claude/install-state.json` in the target project repo. Schema: `{schema: "install-state.v1", generatedAt: ISO8601, templateVersion: semver, profileHash: "sha256:...", operations: [{kind: "create"|"merge", source: string, dest: string, strategy: "overwrite"|"skip_if_exists"|"deep_merge", contentHash: "sha256:..."}]}`. Lifecycle: written by installer, read by doctor, updated by repair.

- **Review Output Envelope:** JSON document produced by every review agent. Schema: `{status: "pass"|"warn"|"fail"|"skip", issues: [{severity: "error"|"warning"|"suggestion", confidence: "high"|"medium"|"none", file: string, line: integer, message: string, suggestedFix: string}], summary: string}`. Validated against `schemas/review-output.schema.json` by the orchestrator after agent dispatch.

### 1.2 Interface Contracts

- **`generate` CLI:** `node scripts/generate.js --profile <path> [--output <dir>] [--update] [--dry-run] [--json]`. Reads profile, validates against schema, resolves template plan (read-only), applies plan (writes files). `--update` mode performs three-way merge for template propagation. `--dry-run` prints plan without writing. `--json` outputs machine-readable plan/result. Exit codes: 0 success, 1 validation error, 2 template error, 3 conflict (update mode only). Idempotent: re-running produces `skipped` for all files.

- **`install-plugin` CLI:** `node scripts/install-plugin.js --plugin <dir> --target <dir> [--dry-run] [--json]`. Copies plugin files to target, scaffolds CLAUDE.md/AGENTS.md if absent (skip_if_exists), deep-merges settings.json/hooks.json, writes install-state.json. Exit codes: 0 success, 1 validation error, 2 conflict. Idempotent.

- **`doctor` CLI:** `node scripts/doctor.js --target <dir> [--quick] [--json]`. Reads install-state.json, compares each recorded file against filesystem. `--quick` checks only critical files (plugin.json, CLAUDE.md, hooks.json, and the first 3 agents alphabetically by filename — deterministic, not random, per Constitution Article VI). `--json` outputs structured report. Exit codes: 0 all ok, 1 drift detected, 2 missing install-state.

- **`repair` CLI:** `node scripts/repair.js --target <dir> [--dry-run] [--json]`. Reads install-state.json, regenerates drifted/missing files from template + profile. Respects skip_if_exists. Exit codes: 0 all repaired, 1 conflicts requiring manual resolution, 2 missing install-state or profile.

### 1.3 Cross-Cutting Concerns

#### Observability

- **Log fields:** All CLI commands emit structured log lines to stderr: `{command, phase, file, status, duration_ms}`. JSON mode outputs to stdout; human-readable mode uses colored status prefixes (✓ created, ~ updated, · skipped, ⊘ protected, ⊕ merged, ✗ conflicted).
- **Metric names:** N/A — CLI tooling, no long-running metrics.
- **Trace spans:** N/A — no distributed tracing.

#### Security

- **Trust boundary:** Profile JSON is the only external input. Validated against schema before any template rendering. Template files are internal (authored by Mark, committed to git).
- **Path traversal:** All file operations validate that output paths start with the expected root directory. The hook runner rejects scripts outside the plugin root (established path-traversal protection pattern).
- **Secrets:** Generated plugins MUST NOT contain secrets. The template engine rejects profile fields named `secret`, `token`, `key`, `password`, `credential`. `${PLUGIN_ROOT}` is the only allowed runtime variable in generated hook commands.
- **Atomic writes:** All file writes use the write-to-temp-then-rename pattern (per D-SEC-3, D-RES-1).

#### Failure Modes

- **Template error (syntax or missing variable):** Generator fails before any output is written (per D-RES-3, FR-015). Error message includes template file path and line number.
- **Schema validation error:** Generator/installer fails before any output is written. Error message includes the schema path, the failing field, and the AJV error message.
- **Concurrent writes:** Each CLI command operates on its own output directory. If two generate commands target the same output directory, the second detects existing files and reports them. No file-level locking — atomic writes prevent corruption.
- **Missing install-state:** Doctor and repair fail with exit code 2 and a message suggesting to run install first.

---

## Complexity Tracking

> All gates passed. No complexity tracking entries needed.

---

## Optional Artifacts

- [ ] `data-model.md` — Not needed; data model is simple enough for inline description in §1.1.
- [ ] `contracts/<name>.yaml` — Not needed; CLI contracts described in §1.2 prose.
- [x] `research.md` — Phase 0 research recorded inline in this plan (3 decisions).
- [ ] `quickstart.md` — Deferred; will be written after implementation to reflect actual commands.
