# Tasks: [FEATURE NAME]

**Feature Branch:** `[NNN-feature-slug]`
**Inputs:** spec.md (user stories with priorities), plan.md (tech stack, structure), constitution
**Optional inputs:** data-model.md, contracts/, research.md, quickstart.md

> **Constitution Article I (NON-NEGOTIABLE):** Tests are not optional. Every behaviour-changing implementation task is preceded by a test task that exercises it. Any tasks.md without test tasks fails spec-validator.

---

## Format Rules (REQUIRED)

Every task MUST follow this format:

```
- [ ] [TaskID] [P?] [Story?] Description with concrete file path
```

Components:

1. **Checkbox:** `- [ ]` (markdown checkbox; tooling marks as `- [x]` on completion).
2. **Task ID:** Sequential `T001`, `T002`, … in execution order.
3. **`[P]` marker:** Include only if the task can run in parallel with other tasks (different files; no dependency on incomplete tasks).
4. **`[USn]` label:** REQUIRED for user-story phase tasks (`[US1]`, `[US2]`, …); NOT used for Setup, Foundational, or Polish phases.
5. **Description:** Imperative verb + concrete file path.

Examples:

- ✅ `- [ ] T001 Initialise Rust workspace member crates/feature-x/`
- ✅ `- [ ] T005 [P] Write contract test for POST /v2/photos in tests/contract/photos_post.rs`
- ✅ `- [ ] T012 [P] [US1] Define Photo entity in crates/feature-x/src/domain/photo.rs`
- ❌ `- [ ] Create photo model` (missing ID + path)
- ❌ `T001 [US1] Make photos work` (missing checkbox + path; vague description)

---

## Phase 1 — Setup (Shared Infrastructure)

Project initialisation, dependency installation, lint/format configuration. No story label.

- [ ] T001 [Concrete first setup task with file path]
- [ ] T002 [P] [Concrete second setup task with file path]
- [ ] T003 [P] [Concrete third setup task with file path]

---

## Phase 2 — Foundational (Blocking Prerequisites)

Cross-cutting infrastructure that every user story depends on. **No user-story work begins until this phase is complete.** No story label.

- [ ] T004 [Foundational task — e.g., schema migrations, base entities, auth middleware skeleton]
- [ ] T005 [P] [Foundational task]
- [ ] T006 [Foundational task]

**Checkpoint:** Foundation is ready. User-story phases can now run in parallel.

---

## Phase 3 — User Story 1 — [Title] (Priority: P1) 🎯 MVP

**Goal:** [What this story delivers, restated from spec.md.]
**Independent Test:** [Restated from spec.md User Story 1 Independent Test field.]

### Tests for User Story 1 (write FIRST, ensure they FAIL)

> Constitution Article I: these MUST exist as separate tasks and MUST be checked off (passing in their initial failing state) before the corresponding implementation tasks begin.

- [ ] T007 [P] [US1] Contract test for [endpoint or interface] in [tests/contract/...]
- [ ] T008 [P] [US1] Integration test for [user journey] in [tests/integration/...]
- [ ] T009 [P] [US1] Unit tests for [domain rule] in [tests/unit/...]

### Implementation for User Story 1

- [ ] T010 [P] [US1] Create [Entity/Type] in [src/...]
- [ ] T011 [US1] Implement [Service / Handler / Bloc] in [src/...] (depends on T010)
- [ ] T012 [US1] Wire [endpoint / route / event] in [src/...]
- [ ] T013 [US1] Add validation + error mapping in [src/...]
- [ ] T014 [US1] Emit observability fields/metrics declared in plan.md §1.3 in [src/...]

**Checkpoint:** User Story 1 is fully functional and testable independently. The Independent Test from spec.md must succeed end-to-end at this point.

---

## Phase 4 — User Story 2 — [Title] (Priority: P2)

**Goal:** […]
**Independent Test:** […]

### Tests for User Story 2 (write FIRST, ensure they FAIL)

- [ ] T015 [P] [US2] [Test task] in [tests/...]
- [ ] T016 [P] [US2] [Test task] in [tests/...]

### Implementation for User Story 2

- [ ] T017 [P] [US2] [Implementation task] in [src/...]
- [ ] T018 [US2] [Implementation task] in [src/...]

**Checkpoint:** User Stories 1 and 2 both work independently.

---

## Phase 5 — User Story 3 — [Title] (Priority: P3)

[Same structure as Phase 4. Repeat per user story.]

---

## Final Phase — Polish & Cross-Cutting Concerns

- [ ] TXXX [P] Documentation updates in [docs/...]
- [ ] TXXX Performance hardening per plan.md §Performance Goals
- [ ] TXXX Security hardening per plan.md §Security
- [ ] TXXX Run quickstart.md walkthrough end-to-end (if quickstart was authored)
- [ ] TXXX Code cleanup and refactor per /tdd Refactor phase

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (1)** has no dependencies; runs first.
- **Foundational (2)** depends on Setup; blocks all user-story phases.
- **User Stories (3+)** all depend on Foundational; can run in parallel between stories.
- **Polish (Final)** depends on all desired user stories.

### Within a User Story

- Tests precede implementation tasks for the same behaviour. Constitution Article I; spec-validator enforces this.
- Domain entities precede services; services precede endpoints/handlers.
- Observability is added before the story's Checkpoint passes.

### Parallel Opportunities

- Tasks marked `[P]` within the same phase can run concurrently.
- User stories without inter-story dependencies can run concurrently after Foundational completes.
- Different stories assigned to different worktrees / agents can proceed independently.

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Setup (Phase 1).
2. Complete Foundational (Phase 2) — blocks all stories.
3. Complete User Story 1 (Phase 3).
4. **Stop and validate:** run the Independent Test from spec.md.
5. Demo / deploy if ready.

### Incremental Delivery

1. Setup + Foundational → Foundation ready.
2. User Story 1 → independent test → demo (MVP).
3. User Story 2 → independent test → demo.
4. User Story 3 → independent test → demo.
5. Each story adds value without breaking previous stories.

### Parallel Team / Agent Strategy

After Foundational completes, separate agents can pick up separate user-story phases in worktrees. Each story is independently mergeable.

---

## Notes

- `[P]` tasks operate on different files with no dependencies on incomplete tasks.
- `[Story]` label maps the task to spec.md user-story IDs for traceability.
- Avoid: vague tasks; same-file conflicts in parallel sets; cross-story dependencies that break independent testability.
- Mark each task `- [x]` only after its acceptance has been verified (test passes for test tasks; tests for the corresponding behaviour pass for implementation tasks).
- Stop at any Checkpoint to validate before continuing.
