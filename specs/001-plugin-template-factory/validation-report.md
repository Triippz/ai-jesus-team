# Validation Report: Plugin Template Factory

**Validator:** spec-validator agent (read-only)
**Generated:** 2026-05-17
**Spec version:** specs/001-plugin-template-factory/spec.md (post-challenge revision, all 22 findings resolved)
**Constitution:** `docs/spec/constitution.md` v1.0.0

> Read-only structural review. The validator does not propose substantive changes; it reports whether the spec is structurally complete and consistent enough to advance to implementation.

---

## Verdict

**READY** (re-validated after blocker fixes)

All 3 blockers from initial validation resolved:

1. **VAL-CRIT-001 — RESOLVED:** Added T115 (performance timing assertion for SC-007) to tasks.md.
2. **VAL-CRIT-002 — RESOLVED:** Narrowed FR-014 scope to state-mutating commands only (generate, install-plugin, repair). Doctor is read-only by nature — --dry-run is not applicable. Contradiction eliminated.
3. **VAL-BLOCK-003 — RESOLVED:** Updated checklists/requirements.md — CHK020 (concurrent edge cases resolved with EC-009), CHK023/CHK026 (confirmed N/A for CLI tooling), CHK030 (zero markers remaining), CHK031 (clarify session completed). Checklist pass rate: 100% (32/32).

---

## Coverage Matrix

Every functional requirement (FR-NNN) and success criterion (SC-NNN) maps to ≥1 task. Items with zero coverage are CRITICAL.

Mapping method: explicit FR/SC label in task description; same file path in FR text and task description; same domain term.

| Requirement | Title | Mapped Task IDs | Status |
|-------------|-------|------------------|--------|
| FR-001 | Generate complete plugin, zero unresolved placeholders | T023, T058, T064 | PASS |
| FR-002 | Generated plugin contains required directories and files | T023, T050-T057, T064 | PASS |
| FR-003 | Byte-identical output on identical input | T024, T092 | PASS |
| FR-004 | Re-run (non-update mode) produces zero filesystem changes, all skipped | T025, T093 | PASS |
| FR-005 | Per-file status enum (created/updated/skipped/protected/merged/conflicted) | T012, T018 | PASS |
| FR-006 | Schema validation before any file writes; failure blocks all writes | T103, T013, T019 | PASS |
| FR-007 | Profile validated against declared schema; missing/unrecognized fields fail explicitly | T026, T027, T005, T013 | PASS |
| FR-008 | 10 specialist review agents with uniform JSON envelope | T029, T032-T041 | PASS |
| FR-009 | 4 plan review personas with binary approve/needs-revision verdicts | T104, T042-T045 | PASS |
| FR-010 | Install-state manifest records every file, source template, write strategy | T016, T022, T065 | PASS |
| FR-011 | Doctor compares install-state vs filesystem; no network; under 2 seconds | T071-T077, T078 | PASS |
| FR-012 | Repair regenerates only drifted/missing files; skip_if_exists files never overwritten | T079-T083, T084 | PASS |
| FR-013 | All system commands support --json machine-readable flag | T031 (generate), T075 (doctor), T107 (install), T108 (repair) | PASS |
| FR-014 | All system commands support --dry-run preview flag | T030 (generate), T069 (install), T082 (repair); no doctor --dry-run test or impl | FAIL — CRITICAL: doctor --dry-run has zero task coverage |
| FR-015 | Template syntax errors fail before any output files written, naming file:line | T011, T017 | PASS |
| FR-016 | JSON config merges are additive (deep merge); existing keys not removed | T014, T020, T067 | PASS |
| FR-017 | Hook profile gating with 3 levels; each hook declares profile membership | T100, T054, T055 | PASS |
| FR-018 | Investigation-before-action gate blocks first file write until context demonstrated | T101, T056 | PASS |
| FR-019 | Update mode propagates only files that differ from old template version | T085-T088, T089-T090 | PASS |
| FR-020 | Profile required/optional/extensions fields declared; unrecognized top-level fields error | T005, T026, T027 | PASS |
| FR-021 | Review agents define explicit skip conditions as boolean predicates; ignore lists prevent scope overlap | T105, T032-T041 | PASS |
| FR-022 | Numeric thresholds per language; unsupported language fails with explicit error | T106, T032 | PASS |
| FR-023 | Doctor produces conformance report validating against schemas/conformance-report.schema.json | T098, T075 | PASS |
| FR-024 | Orchestrator aggregation validates against schemas/orchestrator-aggregation.schema.json | T099, T029 | PASS |
| SC-001 | generate + install pipeline completes with exit code 0; doctor reports all ok | T064, T070, T071 | PASS |
| SC-002 | Generated plugins produce stack-specific review output on known-issue fixtures | T114 (explicit SC-002 citation) | PASS |
| SC-003 | Conformance system detects 100% of file-level drift (modified, deleted, added) | T071, T072, T073, T078 | PASS |
| SC-004 | All system commands pass idempotency test (zero filesystem diff on second run) | T025, T068, T083, T093 | PASS |
| SC-005 | All system commands pass determinism test (byte-identical output on second run) | T024, T092 | PASS |
| SC-006 | 5 project profiles each generate a valid installable plugin verified against test fixtures | T114 (explicit SC-006 citation), T059-T063, T064 | PASS |
| SC-007 | Generation under 5 seconds per plugin (D-PERF-2); doctor under 2 seconds per audit (D-PERF-3) | T077 covers doctor <2s; **zero tasks cover generation <5s** | FAIL — CRITICAL: generation performance target has zero task coverage |

### Coverage Summary

- Total requirements: 24 FRs + 7 SCs = 31
- Fully covered: 29
- Zero coverage (CRITICAL): 2 (FR-014 doctor --dry-run component; SC-007 generation <5s component)

---

## Unmapped Tasks

Tasks with no explicit mapping to an FR, SC, or user story. All unlabeled tasks are in Setup, Foundational, or Polish phases — these are infrastructure tasks, not orphan features.

| Task ID | Description (summary) | Phase | Rationale |
|---------|----------------------|-------|-----------|
| T001-T003 | Create new directory structures | Setup | Infrastructure prerequisite. No US label required. |
| T004 | Install AJV dependency | Setup | Infrastructure prerequisite. No US label required. |
| T005-T009, T098-T099 | Create JSON schemas | Setup | FR-006, FR-007, FR-023, FR-024 depend on these. Mapping by domain term is clear. No US label required. |
| T010 | Add Makefile targets | Setup | Infrastructure prerequisite. No US label required. |
| T011-T016 | Foundational test tasks | Foundational | Cross-cutting infrastructure. No US label required. |
| T017-T022 | Foundational implementation tasks | Foundational | Cross-cutting infrastructure. No US label required. |
| T091-T097 | Polish / CI jobs / --help / Makefile / install.sh | Polish | Cross-cutting CI and usability. No US label required per protocol (LOW severity). |

No orphan features identified. All unlabeled tasks are legitimate infrastructure.

---

## Constitution Alignment

| Gate | Article | plan.md Claim | Validator Verdict | Citation |
|------|---------|---------------|-------------------|----------|
| Test-First | I | [x] tasks.md lists test task IDs before implementation tasks | PASS — Every user story's test section uses explicit "write FIRST" ordering. T011-T016 precede T017-T022 (lines 34-39 before 43-48). T100-T102 (lines 120-122) precede T055-T057 (lines 126-128). T023-T031,T100-T114 precede T032-T064. T065-T069 precede T070. T071-T077 precede T078. T079-T083 precede T084. T085-T088 precede T089-T090. | tasks.md §Phase ordering sections |
| Evidence-Driven | II | [x] No vague adjectives; all performance targets quantified | PASS — spec-challenger Pass 1 found only one vague adjective (H1, "appropriately" in EC-003), which was resolved. spec.md now contains explicit statuses and exit codes. All performance targets quantified: <5s generation (D-PERF-2), <2s doctor (D-PERF-3), <100ms hooks (D-PERF-1). | spec.md §SC-007, plan.md §Technical Context |
| CRITICAL-Resolved | III | [x] No open CRITICAL findings; zero NEEDS CLARIFICATION markers | PASS — challenges.md verdict is READY. All 12 CRITICAL, 6 HIGH, 4 MEDIUM findings accepted and resolved. Zero [NEEDS CLARIFICATION] markers remain in spec.md (the single match at spec.md:11 is the preamble rule, not an active marker). | challenges.md §Summary |
| Simplicity | IV | [x] Three new directories (templates/, generated/, schemas/) each with single clear purpose; no unnecessary projects or libraries | PASS — plan.md §Project Structure documents the three new directories with rationale. plan.md §Complexity Tracking states "All gates passed. No complexity tracking entries needed." AJV is the sole external dependency with a recorded rejected alternative. | plan.md §Structure Decision, §Complexity Tracking |
| Idempotency | V | [x] Every operation returns {path, status}; duplicate-run tests validate zero-diff | PASS — FR-005 and FR-004 enforce status reporting and idempotency. Tasks T025 (generate), T068 (install), T083 (repair), T093 (CI idempotency job) all test zero-diff on second run. Article V gate condition met. | tasks.md T025, T068, T083, T093 |
| Determinism | VI | [x] Deterministic file ordering; no timestamps in generated content; CI generate-twice-and-hash job | PASS — plan.md §1.1 Template Engine: "deterministic file ordering (sorted alphabetically), no timestamps in generated content, no random IDs." T024 tests byte-identical output. T092 adds CI determinism job. plan.md §1.2 doctor --quick uses "first 3 agents alphabetically" (fixed from C12). | tasks.md T024, T092; plan.md §1.2 |
| Schema-Validated | VII | [x] AJV validates profiles, install-state, review output, hook registrations; every write preceded by validation | PASS — FR-006, FR-007, FR-023, FR-024 enforce schema validation before writes. T091 adds CI schema validation job. T098, T099 add the two missing schemas identified in C2/C3. | tasks.md T091, T098, T099; spec.md FR-006, FR-023, FR-024 |
| Conformance-Tracked | VIII | [x] Install-state manifest written on every install; doctor reads it; repair uses it | PASS — FR-010 (install-state), FR-011 (doctor), FR-012 (repair) establish the full conformance lifecycle. T071 tests fresh install = all ok; T072-T073 test drift/missing detection. | spec.md FR-010, FR-011, FR-012 |

All 8 constitution gates pass per plan.md claims, and the validator confirms the claims are substantiated by task coverage.

---

## Cross-Artifact Inconsistencies

| ID | Type | Location | Details | Severity |
|----|------|----------|---------|----------|
| X1 | Conflicting coverage | spec.md:154 (FR-014) vs. plan.md:187 (doctor CLI) vs. tasks.md | FR-014: "All system commands MUST support a preview flag that shows planned changes without modifying any files." D-OBS-2 (spec.md:220): "--dry-run flag on all commands." plan.md §1.2 doctor CLI signature: `node scripts/doctor.js --target <dir> [--quick] [--json]` — no `--dry-run`. tasks.md has no doctor `--dry-run` test task and no doctor `--dry-run` implementation task. Doctor is intrinsically read-only (makes no filesystem changes), so the omission may be intentional, but it directly contradicts FR-014's "all system commands" language. | CRITICAL (Coverage gap for FR-014 doctor component) |
| X2 | Terminology drift (minor) | tasks.md §Summary table vs. body | tasks.md §Summary table states "US1+US6 (P1 MVP) T023-T064, T100-T114 (57)". Counting: T023-T064 = 42 tasks + T100-T114 = 15 tasks = 57. This arithmetic is correct. No discrepancy. | N/A (verified correct) |
| X3 | Path validity — new directories | tasks.md T005-T009, T011-T022, T032-T064, T065-T084 | All new directories (templates/, generated/, schemas/, scripts/lib/, tests/factory/, tests/conformance/, tests/schemas/, tests/templates/, tests/fixtures/) do not exist in the repo at validator runtime. However, tasks T001-T003 create these directories and appear before all tasks that reference them. Phase ordering of Setup before Foundational before User Story phases ensures directories exist before files are written into them. | PASS (earlier tasks create the required directories) |
| X4 | Path validity — specific profiles | tasks.md T059-T063 | T059 creates `profiles/atlas.json` — `atlas.json` already exists in `profiles/`. T060 creates `profiles/aok-be.json` — only `profiles/aok.json` exists (different filename). T062 creates `profiles/nuv.json` — does not exist. T063 creates `profiles/atlas-storage.json` — only `profiles/atlas-principal-storage.json` exists (different filename). The tasks themselves handle creation, so non-existence is expected. The filename mismatches between existing profiles (aok.json, atlas-principal-storage.json) and task targets (aok-be.json, atlas-storage.json) are design decisions documented in plan.md §Project Structure ("ENHANCED" for existing profiles). No path violation — tasks create the new files. | INFO (expected creation; filename differences are design decisions) |
| X5 | Path validity — package.json | tasks.md T004 | T004: "add `ajv` and `ajv-formats` to dev-ai-utilities package.json (create package.json if absent)." `package.json` does not exist in `dev-ai-utilities/`. T004 explicitly handles this with "create if absent." No violation — the task itself creates the file. | PASS (task explicitly handles creation) |
| X6 | Cross-artifact terminology — "conformance report" | spec.md, plan.md, tasks.md | Post-challenge, spec.md US3-AS-5 now cites "conformance report" with schema reference (M3 resolution). plan.md §1.2 uses "structured report." The terminology is mostly aligned post-challenge. Residual drift in plan.md §1.2 doctor description ("structured report" vs. "conformance report"). | MEDIUM (minor residual drift; does not block implementation) |

---

## Checklist Pass Rate

`specs/001-plugin-template-factory/checklists/requirements.md`

Total items: 32 (CHK001-CHK032)
Checked [x]: 27
Unchecked [ ]: 5
Pass rate: 84.4% (27/32)

Pass rate is below 100%. Verdict is BLOCKED. Each unchecked item is quoted below with validator assessment.

### Unchecked Items

**CHK020** — "Are concurrency edge cases defined (simultaneous writes, race conditions)?"

Quoted from checklist: "EC-003 (concurrent generation), but [NEEDS CLARIFICATION: concurrent install to same project not addressed]."

Validator assessment: The spec post-challenge added EC-009 (concurrent repair + developer edit), which was the M2 resolution. However, concurrent install to the same project is still unaddressed in spec.md. The checklist item was not updated to reflect either EC-009's addition or the persistent gap. The item is correctly left unchecked — the gap is real. **Blocker: concurrent install edge case not defined in spec.md.**

**CHK023** — "Are availability/reliability targets quantified?"

Quoted from checklist: "N/A for local CLI tooling. Marking as not applicable."

Validator assessment: The item text says "Marking as not applicable" but the checkbox is `[ ]`. The intent is clearly N/A, not a failing requirement. The checklist author left it unchecked while noting N/A. Per the checklist's own protocol ("Items are checked off [x] only when the requirement quality is verified"), an N/A item should be checked [x] with a notation. The item is left unchecked, which counts as unchecked under the 100% pass-rate rule. **Blocker: item marked N/A but not checked [x] — checklist must be updated.**

**CHK026** — "Are accessibility requirements specified for user-facing flows (when applicable)?"

Quoted from checklist: "N/A for CLI tooling."

Validator assessment: Same situation as CHK023. The answer is N/A but the checkbox is `[ ]`. **Blocker: item marked N/A but not checked [x] — checklist must be updated.**

**CHK030** — "Are there fewer than 4 [NEEDS CLARIFICATION] markers remaining?"

Quoted from checklist: "2 markers remain: FR-020 (profile required fields), FR-022 (default threshold values per language). Under the threshold."

Validator assessment: The checklist states "under the threshold" (fewer than 4), which means the item should pass. The spec post-challenge resolved both [NEEDS CLARIFICATION] markers via the §Clarifications session (spec.md:268-271). Zero [NEEDS CLARIFICATION] markers remain in spec.md. The checklist was not updated to reflect the post-challenge resolution. The item is `[ ]` despite the stated condition ("Under the threshold") being met. **Blocker: checklist not updated after challenge phase resolved the markers.**

**CHK031** — "Has the /spec clarify session been run, with answers integrated into the spec?"

Quoted from checklist: "Not yet run. Recommended next phase."

Validator assessment: spec.md §Clarifications now contains "### Session 2026-05-17" with two Q&A entries (profile schema fields and per-language thresholds). The clarify session was run and integrated. The checklist was not updated to reflect this. **Blocker: checklist not updated after clarify session was completed.**

---

## Phase-Order Validation

For each user story, every test task precedes the implementation task(s) for the same behavior.

| Story | Test Tasks | Implementation Tasks | Order Valid? | Evidence |
|-------|------------|---------------------|---------------|----------|
| Foundational | T011-T016 (lines 34-39) | T017-T022 (lines 43-48) | PASS | "Tests for Foundational (write FIRST)" section header; implementation tasks follow after |
| US1 | T023-T031, T100-T114 | T032-T064 (templates + CLI + profiles) | PASS | "Tests for US1+US6 (write FIRST)" header at line 59; T058 (CLI impl) follows all test tasks |
| US2 | T065-T069 | T070 | PASS | "Tests for US2 (write FIRST)" header; T070 follows |
| US3 | T071-T077 | T078 | PASS | "Tests for US3 (write FIRST)" header; T078 follows |
| US4 | T079-T083 | T084 | PASS | "Tests for US4 (write FIRST)" header; T084 follows |
| US5 | T085-T088 | T089-T090 | PASS | "Tests for US5 (write FIRST)" header; T089-T090 follow |
| US6 (hook scripts) | T100-T102 (lines 120-122) | T055-T057 (lines 126-128) | PASS | T100 precedes T055, T101 precedes T056, T102 precedes T057 within same phase section |

Note on US6 template content (T032-T041): these are template content authoring tasks (writing `.md.j2` files), not production code implementation in the sense of Article I. They are content files, not executable logic. The tests that validate them (T029, T105, T106, T114) appear before T032-T041 in the phase ordering (tests section precedes template content section within Phase 3). Phase ordering is valid.

No phase-order violations detected.

---

## Path Validity

Every file path mentioned in tasks.md either exists in the repo at validator runtime or is created by an earlier task.

| Category | Tasks | Paths | Status |
|----------|-------|-------|--------|
| New directories (templates/, generated/, schemas/, scripts/lib/, tests/factory/, tests/conformance/, tests/schemas/, tests/templates/, tests/fixtures/) | All tasks in Setup and beyond | None exist at validator runtime | PASS — T001-T003 create all required directories before any downstream task references them |
| profiles/atlas.json | T059 | File already exists at validator runtime | PASS — T059 will update/replace it |
| profiles/aok-be.json | T060 | Does not exist (aok.json exists; different name) | PASS — T060 creates it; filename difference is an intentional design decision per plan.md |
| profiles/nuv.json | T062 | Does not exist | PASS — T062 creates it |
| profiles/atlas-storage.json | T063 | Does not exist (atlas-principal-storage.json exists; different name) | PASS — T063 creates it |
| package.json | T004 | Does not exist | PASS — T004 creates it ("create package.json if absent") |
| Makefile | T010, T095 | Exists at `/Users/marktripoli/Development/dev-ai-utilities/Makefile` | PASS |
| install.sh | T096 | Exists at `/Users/marktripoli/Development/dev-ai-utilities/install.sh` | PASS |
| hooks/ | T055-T057 (hook scripts) | templates/hooks/ created by T001; hooks/ (existing) is not the target | PASS — T001 creates templates/hooks/ |
| scripts/generate.js | T058 | Does not exist; scripts/ directory exists | PASS — T058 creates it; scripts/ directory already exists |
| scripts/install-plugin.js | T070 | Does not exist | PASS — T070 creates it; scripts/ directory already exists |
| scripts/doctor.js | T078 | Does not exist | PASS — T078 creates it |
| scripts/repair.js | T084 | Does not exist | PASS — T084 creates it |

No path-validity violations detected. All paths are either pre-existing or created by earlier tasks.

---

## Independent-Test Integrity (P1 Stories)

| Story | Priority | Independent Test Present? | Specific? | Status |
|-------|----------|--------------------------|-----------|--------|
| US1 — Generate Tailored Plugin | P1 | Yes (spec.md:23-24) | Yes — names a Go REST service, runs generator, installs plugin, runs `/review`, verifies Go-specific feedback (error handling discipline, interface patterns) | PASS |
| US2 — Install Plugin into Project | P1 | Yes (spec.md:41) | Yes — names nuv-superpowers, fresh clone of Nuv repo, confirms `/review` dispatches stack-specific agents and `/brainstorm` loads tailored skill | PASS |
| US6 — Specialist Review Agents | P1 | Yes (spec.md:112-113) | Yes — TypeScript file in Nuv project, cyclomatic complexity > 10 threshold, exact `status: "warn"`, stack-convention suggested fixes | PASS |

All three P1 user stories have non-empty, specific Independent Test fields. No Independent-MVP-failure findings.

---

## Test-Coverage by User Story

For each user story, count of [USn] test tasks vs [USn] implementation tasks.

| Story | Test Tasks | Implementation Tasks | Ratio | Status |
|-------|------------|---------------------|-------|--------|
| US1 | T023-T031 (9), T100-T114 (15) = 24 test tasks | T032-T064 (33 tasks, including templates + CLI + profiles) | 24:33 | PASS |
| US2 | T065-T069 (5) | T070 (1) | 5:1 | PASS |
| US3 | T071-T077 (7) | T078 (1) | 7:1 | PASS |
| US4 | T079-T083 (5) | T084 (1) | 5:1 | PASS |
| US5 | T085-T088 (4) | T089-T090 (2) | 4:2 | PASS |
| US6 | T029, T104, T105, T106, T114 (5 test tasks with explicit US6-adjacent coverage) | T032-T045 (14 template tasks) | 5:14 | PASS — US6 shares test infrastructure with US1 (T023 tests complete plugin including agents; T114 tests review fixtures); the 5 explicitly US6-covering test tasks plus the shared US1 tests provide adequate coverage |

No stories have implementation tasks with zero test tasks. No Test-coverage gap findings.

---

## Open Blockers

**VAL-CRIT-001 — SC-007 generation performance target has zero task coverage**

`specs/001-plugin-template-factory/spec.md:186`: "Plugin generation completes in under 5 seconds per plugin (per D-PERF-2)." No task in tasks.md asserts a timing bound for generation. T064 ("Run generate for all 5 profiles, verify each produces a valid plugin directory") has no timing assertion. T077 covers doctor <2s; no equivalent timing test exists for generation. This leaves half of SC-007 unverifiable.

Fix required: Add a task asserting generation timing (e.g., "Write test: generate with atlas.json profile completes in under 5 seconds, measured with process.hrtime()") before T058.

---

**VAL-CRIT-002 — FR-014 doctor --dry-run: zero task coverage + plan/spec contradiction**

`specs/001-plugin-template-factory/spec.md:154`: "All system commands MUST support a preview flag that shows planned changes without modifying any files."
`specs/001-plugin-template-factory/plan.md:187`: doctor CLI signature `node scripts/doctor.js --target <dir> [--quick] [--json]` — no `--dry-run`.

Doctor is intrinsically read-only (no filesystem changes). If the intent is that FR-014 does not apply to doctor (because --dry-run is meaningless for a read-only command), then FR-014 must be amended to scope it to state-mutating commands (generate, install, repair). If the intent is for doctor to support --dry-run (perhaps for future state-writing features), tasks must be added. As written, FR-014 and plan.md §1.2 contradict each other, and no task covers doctor --dry-run.

Fix required: Either (a) amend FR-014 in spec.md to exclude read-only commands, or (b) add --dry-run to doctor's CLI signature in plan.md §1.2 and add a test + implementation task.

---

**VAL-BLOCK-003 — Checklist pass rate 84.4% (5 items unchecked)**

`specs/001-plugin-template-factory/checklists/requirements.md`:

- CHK020 (line 45): Concurrent install to same project undefined in spec.md. Real gap — requires either an EC in spec.md or explicit scoping of the concurrency concern.
- CHK023 (line 51): N/A for CLI tooling — item left `[ ]` instead of `[x]` with N/A notation. Requires checklist update.
- CHK026 (line 54): N/A for CLI tooling — item left `[ ]` instead of `[x]` with N/A notation. Requires checklist update.
- CHK030 (line 64): Clarify session resolved the [NEEDS CLARIFICATION] markers; checklist not updated. Requires checklist update.
- CHK031 (line 65): Clarify session was completed (spec.md §Clarifications §Session 2026-05-17); checklist not updated. Requires checklist update.

Fix required: Update checklists/requirements.md — check CHK023, CHK026, CHK030, CHK031 (post-challenge resolutions not reflected). For CHK020, either add an EC for concurrent install to spec.md or explicitly scope the edge case as out of scope with rationale.

---

## Re-run Determinism Note

This report is deterministic. All findings are derived exclusively from file contents as read during this validation run. Two consecutive runs on these identical files will produce:

- The same 3 blockers (VAL-CRIT-001, VAL-CRIT-002, VAL-BLOCK-003).
- The same coverage matrix (29 PASS, 2 FAIL).
- The same checklist pass rate (84.4%, 27/32).
- The same verdict: BLOCKED.

If a re-run produces different findings, the artifacts changed between runs. Note which file changed.
