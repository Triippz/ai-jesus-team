# Feature Specification: Plugin Template Factory

**Feature Branch:** `001-plugin-template-factory`
**Created:** 2026-05-17
**Status:** Draft
**Input:** Engineer's original description: Refactor dev-ai-utilities from a shared-core multi-plugin marketplace into a template factory that generates self-contained, tailored project plugins with conformance enforcement. Absorb specialist review agent patterns from community plugin research. Absorb scaffold/conformance patterns from community plugin research. Serve project repos (Nuv, plus future projects).

> **Spec authoring rules** (from the project constitution):
> - Focus on **WHAT** users need and **WHY**. No HOW (no tech stack, APIs, frameworks, code structure) — that lives in plan.md.
> - Every requirement must be testable and unambiguous. Vague adjectives without adjacent quantification fail Article II.
> - **No silent defaults.** The agent applies project-wide defaults only when they appear in `docs/spec/defaults.md` and cites the catalog ID in `## Defaults Applied`. Anything else the engineer didn't specify becomes `[NEEDS CLARIFICATION]`.

---

## User Scenarios & Testing

### User Story 1 — Generate a Tailored Plugin (Priority: P1)

An engineer creates a project profile describing their tech stack (language, framework, ORM, test runner, concurrency model, review thresholds). They run the generator, which reads the profile and the core template, and produces a complete self-contained plugin directory. The generated plugin contains all agents, skills, hooks, knowledge files, and commands — all tailored to that project's specific stack. The engineer installs this plugin into their project and gets stack-aware AI assistance without configuring anything else.

**Why this priority:** Without generation, the entire factory is inert. This is the foundational capability that every other story depends on. No generation = no plugins = no value.

**Independent Test:** Engineer creates a profile for a new project (e.g., a Go REST service), runs the generator, and installs the resulting plugin into a fresh repo. Running `/review` in that repo dispatches review agents that produce structured JSON output with Go-specific feedback (e.g., error handling discipline, interface patterns) — verifying that the plugin is tailored, self-contained, and functional.

**Acceptance Scenarios:**

1. **Given** a valid profile JSON and the core template directory, **When** the engineer runs the generator, **Then** a complete plugin directory is created containing agents/, skills/, hooks/, knowledge/, commands/, plugin.json, and CLAUDE.md, with zero `{{placeholder}}` strings remaining in any file.
2. **Given** the same profile and template version, **When** the engineer runs the generator twice, **Then** the output directories are byte-identical (excluding install-state timestamp), confirmed by SHA-256 hash comparison (Constitution Article VI).
3. **Given** a profile with a `stack: "rust"` field, **When** the generator produces the concurrency-review agent, **Then** that agent's content references tokio, ractor, arc-swap, and `BEGIN IMMEDIATE` SQLite transactions — not generic "watch for race conditions" language.
4. **Given** a profile with fields that do not match any template placeholder, **When** the engineer runs the generator, **Then** the generator fails with an explicit error listing unrecognized profile fields, rather than silently ignoring them.
5. **Given** a profile missing a required field, **When** the engineer runs the generator, **Then** the generator fails with an explicit error naming the missing field, rather than producing a partial plugin.

---

### User Story 2 — Install Plugin into Project (Priority: P1)

An engineer takes a generated plugin and installs it into their project repository. The installation creates required scaffolding (CLAUDE.md if absent, required directories), merges hook registrations into the project's settings.json without clobbering existing configuration, and writes an install-state manifest that records every file written and its write strategy. After installation, the engineer's Claude Code session loads the plugin automatically.

**Why this priority:** Generation without installation delivers no value to the project. Installation is the delivery mechanism. Together with US1, they form the minimum viable pipeline: generate → install → use.

**Independent Test:** Engineer generates the nuv-superpowers plugin, installs it into a fresh clone of the Nuv repo, opens a Claude Code session, and confirms that `/review` dispatches stack-specific review agents and `/brainstorm` loads the tailored brainstorming skill.

**Acceptance Scenarios:**

1. **Given** a generated plugin and a project repo with no existing `.claude/` directory, **When** the engineer runs install, **Then** the installer creates `.claude/`, writes all plugin files, creates CLAUDE.md and AGENTS.md from the plugin's templates, merges settings.json, and writes install-state.json to `.claude/`.
2. **Given** a project repo with an existing CLAUDE.md containing user modifications, **When** the engineer runs install, **Then** the existing CLAUDE.md is preserved (not overwritten). The install-state records the file's write strategy as `skip_if_exists`, and the doctor command reports its runtime status as `protected` (per D-STORE-4). Note: `skip_if_exists` is the recorded strategy; `protected` is the runtime status reported by doctor when a skip_if_exists file exists with user modifications.
3. **Given** a project repo with existing hooks in settings.json, **When** the engineer runs install, **Then** the installer adds the plugin's hooks without removing or replacing existing hook registrations (per D-STORE-5).
4. **Given** the engineer runs install twice with the same plugin, **Then** the second run reports all files as `skipped` or `protected` and makes zero filesystem changes (Constitution Article V).
5. **Given** a generated plugin and any install command, **When** the engineer adds a preview flag, **Then** the system shows what would be written/merged/skipped without modifying any files (per D-OBS-2).

---

### User Story 3 — Detect Plugin Drift (Priority: P2)

An engineer who installed a plugin weeks ago wants to know whether the installed files still match what the factory generated. They run a conformance check (doctor) that reads the install-state manifest and compares every recorded file against the current filesystem. The doctor reports each file's status and an aggregate health summary. This runs locally with no network access.

**Why this priority:** Without drift detection, the template factory is a one-shot tool — it generates and installs, but there's no feedback loop. Drift detection closes the loop by telling the engineer when their installed plugin has diverged. P2 because it's not needed on day one — the engineer just installed a fresh plugin — but becomes essential as the project evolves.

**Independent Test:** Engineer installs a plugin, manually edits one hook file, deletes one agent file, and runs the doctor. The report lists the edited file as `drifted`, the deleted file as `missing`, and all other files as `ok`. The aggregate summary shows the correct counts.

**Acceptance Scenarios:**

1. **Given** a freshly installed plugin with a valid install-state manifest, **When** the engineer runs the doctor, **Then** every file is reported as `ok` and the aggregate shows zero errors.
2. **Given** an installed plugin where one agent file has been modified, **When** the engineer runs the doctor, **Then** that file is reported as `drifted` with the expected vs actual content hash.
3. **Given** an installed plugin where one hook file has been deleted, **When** the engineer runs the doctor, **Then** that file is reported as `missing`.
4. **Given** a file installed with `skip_if_exists` strategy that the user modified, **When** the engineer runs the doctor, **Then** that file is reported as `protected` (not `drifted`), because user-modifiable files are expected to diverge.
5. **Given** the doctor command invoked with a machine-readable flag, **Then** the output is a conformance report — valid JSON with `summary.okCount`, `summary.driftedCount`, `summary.missingCount`, `summary.protectedCount`, and `summary.errorCount` fields, validated against `schemas/conformance-report.schema.json` (per D-OBS-1, FR-023).
6. **Given** the doctor command runs, **Then** it completes in under 2 seconds for a full plugin audit (per D-PERF-3).

---

### User Story 4 — Repair Drifted Files (Priority: P2)

An engineer who discovered drift via the doctor wants to restore the plugin to its expected state. They run repair, which regenerates only the drifted/missing files from the template using the original profile. User-modified files (CLAUDE.md, AGENTS.md) are never overwritten. The engineer can preview what would be repaired before committing.

**Why this priority:** Drift detection without repair is informational only. Repair closes the automation loop. P2 because it pairs with US3 — both are needed for the conformance system to be useful.

**Independent Test:** Engineer deliberately deletes an agent file and modifies a hook file, runs repair, and confirms the agent file is recreated, the hook file is restored to template state, and the user-modified CLAUDE.md is untouched. Running doctor afterward reports all files as `ok` or `protected`.

**Acceptance Scenarios:**

1. **Given** an installed plugin with a `missing` agent file, **When** the engineer runs repair, **Then** the file is regenerated from the template using the original profile and reported as `created`.
2. **Given** an installed plugin with a `drifted` hook file, **When** the engineer runs repair, **Then** the file is regenerated and reported as `updated`.
3. **Given** an installed plugin with a `protected` CLAUDE.md (user-modified), **When** the engineer runs repair, **Then** the file is not touched and reported as `protected`.
4. **Given** the repair command invoked with a preview flag, **Then** the system shows what would be regenerated/created/skipped without modifying any files (per D-OBS-2).
5. **Given** the repair command is run twice on the same drift, **Then** the second run reports all files as `skipped` — the first repair resolved everything (Constitution Article V).

---

### User Story 5 — Propagate Template Updates (Priority: P3)

The engineer improves the core template (fixes a review agent, adds a new skill, updates a knowledge file). They want to propagate these changes to all 5 generated plugins without losing project-specific tailoring. They run the generator with an update flag that performs a three-way merge: new template changes are applied, user modifications to protected files are preserved, and conflicts are surfaced for manual resolution.

**Why this priority:** Template updates are the maintenance story. Without it, improving the core template requires manually porting changes to each generated plugin. P3 because it's a maintenance workflow, not a creation workflow — the factory is useful even without it, just less maintainable.

**Independent Test:** Engineer modifies the complexity-review agent template (changes a threshold), runs the generator in update mode for the atlas profile, and confirms: (1) the atlas-superpowers complexity-review agent has the new threshold, (2) all other atlas-superpowers files are unchanged, (3) no user-modified files were overwritten.

**Acceptance Scenarios:**

1. **Given** a template with a modified agent file and an existing generated plugin, **When** the engineer runs the generator in update mode, **Then** only the changed files are regenerated, and unchanged files report `skipped`.
2. **Given** a template change that conflicts with a user modification to the same file, **When** the engineer runs the generator in update mode, **Then** the conflict is reported as `conflicted` with the expected and actual content, and neither version is overwritten until the engineer resolves it.
3. **Given** a new skill added to the template, **When** the engineer runs the generator in update mode, **Then** the new skill appears in the generated plugin and the install-state manifest is updated.
4. **Given** a template file that was deleted from the template, **When** the engineer runs the generator in update mode, **Then** the corresponding generated file is flagged for removal (not silently deleted) and the engineer confirms before deletion.

---

### User Story 6 — Specialist Review Agents (Priority: P1)

Generated plugins include 10 specialist review agents (based on specialist review patterns from community plugin research) that produce structured JSON output with severity, confidence, file path, line number, message, and suggested fix. Each agent is tailored to the project's stack via profile-driven template placeholders. Agents are dispatched by the orchestrator based on what files changed, and their output aggregates into an orchestrator aggregation report containing a health score (`HEALTHY`, `NEEDS_ATTENTION`, or `CRITICAL` per the review-rubric.md scoring rules) validated against `schemas/orchestrator-aggregation.schema.json` (FR-024).

**Why this priority:** P1 because the specialist review pipeline is the primary value proposition of a tailored plugin over a generic one. Without tailored review agents, the generated plugin is no better than the current core-superpowers.

**Independent Test:** Engineer makes a change to a TypeScript file in the Nuv project that introduces a function with cyclomatic complexity > 10 and a naming inconsistency. Running `/review` dispatches complexity-review and naming-review agents. Both produce valid JSON with `status: "warn"`, specific file/line references, and suggested fixes that reference stack conventions (not generic advice).

**Acceptance Scenarios:**

1. **Given** a generated plugin with review agents, **When** any review agent runs, **Then** its output validates against the review-output JSON schema: `{status: "pass|warn|fail|skip", issues: [{severity, confidence, file, line, message, suggestedFix}], summary}` (per D-PROJ-4).
2. **Given** a review agent that finds no issues, **When** it runs, **Then** it returns `{status: "pass", issues: [], summary: "..."}` — not an error or empty response.
3. **Given** a review agent whose scope does not apply to the changed files, **When** the orchestrator evaluates it, **Then** the agent returns `{status: "skip", issues: [], summary: "..."}` with an explanation of why it skipped.
4. **Given** a review agent that finds issues with `confidence: "high"`, **Then** those issues are eligible for auto-fix. Issues with `confidence: "medium"` require confirmation. Issues with `confidence: "none"` are report-only (per D-PROJ-5).
5. **Given** 3 or more warnings from plan review personas with no blockers, **Then** the plan verdict is `needs-revision` (the "3 warnings = blocker" escalation rule from the brainstorm investigation).

---

### Edge Cases

- **EC-001: Empty profile.** Engineer runs the generator with a profile that has all required fields but no optional fields. Expected: generator succeeds, producing a plugin with generic (non-tailored) content for optional sections, and logs a warning listing which optional fields were absent.
- **EC-002: Profile with unknown fields.** Engineer provides a profile with fields not recognized by any template placeholder. Expected: generator fails with an error listing unrecognized fields (per US1-AS-4).
- **EC-003: Concurrent generation.** Two CI jobs run the generator for the same profile simultaneously. Expected: each produces correct output independently; if writing to the same directory, the second job reports all files as `skipped` with exit code 0 (content matches existing output). Atomic writes (temp-then-rename) prevent partial-file corruption.
- **EC-004: Install into repo with conflicting hook IDs.** A project already has a hook with the same ID as one in the generated plugin. Expected: installer reports the conflict and does not silently overwrite or duplicate the hook.
- **EC-005: Doctor run with missing install-state.** Engineer runs doctor in a project that has plugin files but no install-state manifest. Expected: doctor reports "no install-state found" and suggests running install to create one, rather than crashing.
- **EC-006: Repair when profile has changed.** Engineer changed their profile since the last generation. Running repair uses the current profile, not the profile at generation time. Expected: repair warns that the profile has changed and suggests running a full re-generation instead.
- **EC-008: Path traversal in plugin files.** A generated plugin contains a file with a path-traversal name (e.g., `../../etc/passwd`). Expected: installer rejects the file with an explicit error naming the offending path. No files are written to disk (per D-SEC-1).
- **EC-009: Concurrent repair and developer edit.** An engineer edits a file while repair is running on the same project. Expected: repair uses atomic writes (temp-then-rename), so the engineer either sees the old file or the repaired file, never a partial write. The file's final state depends on write ordering — repair reports the file as `updated` regardless.
- **EC-007: Template with syntax error.** A template file contains an invalid placeholder (e.g., `{{unclosed`). Expected: generator fails with an error naming the template file and the line number of the syntax error, before writing any output files (per D-RES-3).

---

## Functional Requirements

- **FR-001:** System MUST generate a complete self-contained plugin directory from a project profile and the core template, with zero unresolved template placeholders in the output.
- **FR-002:** Generated plugins MUST contain: agents/, skills/, hooks/, knowledge/, commands/, plugin.json, and CLAUDE.md — all tailored to the profile's declared tech stack.
- **FR-003:** Generation MUST produce byte-identical output when given identical input (profile content hash + template version), excluding the install-state generation timestamp (Constitution Article VI).
- **FR-004:** Re-running generation in non-update mode on an already-generated plugin MUST produce zero filesystem changes and report all files as `skipped` (Constitution Article V). In update mode (US5), only files where the template changed are regenerated.
- **FR-005:** Every generation, install, doctor, and repair operation MUST report its effect per file as one of: `created`, `updated`, `skipped`, `protected`, `merged`, `conflicted` (Constitution Article V).
- **FR-006:** Generated plugins MUST validate against a declared JSON schema before any files are written to disk (Constitution Article VII). A validation failure MUST prevent all file writes.
- **FR-007:** The system MUST validate project profiles against a declared profile schema before generation begins. Missing required fields and unrecognized fields MUST both produce explicit errors.
- **FR-008:** Generated plugins MUST include 10 specialist review agents, each producing output conforming to the uniform review JSON envelope: `{status, issues: [{severity, confidence, file, line, message, suggestedFix}], summary}` (per D-PROJ-4).
- **FR-009:** Generated plugins MUST include 4 plan review personas (acceptance, design, UX, strategic) that produce structured verdicts with binary `approve | needs-revision` outcomes.
- **FR-010:** Installation MUST write an install-state manifest recording every file, its source template, and its write strategy (`overwrite`, `skip_if_exists`, `deep_merge`) (Constitution Article VIII).
- **FR-011:** The doctor command MUST compare the install-state manifest against the current filesystem and report per-file status without network access. Completion time MUST be under 2 seconds for a full plugin audit (per D-PERF-3).
- **FR-012:** The repair command MUST regenerate only files reported as `drifted` or `missing` by the doctor, using the current template and profile. Files with `skip_if_exists` strategy MUST NOT be overwritten (per D-STORE-4).
- **FR-013:** All system commands (generate, install, doctor, repair) MUST support a machine-readable output flag producing valid JSON (per D-OBS-1).
- **FR-014:** All state-mutating commands (generate, install-plugin, repair) MUST support a preview flag that shows planned changes without modifying any files (per D-OBS-2). The doctor command is read-only by nature and does not require a preview flag.
- **FR-015:** Template placeholder syntax errors MUST cause generation to fail before any output files are written (per D-RES-3). The error MUST name the file and line number.
- **FR-016:** JSON configuration merges MUST be additive (deep merge) — existing keys in the target file MUST NOT be removed or overwritten by the merge (per D-STORE-5).
- **FR-017:** Generated plugins MUST include hook profile gating with 3 levels (per D-PROJ-2). Each hook MUST declare its own profile membership. Constitution Article I traceability: hook profile gating enforces TDD discipline at the `strict` level by activating the tdd-guard hook. Article V traceability: profile gating ensures consistent hook behavior across re-runs.
- **FR-018:** Generated plugins MUST include an investigation-before-action gate that blocks the first file write per session until the agent demonstrates it has read the relevant codebase context (per D-PROJ-7). Constitution Article II traceability: the gate enforces evidence-driven behavior — agents must cite file paths and API surfaces before modifying code, preventing assumption-based edits.
- **FR-019:** When the core template changes, the generator in update mode MUST propagate changes only to files that differ between the old and new template versions, preserving files that match the old template.
- **FR-020:** Profile MUST declare the following required fields: `name`, `stack` (language + framework), `orm`, `test_framework`, `concurrency_model`, `ci_platform`. Profile MAY include optional fields: `review_thresholds`, `hook_profile`, `additional_agents`, `knowledge_overrides`, `deploy_target`, `auth_model`, `serialization_format`, `database`, `message_broker`, `feature_flag_system`, `observability_stack`, `commit_format`. Profile MAY include an `extensions` object containing arbitrary key-value pairs that templates can reference. Unrecognized top-level fields (outside the declared required, optional, and extensions set) MUST produce a validation error.
- **FR-021:** Generated review agents MUST define explicit skip conditions as boolean predicates with exact JSON return values, and explicit ignore lists preventing agent scope overlap.
- **FR-023:** The doctor command MUST produce a conformance report that validates against a declared `schemas/conformance-report.schema.json`. The schema MUST define: `{summary: {okCount, driftedCount, missingCount, protectedCount, errorCount}, files: [{path, status, expectedHash, actualHash}]}` with `additionalProperties: false` (Constitution Article VII).
- **FR-024:** The orchestrator's aggregated review output MUST validate against a declared `schemas/orchestrator-aggregation.schema.json`. The schema MUST define: `{healthScore: "HEALTHY|NEEDS_ATTENTION|CRITICAL", agentResults: [{agent, status, issueCount}], summary}` with `additionalProperties: false` (Constitution Article VII).
- **FR-022:** Generated review agents MUST define hard numeric thresholds for mechanical findings. Threshold values MUST be configurable per profile via the `review_thresholds` field. When a profile does not specify custom thresholds, the following per-language defaults apply (based on each language's standard tooling and community best practices):

  | Language | Function Length | Cyclomatic Complexity | Nesting Depth | Parameters |
  |----------|----------------|----------------------|---------------|------------|
  | Rust | 50 lines (clippy convention) | 10 (cognitive_complexity) | 4 | 5 |
  | Python | 20 lines (ruff/pylint convention) | 10 (McCabe C901 default) | 4 | 5 |
  | Dart/Flutter | 30 lines (dart_code_linter) | 10 | 4 | 5 |
  | Go | 50 lines (gocyclo convention) | 15 (accounts for Go error-handling verbosity) | 3 (Go idiom: early return) | 5 |
  | TypeScript/Deno | 25 lines (eslint max-lines-per-function) | 10 (eslint complexity default) | 4 (eslint max-depth) | 4 |

  For languages not in this table, the generator MUST fail with an error requesting the engineer to provide explicit thresholds in the profile's `review_thresholds` field.

---

## Success Criteria

- **SC-001:** Running `generate --profile profiles/nuv.json && install-plugin --plugin generated/nuv-superpowers --target /tmp/test-project` completes successfully with exit code 0 and produces a functional plugin (doctor reports all files `ok`) — verifiable by an automated test without human judgment.
- **SC-002:** Generated plugins produce review output that references the project's specific tech stack patterns (not generic advice), as verified by running `/review` on a known-issue test fixture per project.
- **SC-003:** The conformance system (doctor + repair) detects and reports 100% of file-level drift (modified, deleted, added) within an installed plugin, verified by a test suite that introduces known drift and checks the report.
- **SC-004:** All system commands pass the idempotency test: running twice with identical input produces zero filesystem diff on the second run (Constitution Article V).
- **SC-005:** All system commands pass the determinism test: running twice with identical input produces byte-identical output (Constitution Article VI).
- **SC-006:** All project profiles each generate a valid, installable plugin that passes the doctor check and delivers tailored review agents verified against a test fixture.
- **SC-007:** Plugin generation completes in under 5 seconds per plugin (per D-PERF-2). Doctor completes in under 2 seconds per audit (per D-PERF-3).

---

## Key Entities

- **Profile:** A JSON document describing a project's tech stack, conventions, and review thresholds. One profile per project. Profiles are the input to the generator.
- **Core Template:** A directory of template files containing placeholders. The template is the shared structure from which all plugins are generated. One template for the entire factory.
- **Generated Plugin:** A complete, self-contained Claude Code plugin directory produced by the generator from a profile + template. One per project. Contains agents, skills, hooks, knowledge, commands — all tailored.
- **Install-State Manifest:** A JSON file recording every file written during installation, its source template, and its write strategy. One per installed plugin per project repo. The manifest enables drift detection.
- **Review Agent:** A specialist review agent within a generated plugin that produces structured JSON output. 10 per generated plugin, each covering a specific review dimension (complexity, naming, concurrency, domain, test quality, structure, spec compliance, performance, documentation, progress).
- **Plan Review Persona:** A subagent prompt template that reviews plans from a specific adversarial perspective. 4 per generated plugin (acceptance, design, UX, strategic).

---

## Assumptions

- The engineer will maintain profiles in the dev-ai-utilities repo and commit them to version control.
- Claude Code's plugin system supports installing plugins from local directories (confirmed by engineer during brainstorm).
- Multi-plugin composition works in Claude Code — an engineer can install multiple plugins and their agents/skills/hooks merge at runtime (confirmed by engineer during brainstorm).
- Target projects already have Claude Code configurations (.claude/ directories, CLAUDE.md, AGENTS.md) that the installer must respect, not overwrite.
- The specialist review agents will be adapted (not copied verbatim) from community plugin research — the structured JSON envelope and behavioral patterns are kept, but content is rewritten to use template placeholders for stack-specific tailoring.

### Defaults Applied

- `D-STORE-1` — applied to FR-010 (install-state manifest format: JSON with schema version field)
- `D-STORE-2` — applied to FR-010 (install-state location: `.claude/install-state.json`)
- `D-STORE-3` — applied to FR-001 (generated plugin output directory: `generated/<plugin-name>/`)
- `D-STORE-4` — applied to FR-012, US2-AS-2, US4-AS-3 (skip_if_exists for user-modifiable files)
- `D-STORE-5` — applied to FR-016, US2-AS-3 (deep_merge for JSON configs)
- `D-PERF-2` — applied to SC-007 (generation time < 5 seconds)
- `D-PERF-3` — applied to FR-011, SC-007 (doctor time < 2 seconds)
- `D-OBS-1` — applied to FR-013 (--json flag on all commands)
- `D-OBS-2` — applied to FR-014 (--dry-run flag on all commands)
- `D-OBS-3` — applied to FR-005 (per-file status reporting)
- `D-SEC-2` — applied to FR-001 (no secrets or machine-specific paths in generated output)
- `D-SEC-3` — applied to FR-010 (atomic writes for state files)
- `D-DATA-2` — applied to FR-007 (profile schema validation)
- `D-DATA-3` — applied to FR-006 (JSON Schema draft/2020-12 with additionalProperties: false)
- `D-TEST-4` — applied to SC-004, SC-005 (determinism and idempotency tests)
- `D-RES-1` — applied to FR-015 (atomic writes: temp file, validate, rename)
- `D-RES-3` — applied to FR-015 (fail entire plan on template error, no partial output)
- `D-PROJ-1` — applied to FR-001 (two-phase plan/apply pattern)
- `D-PROJ-2` — applied to FR-017 (hook profile gating: minimal/standard/strict)
- `D-PROJ-4` — applied to FR-008 (review agent JSON envelope)
- `D-PROJ-5` — applied to US6-AS-4 (confidence-gated auto-fix)
- `D-PROJ-6` — applied to FR-001 (template placeholder syntax: {{variable_name}})
- `D-PROJ-7` — applied to FR-018 (GateGuard investigation-before-action gate)

### Defaults Overridden

- *(empty)*

---

## Out of Scope

- **Code generation / implementation.** This spec covers the plugin factory (generate, install, audit, repair). It does not cover the AI-assisted development workflows that the generated plugins enable (those are the plugins' domain, not the factory's).
- **atlas-infra-superpowers refactoring.** The Terraform/IaC plugin stays manually authored.
- **Security assessment plugin porting.** A security assessment companion plugin pattern (red-team probes, semgrep rulesets) observed during community plugin research is not part of this spec.
- **Eval system porting.** The 315-fixture eval system (pass@k scoring) observed during community plugin research is a candidate for future work but not in scope for this spec.
- **Cursor rules and Codex mirrors.** The existing cursor-rules/ and codex mirror functionality in dev-ai-utilities continues to work as-is. Template-based generation of cursor rules is deferred.
- **Migration of existing plugins.** This spec produces new generated plugins. Migrating any existing manually-authored plugins to generated versions is a separate task executed after the factory is built.

---

## Dependencies

- **dev-ai-utilities repo (~/Development/dev-ai-utilities/):** The factory is built here. If the repo structure changes upstream (e.g., profiles/ directory moved), the factory must be updated. Failure mode: generation fails with "profile not found" error.
- **Community plugin A (specialist review patterns):** Source of review agent patterns, plan review personas, and knowledge files to port. Failure mode: if the upstream source changes, already-ported content is unaffected (one-time port, not continuous sync).
- **Community plugin B (scaffold/conformance patterns):** Source of scaffold/conformance/hook patterns to port. Same failure mode as above.
- **Claude Code plugin runtime:** The generated plugins depend on Claude Code's plugin loading system. If Claude Code changes its plugin schema or loading behavior, generated plugins may need schema updates. Failure mode: plugin fails to load; doctor reports schema validation errors.
- **5 target project repos:** Installation targets. Each has existing .claude/ configuration that must not be corrupted by installation. Failure mode: installer respects skip_if_exists and deep_merge strategies, never destructive.

---

## Clarifications

Filled in by `/spec clarify`. Each session of clarification appends here as the engineer answers questions.

### Session 2026-05-17

- Q: What fields should the profile schema require? → A: Comprehensive with extensibility. Required: `name`, `stack`, `orm`, `test_framework`, `concurrency_model`, `ci_platform`. Optional: `review_thresholds`, `hook_profile`, `additional_agents`, `knowledge_overrides`, `deploy_target`, `auth_model`, `serialization_format`, `database`, `message_broker`, `feature_flag_system`, `observability_stack`, `commit_format`. Plus an `extensions` object for arbitrary key-value pairs.
- Q: What default review thresholds per language? → A: Per-language matrix based on each language's standard tooling: Rust (50/10/4/5 per clippy), Python (20/10/4/5 per ruff), Dart (30/10/4/5 per dart_code_linter), Go (50/15/3/5 per gocyclo), TypeScript (25/10/4/4 per eslint). Unknown languages require explicit thresholds in profile.
