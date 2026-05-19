# Tasks: Plugin Template Factory

**Feature Branch:** `001-plugin-template-factory`
**Inputs:** spec.md (user stories with priorities), plan.md (tech stack, structure), constitution
**Target repo:** ~/Development/dev-ai-utilities

> **Constitution Article I (NON-NEGOTIABLE):** Tests are not optional. Every behaviour-changing implementation task is preceded by a test task that exercises it.

---

## Phase 1 — Setup (Shared Infrastructure)

- [ ] T001 Create directory structure: `templates/agents/team/`, `templates/agents/review/`, `templates/skills/`, `templates/hooks/`, `templates/knowledge/`, `templates/prompts/`, `templates/commands/` in dev-ai-utilities/
- [ ] T002 [P] Create directory structure: `generated/`, `schemas/`, `scripts/lib/` in dev-ai-utilities/
- [ ] T003 [P] Create directory structure: `tests/factory/`, `tests/conformance/`, `tests/schemas/`, `tests/templates/` in dev-ai-utilities/
- [ ] T004 Install AJV dependency: add `ajv` and `ajv-formats` to dev-ai-utilities package.json (create package.json if absent)
- [ ] T005 [P] Create `schemas/profile.schema.json` — JSON Schema draft/2020-12 with all required fields (name, stack, orm, test_framework, concurrency_model, ci_platform), optional fields (review_thresholds, hook_profile, additional_agents, knowledge_overrides, deploy_target, auth_model, serialization_format, database, message_broker, feature_flag_system, observability_stack, commit_format), extensions object, and `additionalProperties: false` on root
- [ ] T006 [P] Create `schemas/install-state.schema.json` — schema for `{schema, generatedAt, templateVersion, profileHash, operations: [{kind, source, dest, strategy, contentHash}]}`
- [ ] T007 [P] Create `schemas/review-output.schema.json` — schema for `{status, issues: [{severity, confidence, file, line, message, suggestedFix}], summary}`
- [ ] T008 [P] Create `schemas/hooks-registry.schema.json` — schema for hooks.json structure
- [ ] T009 [P] Create `schemas/plugin-manifest.schema.json` — schema for plugin.json structure
- [ ] T098 [P] Create `schemas/conformance-report.schema.json` — schema for doctor output: `{summary: {okCount, driftedCount, missingCount, protectedCount, errorCount}, files: [{path, status, expectedHash, actualHash}]}` with `additionalProperties: false`
- [ ] T099 [P] Create `schemas/orchestrator-aggregation.schema.json` — schema for aggregated review output: `{healthScore: "HEALTHY|NEEDS_ATTENTION|CRITICAL", agentResults: [{agent, status, issueCount}], summary}` with `additionalProperties: false`
- [ ] T010 Add Makefile targets: `make generate`, `make install-plugin`, `make doctor`, `make repair`, `make test-factory`, `make validate-schemas` in dev-ai-utilities/Makefile

---

## Phase 2 — Foundational (Blocking Prerequisites)

Cross-cutting utilities every user story depends on. No user-story work begins until this phase is complete.

### Tests for Foundational (write FIRST)

- [ ] T011 Write tests for template engine: variable substitution, conditional blocks, missing variable error, syntax error reporting in tests/templates/render.test.js
- [ ] T012 [P] Write tests for file operations: atomic write, status enum returns (created/updated/skipped/protected/merged/conflicted), temp-then-rename in tests/factory/file-operations.test.js
- [ ] T013 [P] Write tests for schema validator: valid input passes, invalid input fails with field-level error, additionalProperties rejection in tests/schemas/validate-all.test.js
- [ ] T014 [P] Write tests for deep merge: nested object merge, array replacement, existing keys preserved, null handling in tests/factory/deep-merge.test.js
- [ ] T015 [P] Write tests for plan resolver: reads profile + templates, produces operation list, zero side effects, deterministic ordering in tests/factory/plan-resolver.test.js
- [ ] T016 [P] Write tests for install state: write/read roundtrip, schema validation, hash computation, timestamp handling in tests/conformance/install-state.test.js

### Implementation for Foundational

- [ ] T017 Implement template engine in scripts/lib/template-engine.js — `{{variable}}` substitution, `{% if condition %}` / `{% endif %}` conditionals, error on unresolved placeholders with file:line reporting
- [ ] T018 [P] Implement file operations in scripts/lib/file-operations.js — atomic write (write to .tmp, validate, rename), status enum return, skip_if_exists check, content hash computation (SHA-256)
- [ ] T019 [P] Implement schema validator in scripts/lib/schema-validator.js — AJV wrapper, load schema by path, validate data, return structured errors with field paths
- [ ] T020 [P] Implement deep merge in scripts/lib/deep-merge.js — recursive plain-object merge, array replacement (not append), never remove existing keys, return merged result + list of changes
- [ ] T021 Implement plan resolver in scripts/lib/plan-resolver.js — read profile, scan templates directory, match .j2 files to output paths, determine write strategy per file (overwrite for agents/skills/hooks, skip_if_exists for CLAUDE.md/AGENTS.md, deep_merge for settings.json/hooks.json), return sorted operation list
- [ ] T022 Implement install state in scripts/lib/install-state.js — write manifest with schema version + operations + profile hash + template version, read and validate existing manifest, compare manifest against filesystem (returns per-file status)

**Checkpoint:** All 6 foundational utilities have passing tests. Plan resolver produces a correct operation list from a sample profile + minimal template. No CLI commands yet — that comes in the user story phases.

---

## Phase 3 — User Story 1 + User Story 6 — Generate Tailored Plugin with Review Agents (Priority: P1) MVP

**Goal:** Engineer runs the generator with a profile and gets a complete self-contained plugin with tailored review agents.
**Independent Test:** Engineer creates a Go profile, runs generate, installs the plugin, and `/review` produces Go-specific structured JSON feedback.

### Tests for US1 + US6 (write FIRST)

- [ ] T023 Write test: generate with valid profile produces complete plugin directory (agents/, skills/, hooks/, knowledge/, commands/, plugin.json, CLAUDE.md) with zero {{placeholder}} strings in tests/factory/generate.test.js
- [ ] T024 [P] Write test: generate twice with same profile produces byte-identical output (SHA-256 hash comparison, excluding install-state timestamp) in tests/factory/determinism.test.js
- [ ] T025 [P] Write test: generate on already-generated plugin reports all files as `skipped` in tests/factory/idempotency.test.js
- [ ] T026 [P] Write test: generate with missing required profile field fails with explicit error naming the field in tests/factory/generate.test.js
- [ ] T027 [P] Write test: generate with unrecognized profile field fails with explicit error in tests/factory/generate.test.js
- [ ] T028 [P] Write test: generate with `stack.language: "rust"` produces concurrency-review agent referencing tokio/ractor in tests/factory/generate.test.js
- [ ] T029 [P] Write test: review agent output validates against schemas/review-output.schema.json in tests/schemas/validate-all.test.js
- [ ] T030 [P] Write test: generate with --dry-run produces plan output but writes zero files in tests/factory/generate.test.js
- [ ] T031 [P] Write test: generate with --json produces valid JSON output in tests/factory/generate.test.js
- [ ] T103 [P] Write integration test: generate with profile referencing invalid plugin schema fails before any file writes in tests/factory/generate.test.js (FR-006)
- [ ] T104 [P] Write test: all 4 plan review personas (acceptance, design, UX, strategic) present in generated plugin with binary verdict format (`approve | needs-revision`) in tests/factory/generate.test.js (FR-009)
- [ ] T105 [P] Write test: review agent skip conditions return exact JSON predicate `{status: "skip", issues: [], summary: "..."}` and ignore lists prevent scope overlap in tests/factory/generate.test.js (FR-021)
- [ ] T106 [P] Write test: generate with profile `stack.language: "cobol"` (unsupported) fails with error requesting explicit thresholds in tests/factory/generate.test.js (FR-022)
- [ ] T107 [P] Write test: install-plugin --json produces valid JSON output in tests/factory/install-plugin.test.js (FR-013)
- [ ] T108 [P] Write test: repair --json produces valid JSON output in tests/conformance/repair.test.js (FR-013)
- [ ] T109 [P] [US1] Create test fixture: known-issue Rust code sample (complexity > 10, naming inconsistency) in tests/fixtures/rust-sample/
- [ ] T110 [P] [US1] Create test fixture: known-issue Python code sample in tests/fixtures/python-sample/
- [ ] T111 [P] [US1] Create test fixture: known-issue Dart code sample in tests/fixtures/dart-sample/
- [ ] T112 [P] [US1] Create test fixture: known-issue Go code sample in tests/fixtures/go-sample/
- [ ] T113 [P] [US1] Create test fixture: known-issue TypeScript code sample in tests/fixtures/ts-sample/
- [ ] T114 [P] [US1] Write test: run generated review agents against test fixtures, verify structured JSON output with stack-specific feedback (SC-002, SC-006) in tests/factory/review-fixtures.test.js
- [ ] T115 [P] [US1] Write test: generate for each profile completes in under 5 seconds, assert wall-clock time (SC-007, D-PERF-2) in tests/factory/generate.test.js

### Template Content for US6 — Review Agents

- [ ] T032 [P] [US6] Write complexity-review agent template in templates/agents/review/complexity-review.md.j2 — per-language thresholds from FR-022, skip/ignore sections, uniform JSON envelope
- [ ] T033 [P] [US6] Write naming-review agent template in templates/agents/review/naming-review.md.j2 — per-language naming conventions, confidence calibration
- [ ] T034 [P] [US6] Write concurrency-review agent template in templates/agents/review/concurrency-review.md.j2 — per-language concurrency primitives (tokio/ractor, Celery/Channels, Deno async, goroutines, Dart isolates)
- [ ] T035 [P] [US6] Write domain-review agent template in templates/agents/review/domain-review.md.j2 — per-language ORM markers, anemic domain detection
- [ ] T036 [P] [US6] Write test-review agent template in templates/agents/review/test-review.md.j2 — Farley Score (8 weighted properties), per-language test framework patterns
- [ ] T037 [P] [US6] Write structure-review agent template in templates/agents/review/structure-review.md.j2 — per-language directory conventions
- [ ] T038 [P] [US6] Write spec-compliance-review agent template in templates/agents/review/spec-compliance-review.md.j2 — generic (no stack variation)
- [ ] T039 [P] [US6] Write performance-review agent template in templates/agents/review/performance-review.md.j2 — per-language performance anti-patterns
- [ ] T040 [P] [US6] Write doc-review agent template in templates/agents/review/doc-review.md.j2 — generic
- [ ] T041 [P] [US6] Write progress-guardian agent template in templates/agents/review/progress-guardian.md.j2 — generic loop detection

### Template Content for US6 — Plan Review Personas

- [ ] T042 [P] [US6] Write plan-review-acceptance persona template in templates/prompts/plan-review-acceptance.md.j2 — criteria verifiability, BDD scenarios, TDD traceability, binary verdict
- [ ] T043 [P] [US6] Write plan-review-design persona template in templates/prompts/plan-review-design.md.j2 — dependency direction, God objects, abstraction quality
- [ ] T044 [P] [US6] Write plan-review-ux persona template in templates/prompts/plan-review-ux.md.j2 — self-skip for non-UI, user journey, error recovery
- [ ] T045 [P] [US6] Write plan-review-strategic persona template in templates/prompts/plan-review-strategic.md.j2 — scope assessment, problem-solution fit

### Template Content — Knowledge Files

- [ ] T046 [P] [US6] Write review-rubric.md in templates/knowledge/ — HEALTHY/NEEDS ATTENTION/CRITICAL scoring, confidence-actionability matrix
- [ ] T047 [P] [US6] Write review-template.md in templates/knowledge/ — output format with pre-flight gates, severity icons, health score
- [ ] T048 [P] [US6] Write owasp-detection.md in templates/knowledge/ — tool-detectable vs judgment-only classification
- [ ] T049 [P] [US6] Write accepted-risks-schema.md in templates/knowledge/ — suppression rules, expiry enforcement, 50-char rationale minimum

### Template Content — Core Plugin Files

- [ ] T050 [P] [US1] Write orchestrator agent template in templates/agents/team/orchestrator.md.j2 — model routing table with per-language agent dispatch, review dispatch table, three-phase protocol
- [ ] T051 [P] [US1] Write CLAUDE.md template in templates/CLAUDE.md.j2 — project-specific workflow, command registry, agent catalog, tailored per stack
- [ ] T052 [P] [US1] Write AGENTS.md template in templates/AGENTS.md.j2
- [ ] T053 [P] [US1] Write plugin.json template in templates/plugin.json.j2
- [ ] T054 [P] [US1] Write hooks.json template in templates/hooks/hooks.json.j2 — profile-gated hook registry

### Tests for Hook Scripts (write FIRST — C1, C7, C8)

- [ ] T100 [P] [US1] Write tests for hook runner: profile gating (minimal activates subset, standard activates more, strict activates all), in-process require() path, path traversal rejection in tests/factory/hooks.test.js
- [ ] T101 [P] [US1] Write tests for GateGuard: first file write blocked until investigation facts presented, session state persistence, 30-minute timeout expiry, subagent bypass in tests/factory/hooks.test.js
- [ ] T102 [P] [US1] Write tests for dispatcher: single entry fans out to N sub-hooks, sub-hook failure isolation in tests/factory/hooks.test.js

### Template Content — Hook Scripts

- [ ] T055 [P] [US1] Port and adapt run-with-flags.js hook runner to templates/hooks/run-with-flags.js — profile gating (minimal/standard/strict), in-process require() optimization, path traversal protection
- [ ] T056 [P] [US1] Port and adapt GateGuard to templates/hooks/gateguard.js — investigation-before-action gate, session state with atomic writes, 30-minute timeout
- [ ] T057 [P] [US1] Port and adapt dispatcher to templates/hooks/dispatcher.js — single hook entry fans out to sub-hooks

### Generator CLI

- [ ] T058 [US1] Implement generate CLI in scripts/generate.js — read profile, validate against schema, call plan resolver, call template engine per operation, write files via file-operations, write install-state, support --dry-run/--json/--update flags, exit codes per plan.md §1.2

### Profiles

- [ ] T059 [P] [US1] Create atlas.json profile in profiles/ — Rust 1.91, iroh, Loro CRDTs, SQLCipher, Diesel, FRB Flutter, ractor, cargo-nextest, GitLab CI
- [ ] T060 [P] [US1] Create aok-be.json profile in profiles/ — Python 3.13, Django 5.2, DRF, Celery, Redis, Postgres, pytest, GitLab CI
- [ ] T061 [P] [US1] Create aok-fe.json profile in profiles/ — Flutter 3.32, custom BLoC, Drift, rxdart, flutter test, GitLab CI
- [ ] T062 [P] [US1] Create nuv.json profile in profiles/ — Deno 2.x, Hono 4.x, HTMX, Supabase, Deno.test, Playwright, GitHub Actions
- [ ] T063 [P] [US1] Create atlas-storage.json profile in profiles/ — Go, REST, OpenAPI, Postgres, buf, go test, GitLab CI

### Generate All Plugins

- [ ] T064 [US1] Run generate for all 5 profiles, verify each produces a valid plugin directory with zero {{placeholder}} residue and all files passing schema validation

**Checkpoint:** All 5 plugins generate successfully. Each contains tailored review agents with stack-specific content. Determinism and idempotency tests pass. The Independent Test from spec.md US1 can be executed.

---

## Phase 4 — User Story 2 — Install Plugin into Project (Priority: P1)

**Goal:** Engineer installs a generated plugin into a project repo with zero friction.
**Independent Test:** Install nuv-superpowers into a fresh clone of Nuv repo, open Claude Code, confirm `/review` dispatches stack-specific agents.

### Tests for US2 (write FIRST)

- [ ] T065 [US2] Write test: install into project with no .claude/ creates directory, writes files, creates CLAUDE.md, writes install-state.json in tests/factory/install-plugin.test.js
- [ ] T066 [P] [US2] Write test: install preserves existing CLAUDE.md (skip_if_exists) in tests/factory/install-plugin.test.js
- [ ] T067 [P] [US2] Write test: install deep-merges settings.json without clobbering existing hooks in tests/factory/install-plugin.test.js
- [ ] T068 [P] [US2] Write test: install twice reports all files as skipped/protected (idempotency) in tests/factory/install-plugin.test.js
- [ ] T069 [P] [US2] Write test: install with --dry-run writes zero files in tests/factory/install-plugin.test.js

### Implementation for US2

- [ ] T070 [US2] Implement install-plugin CLI in scripts/install-plugin.js — copy plugin files to target .claude/, scaffold CLAUDE.md/AGENTS.md (skip_if_exists), deep-merge settings.json/hooks.json, write install-state.json, support --dry-run/--json flags, exit codes per plan.md §1.2

**Checkpoint:** Generated plugins install correctly into project repos. Existing CLAUDE.md preserved. Settings.json merged additively. Idempotency verified.

---

## Phase 5 — User Story 3 — Detect Plugin Drift (Priority: P2)

**Goal:** Engineer detects when installed plugin files have been modified, deleted, or are missing.
**Independent Test:** Install plugin, modify one file, delete another, run doctor. Report shows drifted + missing + ok correctly.

### Tests for US3 (write FIRST)

- [ ] T071 [US3] Write test: doctor on fresh install reports all files as ok in tests/conformance/doctor.test.js
- [ ] T072 [P] [US3] Write test: doctor detects modified file as drifted in tests/conformance/doctor.test.js
- [ ] T073 [P] [US3] Write test: doctor detects deleted file as missing in tests/conformance/doctor.test.js
- [ ] T074 [P] [US3] Write test: doctor reports user-modified skip_if_exists file as protected (not drifted) in tests/conformance/doctor.test.js
- [ ] T075 [P] [US3] Write test: doctor with --json produces valid JSON with summary counts in tests/conformance/doctor.test.js
- [ ] T076 [P] [US3] Write test: doctor with missing install-state exits code 2 with helpful message in tests/conformance/doctor.test.js
- [ ] T077 [P] [US3] Write test: doctor completes in under 2 seconds for 80-file plugin in tests/conformance/doctor.test.js

### Implementation for US3

- [ ] T078 [US3] Implement doctor CLI in scripts/doctor.js — read install-state.json, compare each operation against filesystem (content hash for overwrite files, existence check for skip_if_exists), aggregate summary, support --quick/--json flags, exit codes per plan.md §1.2

**Checkpoint:** Doctor correctly identifies drifted, missing, ok, and protected files. JSON output parseable by CI.

---

## Phase 6 — User Story 4 — Repair Drifted Files (Priority: P2)

**Goal:** Engineer repairs drift by regenerating only changed files without overwriting user modifications.
**Independent Test:** Delete an agent file, modify a hook, run repair. Agent recreated, hook restored, CLAUDE.md untouched.

### Tests for US4 (write FIRST)

- [ ] T079 [US4] Write test: repair recreates missing file as created in tests/conformance/repair.test.js
- [ ] T080 [P] [US4] Write test: repair restores drifted file as updated in tests/conformance/repair.test.js
- [ ] T081 [P] [US4] Write test: repair does not touch protected (skip_if_exists) files in tests/conformance/repair.test.js
- [ ] T082 [P] [US4] Write test: repair with --dry-run writes zero files in tests/conformance/repair.test.js
- [ ] T083 [P] [US4] Write test: repair twice (second run all skipped) — idempotency in tests/conformance/repair.test.js

### Implementation for US4

- [ ] T084 [US4] Implement repair CLI in scripts/repair.js — run doctor internally, regenerate drifted/missing files from template + profile (using install-state profileHash to locate profile), respect skip_if_exists, update install-state, support --dry-run/--json flags

**Checkpoint:** Repair + doctor cycle: repair fixes drift, doctor confirms all ok/protected afterward.

---

## Phase 7 — User Story 5 — Propagate Template Updates (Priority: P3)

**Goal:** Engineer updates the core template and propagates changes to generated plugins without losing project-specific tailoring.
**Independent Test:** Modify complexity-review threshold in template, run generate --update for atlas, confirm threshold updated and other files unchanged.

### Tests for US5 (write FIRST)

- [ ] T085 [US5] Write test: generate --update regenerates only changed template files, reports others as skipped in tests/factory/generate.test.js
- [ ] T086 [P] [US5] Write test: generate --update detects conflict between template change and user modification, reports as conflicted in tests/factory/generate.test.js
- [ ] T087 [P] [US5] Write test: generate --update with new template file adds it to generated plugin in tests/factory/generate.test.js
- [ ] T088 [P] [US5] Write test: generate --update with deleted template file flags for removal (does not silently delete) in tests/factory/generate.test.js

### Implementation for US5

- [ ] T089 [US5] Add --update mode to scripts/generate.js — read existing generated plugin's install-state, compare template content hashes, regenerate only files where template changed, detect conflicts (template changed AND generated file was manually modified), report status per file
- [ ] T090 [US5] Update scripts/lib/plan-resolver.js to support update mode — compare old template hashes (from install-state) against current template hashes, classify each file as unchanged/updated/added/removed/conflicted

**Checkpoint:** Template updates propagate correctly. Changed files updated, unchanged files skipped, conflicts reported without data loss.

---

## Final Phase — Polish & Cross-Cutting Concerns

- [ ] T091 [P] Add CI schema validation job: run AJV against all profiles, all generated plugin.json files, all schemas (self-validation) in Makefile target `validate-schemas`
- [ ] T092 [P] Add CI determinism job: generate all 5 plugins twice, assert SHA-256 equality in Makefile target `test-determinism`
- [ ] T093 [P] Add CI idempotency job: generate all 5 plugins, generate again, assert zero filesystem diff in Makefile target `test-idempotency`
- [ ] T094 [P] Write `--help` output for all 4 CLI commands (generate, install-plugin, doctor, repair) with usage examples
- [ ] T095 Update dev-ai-utilities/Makefile with all new targets: generate, install-plugin, doctor, repair, test-factory, test-conformance, validate-schemas, test-determinism, test-idempotency
- [ ] T096 Update dev-ai-utilities install.sh to support installing generated plugins (detect generated/ directory, offer profile-based install)
- [ ] T097 Run full test suite: `make test-factory test-conformance validate-schemas test-determinism test-idempotency` — all green

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (1)** has no dependencies; runs first.
- **Foundational (2)** depends on Setup; blocks all user-story phases.
- **US1+US6 (3)** depends on Foundational. The templates (T032-T057) and generator (T058) form the MVP.
- **US2 (4)** depends on US1+US6 (needs generated plugins to install).
- **US3 (5)** depends on US2 (needs installed plugins to audit).
- **US4 (6)** depends on US3 (repair uses doctor internally).
- **US5 (7)** depends on US1+US6 (update mode extends the generator).
- **Polish (Final)** depends on all user stories.

### Within a User Story

- Tests precede implementation tasks for the same behaviour (Article I).
- Template content (T032-T057) can be written in parallel — each is a separate file.
- Generator CLI (T058) depends on all foundational utilities + at least some templates existing.
- Profiles (T059-T063) can be written in parallel.

### Parallel Opportunities

- T001-T003: all setup directories in parallel.
- T005-T009: all schemas in parallel.
- T011-T016: all foundational tests in parallel.
- T017-T022: utilities with no cross-dependencies in parallel (T017, T018, T019, T020 independent; T021 depends on T017+T018; T022 depends on T018+T019).
- T032-T049: ALL review agent/persona/knowledge templates in parallel (18 independent files).
- T050-T057: core plugin templates + hook scripts in parallel.
- T059-T063: all profiles in parallel.
- T065-T069: all US2 tests in parallel.
- T071-T077: all US3 tests in parallel.
- T079-T083: all US4 tests in parallel.
- T085-T088: all US5 tests in parallel.
- T091-T096: all polish tasks in parallel.

---

## Summary

| Phase | Tasks | Parallel opportunities |
|-------|-------|----------------------|
| Setup | T001-T010, T098-T099 (12) | 10 parallel |
| Foundational | T011-T022 (12) | 10 parallel |
| US1+US6 (P1 MVP) | T023-T064, T100-T115 (58) | 49 parallel |
| US2 (P1) | T065-T070, T107 (7) | 5 parallel |
| US3 (P2) | T071-T078 (8) | 6 parallel |
| US4 (P2) | T079-T084, T108 (7) | 5 parallel |
| US5 (P3) | T085-T090 (6) | 3 parallel |
| Polish | T091-T097 (7) | 5 parallel |
| **Total** | **117 tasks** | |

**MVP scope:** Phases 1-4 (Setup + Foundational + Generate/Review Agents + Install = 89 tasks). After completion, all 5 plugins generate, install, and deliver tailored review agents verified against test fixtures. Doctor + repair (15 tasks) add conformance. Template updates (6 tasks) add maintenance capability.
