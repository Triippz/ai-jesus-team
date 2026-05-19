---
name: spec-driven-development
description: Author a granular, unambiguous spec/PRD that leaves zero room for interpretation, with built-in validation and adversarial review. Rigid multi-phase workflow.
---

# Spec-Driven Development Skill

A rigid multi-phase workflow for producing a granular, unambiguous spec/PRD that an unfamiliar agent can implement without further interpretation. Built from a faithful synthesis of seven primary sources on Spec-Driven Development; full citations live in `docs/research/spec-driven-development-research.md`.

This skill **does not replace** `/brainstorm` → `/write-plan` → `/tdd` → `/execute-plan`. It is an opt-in heavier-weight entry point for engineering work where misinterpretation by an implementing agent would be expensive. Use the decision tree in `references/sdd-decision-tree.md` to decide whether SDD applies.

## The Iron Laws

1. **The engineer is in the hot seat.** This skill produces artifacts the engineer reviews, edits, and approves. The agent assists with mechanics, never authors unilaterally.
2. **Specs are evidence-driven.** Vague adjectives without adjacent quantification fail Article II of the project constitution. Claims must cite sources.
3. **Tests precede implementation.** Article I (NON-NEGOTIABLE). Tasks.md without test tasks for behaviour-changing implementations fails the validator.
4. **CRITICAL findings hard-fail.** Article III. The implementation phase will not start while a CRITICAL finding from the validator or challenger is unresolved.
5. **Each P1 user story is independently shippable.** If you implement only US1, you must still ship a viable MVP that delivers the value the spec promises.
6. **Deterministic by default.** Importers copy verbatim; amenders produce engineer-approved change-sets; specifiers consult the defaults catalog rather than guessing. Two runs against the same input must produce byte-identical artifacts. The agent does not invent priorities, IDs, Independent Tests, or defaults outside `docs/spec/defaults.md`.

## When to Use This Skill (Quick Decision)

Use `/spec` when ≥2 of these are true:
- The feature crosses ≥2 plugins (e.g., frontend + backend; Rust SDK + Flutter app).
- The feature has ≥3 distinct user stories or persona interactions.
- The feature touches a contract or protocol other systems depend on.
- A misinterpretation by the implementing agent would cost > 30 minutes to repair.
- Multiple agents will work on parts in parallel.
- A non-engineer stakeholder must review before code is written.

Skip `/spec` and use `/brainstorm` → `/write-plan` when work is exploratory, mechanically simple, throwaway, or bug-fix-with-an-existing-failing-test. See `references/sdd-decision-tree.md` for the full criteria.

## The Workflow

```
0a. Constitution     (one-time per project)        docs/spec/constitution.md
0b. Defaults Catalog (one-time per project)        docs/spec/defaults.md
1.  Specify          — write the WHAT             [or  Import / Amend, see below]
2.  Clarify          — resolve ambiguity, ≤5 high-impact questions
3.  Plan             — write the HOW
4.  Tasks            — granular, story-grouped, TDD-ordered, parallel-marked
5.  Challenge        — adversarial review by spec-challenger agent (anti-sycophancy)
6.  Validate         — structural review by spec-validator agent (deterministic)
7.  Implement        — hand off to /execute-plan, which reads tasks.md
```

Two alternate entry points to Phase 1, both deterministic:

- **`/spec import <source>`** — bring an existing PRD, plan, JIRA epic, or Confluence page into the SDD workflow. Verbatim mapping per `templates/import-mapping.md`. Anything not mapped goes to `imported/source-excerpts.md` flagged `[UNMAPPED]`. After import, run `/spec specify --use-defaults` (apply defaults catalog) and `/spec clarify` (resolve `[NEEDS CLARIFICATION]` markers).
- **`/spec amend <existing-spec-dir> <change-description>`** — propose changes to an existing spec. Produces `change-set.md` listing every proposed edit; the engineer marks each ACCEPTED / REJECTED before any artifact is written. Apply with `/spec amend --apply <change-set.md>`.

Phases run in order. Skipping ahead requires the engineer's explicit recorded justification.

## Process

### Phase 0a — Constitution (one-time per project)

**Skip if** `docs/spec/constitution.md` already exists and the engineer accepts its current state.

**If not**, copy `templates/constitution-template.md` to `docs/spec/constitution.md` and walk the engineer through filling it. Articles I, II, III are required by this repo and may not be removed; the engineer adds project-specific articles (Simplicity, Anti-Abstraction, Integration-First, Observability, Library-First, etc.) as the codebase warrants.

Persist the chosen articles, gates, and amendment policy. The constitution is rarely re-edited; subsequent specs inherit it without further interaction.

### Phase 0b — Defaults Catalog (one-time per project)

**Skip if** `docs/spec/defaults.md` already exists and the engineer accepts its current state.

**If not**, copy `templates/defaults-catalog-template.md` to `docs/spec/defaults.md` and walk the engineer through filling each section (Authentication, Storage, Performance, Observability, Security, Data Handling, Testing, Resilience, I18N, A11Y, Project-Specific). Each default has an ID (e.g., `D-AUTH-1`).

The catalog is the **only** place the agent is allowed to apply project-wide defaults. Anything not in the catalog → `[NEEDS CLARIFICATION]` rather than a silent agent assumption. Adding a default is an engineer edit; the agent never extends the catalog itself.

When the catalog still contains placeholder bullets (lines wrapped in `[Default …]` brackets), the agent treats those as not-yet-defined and flags any spec field that would have used them.

### Phase 1 — Specify (the WHAT)

The deterministic specifier. The agent populates the spec template from explicit inputs only: (a) the engineer's natural-language description, (b) the project defaults catalog (`docs/spec/defaults.md`). Every field that neither input fills is marked `[NEEDS CLARIFICATION]` — the agent does NOT invent answers.

1. Read the engineer's natural-language description (`$ARGUMENTS`).
2. Read `docs/spec/defaults.md`. If it does not exist or contains only template placeholders, log a single warning and proceed with no defaults available (every field that would have used a default is flagged).
3. Generate a 2–4 word slug (action-noun preferred): `oauth2-api-integration`, `analytics-dashboard`, `fix-payment-timeout`. Slug derivation is deterministic: extract noun phrases and verbs from the engineer's description in source order, lowercase, hyphenate.
4. Determine the next sequential feature number (`NNN`) by scanning `specs/`. If `specs/` does not exist, create it. The directory is `specs/<NNN>-<slug>/`.
5. Copy `templates/spec-template.md` into `specs/<NNN>-<slug>/spec.md` and populate each section per these rules:
   - **User Scenarios & Testing.** For every actor/action pair the engineer's description states, write one User Story. Priority is set to `P? [NEEDS CLARIFICATION: priority not specified by engineer]` unless the engineer's description used the words P1/P2/P3 or "MVP" / "must-have" / "nice-to-have". Why-this-priority is `[NEEDS CLARIFICATION]` whenever priority is unclarified. Independent Test is `[NEEDS CLARIFICATION: not specified; engineer must define]` — never invented. Acceptance Scenarios are written only for behaviour the engineer explicitly described; the agent does not extrapolate.
   - **Functional Requirements.** One FR-NNN per atomic capability the engineer's description states. Verbatim where the engineer's description provides a quantifiable statement; `[NEEDS CLARIFICATION]` for any quantifier the engineer did not provide and the defaults catalog does not supply. The agent cites the catalog ID in `## Defaults Applied` whenever a default is used (e.g., "FR-007 quantification per D-PERF-1").
   - **Success Criteria.** Same pattern as FRs. Catalog defaults supply non-functional baselines (D-PERF-*, D-OBS-*) when the engineer's description doesn't provide them.
   - **Edge Cases.** The agent enumerates the categories (zero-state, boundary, concurrency, failure, malicious-input) for every state-mutating flow but writes only those edge cases the engineer's description named. Categories with no engineer-supplied content get `[NEEDS CLARIFICATION: <category> edge case for <flow> not described]`.
   - **Key Entities.** Only entities the engineer named. No invention.
   - **Assumptions.** Only assumptions the engineer stated, plus a `## Defaults Applied` subsection listing every catalog entry the agent applied (with ID).
   - **Out of Scope.** Only items the engineer stated. No invention.
   - **Dependencies.** Only dependencies the engineer named, plus their failure modes if stated.
6. There is **no 3-marker budget** in this version of the skill. The agent flags every gap. (Spec-Kit's budget assumed the agent would silently fill in defaults; we don't.)
7. Generate `specs/<NNN>-<slug>/checklists/requirements.md` from `templates/checklist-template.md` automatically.
8. Run the auto-validation pass against the checklist:
   - For each item, mark pass/fail; quote spec text for failures.
   - The validator is read-only here — it doesn't modify the spec, just reports.
9. Report to the engineer:
   - Path to `spec.md`.
   - Path to `checklists/requirements.md`.
   - Number of `[NEEDS CLARIFICATION]` markers (no budget; engineer works through them in `/spec clarify` in batches of 5).
   - Defaults applied (count + IDs).
   - Recommended next phase: always Clarify if any `[NEEDS CLARIFICATION]` remains; otherwise Plan.

**`--use-defaults` flag.** When invoked as `/spec specify --use-defaults`, the specifier runs Phase 1 against an *existing* spec (typically just imported) and applies catalog defaults to fields that are currently `[NEEDS CLARIFICATION]` but match a catalog ID. Each application is logged in `## Defaults Applied`.

### Phase 2 — Clarify

1. Load `prompts/clarify-taxonomy.md` and follow it.
2. Run a structured ambiguity scan across the 10 categories. Mark each as Clear / Partial / Missing internally.
3. Generate a prioritised queue of ≤5 candidate questions, ranked by Impact × Uncertainty (impact priority: scope > security/privacy > UX > technical details).
4. Present **one question at a time** with a **Recommended** option labelled and reasoning, formatted as a markdown table for multiple-choice or a `Suggested:` line for short-answer.
5. After each accepted answer, immediately update `spec.md`:
   - Append to `## Clarifications / ### Session YYYY-MM-DD` the bullet `- Q: <question> → A: <final answer>`.
   - Apply the answer to the most appropriate downstream section (FR, US, Edge Cases, etc.).
   - Save atomically.
6. Stop when: all critical ambiguities are resolved, or the engineer says "done", or 5 questions have been asked.
7. Report: questions asked, sections touched, coverage summary table per category, recommended next phase.

### Phase 3 — Plan (the HOW)

1. Read `spec.md` and `docs/spec/constitution.md`.
2. Copy `templates/plan-template.md` to `specs/<NNN>-<slug>/plan.md`.
3. Fill **Technical Context** (Language/Version, Primary Dependencies, Storage, Testing, Target Platform, Project Type, Performance Goals, Constraints, Scale/Scope). Mark unknowns as `NEEDS CLARIFICATION` and list them as Phase 0 research tasks.
4. Fill **Constitution Check**. Each gate is a checkbox. Failed gates require a Complexity Tracking entry — concrete reason, simpler alternative rejected because.
5. Fill **Project Structure** with the *real* directory tree the work will touch.
6. **Phase 0 — Research:** for each NEEDS CLARIFICATION, each new dependency, and each integration, dispatch a research task. Output to `research.md` only if the engineer wants it persisted. Format: Decision / Rationale / Alternatives considered.
7. **Phase 1 — Design & Contracts:** describe data model and interface contracts in plan.md prose. Optional artifacts (`data-model.md`, `contracts/`, `quickstart.md`) only on engineer request.
8. Fill **Cross-Cutting Concerns**: Observability (log fields, metric names, trace spans), Security (trust boundary, authn/authz, secrets), Failure Modes (retries, backoff, graceful degradation, data integrity).
9. Re-evaluate the Constitution Check after design.
10. Report: path to plan.md, gate pass/fail summary, optional artifacts created.

### Phase 4 — Tasks

1. Read `spec.md` (user stories with priorities) and `plan.md` (tech stack, structure).
2. Copy `templates/tasks-template.md` to `specs/<NNN>-<slug>/tasks.md`.
3. Generate tasks organised by user story:
   - **Phase 1 — Setup** (project initialisation, no story label).
   - **Phase 2 — Foundational** (blocking prerequisites; no user story can begin until this phase is done; no story label).
   - **Phase 3+ — One phase per user story** in priority order P1 → P2 → P3.
   - **Final Phase — Polish & Cross-Cutting Concerns**.
4. Within each user story phase, **test tasks come first** (Constitution Article I). Format every task as:
   ```
   - [ ] T### [P?] [USn?] Description with concrete file path
   ```
5. Each user story phase ends with a **Checkpoint** statement that names the Independent Test from spec.md.
6. Validate: every FR and every Acceptance Scenario has at least one task; every task has a concrete file path; every implementation task is preceded by a test task for the same behaviour.
7. Report: total task count, count per story, parallel opportunities (tasks marked `[P]`), MVP scope (typically just User Story 1).

### Phase 5 — Challenge

1. Dispatch the `spec-challenger` agent. Provide it the spec, plan, tasks, constitution, and any active plugin guidance.
2. The agent runs all 8 required passes and writes `specs/<NNN>-<slug>/challenges.md`.
3. The engineer reviews each finding and disposes of it: ACCEPTED (with commit hash showing the spec/plan/tasks update) or REJECTED (with rationale that addresses the cited evidence).
4. Re-run the challenger if any finding's evidence was not addressed by the disposition.
5. Stop when: no open CRITICAL findings AND no open HIGH findings AND every disposition has either an updated spec or a recorded rationale.

### Phase 6 — Validate

1. Dispatch the `spec-validator` agent. It reads spec, plan, tasks, constitution, checklists.
2. The agent runs all 7 required passes and writes `specs/<NNN>-<slug>/validation-report.md`.
3. Verdict is deterministic:
   - **READY** if zero CRITICAL, 100% coverage, 100% checklist pass, every gate passes (or has Complexity Tracking).
   - **BLOCKED** otherwise. Engineer fixes blockers; re-run validator.
4. Stop when: verdict = READY.

### Phase 7 — Implement (handoff)

1. Tell the engineer: spec is ready. Run `/execute-plan` to begin implementation. The executor reads `tasks.md` and runs `/tdd` per task.
2. The spec is **anchored**: when implementation diverges from spec during `/execute-plan`, the engineer updates the spec, then runs `/spec validate` again. Code is not regenerated from spec.

## Skill Invocation Modes

The skill accepts a sub-phase via the engineer's call:

| Invocation | Phase | Effect |
|------------|-------|--------|
| `/spec "<feature description>"` | 0a/0b/1 | Initialise constitution + defaults catalog if missing; then Phase 1 Specify. |
| `/spec specify --use-defaults` | 1 | Re-apply the defaults catalog to an existing spec; useful immediately after `/spec import`. |
| `/spec import <source>` | 1 (alternate) | Deterministic verbatim import per `prompts/import-protocol.md`. `<source>` is a file path, directory, JIRA epic key, or Confluence URL. |
| `/spec import --reconcile` | 1 (alternate) | Re-apply the source-side diff against an existing imported spec; engineer approves the diff. |
| `/spec amend <spec-dir> <change-description>` | 1 (brownfield) | Generate `change-set.md` per `prompts/amend-protocol.md`. Read-only against artifacts. |
| `/spec amend --apply <change-set.md>` | 1 (brownfield) | Apply ACCEPTED rows from a disposed change-set. One commit per row. |
| `/spec clarify` | 2 | Resume at Phase 2 against existing `spec.md`. |
| `/spec plan` | 3 | Resume at Phase 3. |
| `/spec tasks` | 4 | Resume at Phase 4. |
| `/spec challenge` | 5 | Dispatch `spec-challenger`. |
| `/spec validate` | 6 | Dispatch `spec-validator`. |

Mode determination when sub-phase is omitted:
1. If `<source>` argument resolves to an existing file, directory, JIRA key, or URL → `import`.
2. If a positional argument is the path to an existing `specs/<NNN>-<slug>/` AND a change description follows → `amend`.
3. Otherwise scan `specs/<NNN>-<slug>/` for the highest-completed phase artifact; resume from the next phase.
4. If `specs/` is empty → start at Phase 0a / 0b / 1.

## Hard Rules

- The skill MUST NOT modify any file outside `specs/<NNN>-<slug>/`, `docs/spec/constitution.md` (Phase 0a only), `docs/spec/defaults.md` (Phase 0b only), and `docs/research/` (only when the engineer authorises external research).
- The skill MUST NOT skip phases without the engineer's explicit recorded approval.
- The skill MUST stop and report when the validator returns BLOCKED.
- The skill MUST refuse to mark a phase complete unless the gate for that phase passes.
- The skill MUST NOT invent priorities, IDs, Independent Tests, or defaults outside `docs/spec/defaults.md`. Every gap is flagged `[NEEDS CLARIFICATION]`.
- `/spec amend` MUST NOT modify any artifact in the generation pass; only the explicit `--apply` step writes, and only ACCEPTED rows.
- `/spec import` MUST be byte-deterministic: two runs against the same source content hash produce identical artifacts (modulo the `Imported:` timestamp line).

## Files Produced

Default minimum (4 files per spec):

```
specs/<NNN>-<slug>/
├── spec.md
├── plan.md
├── tasks.md
└── checklists/
    └── requirements.md
```

Plus:

```
specs/<NNN>-<slug>/
├── challenges.md             ← after Phase 5
└── validation-report.md      ← after Phase 6
```

Optional (engineer requests):

```
specs/<NNN>-<slug>/
├── data-model.md
├── contracts/
│   └── *.yaml
├── research.md
└── quickstart.md
```

## References

- `references/sdd-decision-tree.md` — when to use vs. skip SDD; brownfield via `/spec amend`.
- `references/research-summary.md` — pointer to the full research synthesis.
- `prompts/clarify-taxonomy.md` — Phase 2 question protocol.
- `prompts/import-protocol.md` — `/spec import` deterministic mapping protocol.
- `prompts/amend-protocol.md` — `/spec amend` deterministic change-set protocol.
- `prompts/challenge-protocol.md` — Phase 5 adversarial review protocol.
- `prompts/validation-protocol.md` — Phase 6 deterministic validation protocol.
- `templates/constitution-template.md` — project non-negotiables (Phase 0a).
- `templates/defaults-catalog-template.md` — project defaults the specifier may apply (Phase 0b).
- `templates/spec-template.md`, `plan-template.md`, `tasks-template.md`, `checklist-template.md`, `challenges-template.md`, `validation-report-template.md` — feature artifacts.
- `templates/import-mapping.md` — heading-to-section mapping rules for import.
- `templates/change-set-template.md` — change-set format for amend.
- `docs/research/spec-driven-development-research.md` — full research synthesis with citations.
- `docs/research/spec-driven-development-design.md` — design decisions for this skill.

## Verification Checklist (skill-internal)

After completing each phase, confirm:

- [ ] All artifacts for the phase are written to `specs/<NNN>-<slug>/`.
- [ ] Phase gate is met (the gate-condition listed in the phase definition).
- [ ] Engineer has been asked to review and either approves or specifies the next action.
- [ ] No file outside the allowed write paths was modified.
