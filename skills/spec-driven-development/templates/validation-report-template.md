# Validation Report: [FEATURE NAME]

**Validator:** spec-validator agent (read-only)
**Generated:** [YYYY-MM-DD HH:MM]
**Spec version:** [git ref or commit hash]
**Constitution:** `docs/spec/constitution.md` v[X.Y.Z]

> Read-only structural review. The validator does not propose substantive changes; it reports whether the spec is structurally complete and consistent enough to advance to implementation.

---

## Verdict

**[READY / BLOCKED]**

- READY: zero open CRITICAL findings; 100% requirement → task coverage; checklist pass rate = 100%; constitution gates all pass.
- BLOCKED: list each blocker below with file:line.

---

## Coverage Matrix

Every functional requirement (FR-NNN) and success criterion (SC-NNN) maps to ≥1 task. Items with zero coverage are CRITICAL.

| Requirement | Title | Mapped Task IDs | Status |
|-------------|-------|------------------|--------|
| FR-001 | [Brief] | T010, T012 | ✅ |
| FR-002 | [Brief] | T011 | ✅ |
| FR-003 | [Brief] | — | ❌ CRITICAL: zero task coverage |
| SC-001 | [Brief] | (validation tasks; e.g., load test in T030) | ✅ |
| SC-002 | [Brief] | — | ❌ CRITICAL: zero task coverage |

---

## Unmapped Tasks

Tasks with no clear mapping to an FR, SC, or user story. Validator does not delete; engineer reviews.

| Task ID | Description | Likely Phase | Action |
|---------|-------------|--------------|--------|
| T999 | [task] | Polish | OK to keep as cross-cutting; document rationale |

---

## Constitution Alignment

| Gate | Article | Result | Citation |
|------|---------|--------|----------|
| Test-First | I | ✅ | tasks.md: tests T007–T009 precede implementation T010–T014 for US1 |
| Evidence-Driven | II | ❌ | spec.md §FR-002 contains "fast" without quantification |
| CRITICAL-Resolved | III | (n/a until challenger output is in) | challenges.md not present |
| Independent-MVP | IV | ✅ | All P1 stories have non-empty Independent Test |
| Simplicity | V | ✅ | Single-package structure used |
| Anti-Abstraction | VI | ✅ | No new abstractions introduced |
| Integration-First | VII | ✅ | Contract test T007 precedes implementation T011 |
| Observability | VIII | ❌ | plan.md §1.3 missing metric names for FR-004 |

---

## Cross-Artifact Inconsistencies

| ID | Type | Location(s) | Details | Severity |
|----|------|-------------|---------|----------|
| X1 | Terminology drift | spec.md §FR-003 vs. plan.md §Storage | "album" vs "collection" | MEDIUM |
| X2 | Conflicting tech | plan.md §Technical Context vs. tasks.md T015 | plan says SQLite; T015 references PostgreSQL | HIGH |
| X3 | Path validity | tasks.md T011 | Path `src/services/photos.rs` does not exist and is not created in any earlier task | HIGH |

---

## Checklist Pass Rate

`specs/<NNN>/checklists/requirements.md` items: [total / passed / failed]

Failed items (with quoted spec excerpt):

- CHK005: "Is every vague adjective replaced by an adjacent quantification?" — `spec.md §FR-002`: *"System MUST be fast under load."* No adjacent quantification.
- CHK022: "Are performance targets quantified for all user-facing flows?" — Missing for User Story 2.

---

## Phase-Order Validation

For each `[USn]` story, every test task ID precedes the implementation task ID for the same behaviour.

| Story | Test Tasks | Implementation Tasks | Order Valid? |
|-------|------------|---------------------|---------------|
| US1 | T007, T008, T009 | T010, T011, T012, T013, T014 | ✅ |
| US2 | T015, T016 | T017, T018 | ✅ |

---

## Path Validity

Every file path mentioned in tasks.md either (a) exists in the repo at validator runtime, or (b) is the output of an earlier task in tasks.md.

| Task ID | Path | Status |
|---------|------|--------|
| T010 | crates/feature-x/src/domain/photo.rs | (created by this task) ✅ |
| T011 | src/services/photos.rs | ❌ HIGH: parent dir does not exist; no creating task |

---

## Open Blockers (when verdict = BLOCKED)

1. [Blocker 1: e.g., FR-003 has zero task coverage; add tasks under Phase 3 / US1.]
2. [Blocker 2: e.g., plan.md §Observability missing metric names; update plan.md §1.3.]
3. […]

---

## Re-run Determinism Note

This validator is deterministic: re-running it on an unchanged set of artifacts produces identical IDs and counts. If a re-run produces different findings, the artifacts changed.
