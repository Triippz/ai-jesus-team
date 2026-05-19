# Spec-Driven Development — Design for the `/spec` Command

**Created:** 2026-05-02
**Inputs:** `docs/research/spec-driven-development-research.md`
**Status:** Implementation guide for the dev-ai-utilities core-superpowers plugin

This document specifies the `/spec` command, the `spec-driven-development` skill, the two new agents (`spec-challenger`, `spec-validator`), and the templates that produce a granular, unambiguous software spec/PRD. It is the resolution of the open questions raised in §7 of the research synthesis.

The five existing workflow commands (`/brainstorm`, `/write-plan`, `/tdd`, `/execute-plan`, `/review`, `/verify`, `/finish`, `/mr`, `/resolve-reviews`, `/plan-to-jira`, `/update-jira`) are **not** modified. `/spec` adds a parallel, opt-in entry point for engineering work that benefits from spec-driven discipline.

---

## 1. Decisions (resolves research §7 open questions)

| # | Question | Decision | Rationale |
|---|---------|----------|-----------|
| 1 | Where does the constitution live? | Two-tier: a project-level constitution at `docs/spec/constitution.md` (authored once, edited rarely) inherits and extends plugin-level guidance from `plugins/<active>/CLAUDE.md`. Per-feature specs may add feature-only articles in their own `spec.md` under a `## Constitution Addenda` heading; they may not contradict the project constitution. | Matches the existing repo's plugin-first architecture; avoids duplicating project rules across every feature. |
| 2 | Does `/spec` replace `/write-plan`? | No. `/spec` produces `plan.md` (technical implementation plan) and `tasks.md` (story-grouped, TDD-ordered, granular tasks) inside `specs/<NNN-slug>/`. The engineer can then either (a) hand the spec to `/execute-plan` directly (it reads `tasks.md`), or (b) skip the SDD pipeline for small work and use `/brainstorm` → `/write-plan` as before. | Preserves the user's "do not replace existing commands" requirement while making the SDD output usable by the existing executor. |
| 3 | What does `spec-challenger` cite? | Authority order: (a) files in the repo (path:line); (b) git history and PR descriptions; (c) the project constitution and any linked plugin CLAUDE.md; (d) tests and CI artifacts; (e) the spec's own prior versions. The agent **must not** make claims without one of these sources, except for explicitly-marked logical reductio arguments ("If X then Y; Y contradicts FR-003"). External web sources are cited only when the engineer has explicitly authorised research, and even then must be quoted with a URL. | Deterministic, auditable pushback. No "trust me, this is best practice." |
| 4 | Cross-plugin spec composition | When a feature crosses plugin boundaries, the engineer may either (a) author one combined spec under `specs/` with a `## Cross-Plugin Surfaces` section listing each affected plugin and its specific contractual obligations, or (b) author per-plugin specs that share a parent index. Default = (a) for ≤2 plugins; (b) for 3+. The constitutional gate inheritance is the union — every active plugin's MUST principles apply. | Avoids spec duplication while making cross-plugin obligations explicit. |
| 5 | MVP-per-story enforcement | Hard-fail. The validator must mark a P1 user story `INCOMPLETE` if its *Independent Test* checkbox is not specific (e.g., "Can be fully tested by [specific action] and delivers [specific value]"). The implement phase refuses to proceed past P1 if MVP independence is not demonstrable. | Spec-Kit's strongest empirical contribution; we adopt verbatim. |

---

## 2. The /spec workflow

```
                                                               (returns)
        ┌─────────────────────────────────────────────────────────────────┐
        │                                                                 │
        ▼                                                                 │
  ┌──────────┐   ┌──────────┐   ┌─────────────┐   ┌────────┐   ┌──────────────┐
  │ /spec    │ → │ specify  │ → │ clarify     │ → │ plan   │ → │ tasks        │
  │ (opt-in) │   │ (the     │   │ (≤5 high-   │   │ (the   │   │ (granular,   │
  │          │   │ WHAT)    │   │ impact Q's) │   │ HOW)   │   │ TDD-ordered) │
  └──────────┘   └──────────┘   └─────────────┘   └────────┘   └──────┬───────┘
                                                                      │
                                                                      ▼
                              ┌────────────────────────────────┬──────────────────┐
                              │ challenge                       │ validate         │
                              │ (spec-challenger agent —        │ (spec-validator  │
                              │  blunt, evidence-cited          │  agent — checks  │
                              │  pushback)                      │  unit-tests-for- │
                              │                                 │  English pass)   │
                              └────────────────┬────────────────┴────────┬─────────┘
                                               │ engineer accepts        │ all CRITICAL
                                               │ or rejects each finding │ resolved?
                                               ▼                         ▼
                                        ┌──────────────────────────────────┐
                                        │  Spec ready for implementation   │
                                        │  → /execute-plan reads tasks.md  │
                                        │    and runs /tdd per task        │
                                        └──────────────────────────────────┘
```

### 2.1 Phase order is mandatory

The skill is **rigid**: phases run in order; nothing skips ahead unless the engineer explicitly requests it with a recorded justification. This mirrors the existing `tdd` and `executing-plans` skills' discipline.

### 2.2 Phase definitions

| Phase | Inputs | Process | Outputs | Gate to advance |
|-------|--------|---------|---------|-----------------|
| 0. Constitution | (one-time per project) | Engineer authors `docs/spec/constitution.md` declaring principles, non-negotiables, and architectural articles. | `docs/spec/constitution.md` | File exists with all template placeholders replaced. |
| 1. Specify | Engineer's natural-language description | Skill reads description, generates short-name and `specs/<NNN-slug>/spec.md` from `templates/spec-template.md`, then asks ≤3 critical [NEEDS CLARIFICATION] questions only when *no reasonable default exists*. | `specs/<NNN-slug>/spec.md`; `specs/<NNN-slug>/checklists/requirements.md` (auto-generated) | Spec passes the auto-generated requirements checklist; ≤3 [NEEDS CLARIFICATION] markers remain. |
| 2. Clarify | spec.md | Skill runs taxonomy-driven ambiguity scan across 10 categories (functional/data/UX/NFR/integration/edge/constraints/terminology/completion/misc) and asks **at most 5** high-impact questions, one at a time, with a *Recommended* option labelled. Each answer is integrated immediately into the spec under a `## Clarifications / ### Session YYYY-MM-DD` heading and the relevant downstream section. | Updated `spec.md` with `## Clarifications` section. | All Partial/Missing categories with high impact are Resolved or explicitly Deferred with rationale. |
| 3. Plan | spec.md, constitution | Skill writes `specs/<NNN-slug>/plan.md` from `templates/plan-template.md`. Includes Constitution Check (gates pass/fail with Complexity Tracking justifications), Technical Context (language/version, dependencies, storage, testing, target platform, performance goals, constraints), and Project Structure decision. Optional artifacts (`data-model.md`, `contracts/`, `research.md`, `quickstart.md`) only when the engineer asks for them. | `specs/<NNN-slug>/plan.md` (+ optional artifacts) | All Constitution gates pass OR have Complexity Tracking entries with rejected-alternative analysis. |
| 4. Tasks | spec.md, plan.md | Skill writes `specs/<NNN-slug>/tasks.md` from `templates/tasks-template.md`. Tasks are organised by user story (P1 → P2 → P3), each with mandatory checkpoint "User Story N is fully functional and testable independently." Tasks use `- [ ] T### [P?] [USn?] description with file path` format. **Test tasks are mandatory** (we override Spec-Kit's "tests optional" default — TDD is a constitution article in this repo). | `specs/<NNN-slug>/tasks.md` | Every functional requirement and every user-story acceptance scenario has at least one task; every task with file path references a path that either exists or is created in an earlier task. |
| 5. Challenge | spec.md, plan.md, tasks.md | The `spec-challenger` agent runs an adversarial review with explicit anti-sycophancy instructions. It produces a findings report with severity grading (CRITICAL/HIGH/MEDIUM/LOW) and **must cite evidence** for each finding (file:line, git ref, RFC, contradiction within the spec, or explicit reductio). The engineer accepts or rejects each finding; rejections require recorded rationale. | `specs/<NNN-slug>/challenges.md` | All CRITICAL findings either resolved (spec/plan/tasks updated) or explicitly rejected with engineer's recorded rationale. |
| 6. Validate | All artifacts | The `spec-validator` agent runs the cross-artifact consistency analysis (read-only) and the requirements quality checklist (`unit tests for English`). It produces a structured report with severity-graded findings and a coverage matrix mapping every requirement → tasks. | `specs/<NNN-slug>/checklists/requirements.md` (updated) and a validation report | Zero CRITICAL findings; 100% requirement → task coverage; all checklist items pass. |
| 7. Implement | tasks.md | Hands off to existing `/execute-plan` which reads `tasks.md` and runs `/tdd` per task. | (existing repo workflow) | (existing) |

### 2.3 Skip-SDD decision criteria

The skill body explicitly tells engineers when *not* to use it. Adopted verbatim from `[Augment]`:

> Skip `/spec` and use `/brainstorm` → `/write-plan` instead when:
> - Work is exploratory or experimental
> - A single prompt can produce usable output
> - Output can be reviewed in under five minutes
> - Change is mechanical or low-risk
> - Prototype is meant to be thrown away
>
> **Decision trigger:** "If I'd be annoyed to have the agent interpret requirements differently than I meant, I write the spec. If I could fix the output in a quick follow-up prompt, I skip the spec and prompt directly."

---

## 3. File structure

### 3.1 Repo additions (this PR)

```
commands/
  spec.md                                        ← thin wrapper, invokes skill

skills/
  spec-driven-development/
    SKILL.md                                     ← rigid, multi-phase process
    references/
      research-summary.md                        ← short pointer back to docs/research/
      sdd-decision-tree.md                       ← when to use vs. skip
    templates/
      constitution-template.md                   ← project-level non-negotiables
      spec-template.md                           ← feature WHAT (user stories, FR, SC, edge cases, assumptions)
      plan-template.md                           ← feature HOW (technical context + constitution gates + structure)
      tasks-template.md                          ← granular tasks grouped by user story, TDD-ordered
      checklist-template.md                      ← unit-tests-for-English template
      challenges-template.md                     ← findings-report template (used by spec-challenger)
      validation-report-template.md              ← findings-report template (used by spec-validator)
    prompts/
      clarify-taxonomy.md                        ← 10-category ambiguity taxonomy + clarify Q rules
      challenge-protocol.md                      ← adversarial review protocol (anti-sycophancy)
      validation-protocol.md                     ← cross-artifact consistency rules

agents/
  spec-challenger.md                             ← adversarial reviewer
  spec-validator.md                              ← consistency + checklist validator

docs/
  research/
    spec-driven-development-research.md          ← (already created)
    spec-driven-development-design.md            ← (this file)
  spec/                                          ← created on first /spec run
    constitution.md                              ← (template stub on first run)
```

### 3.2 Generated per feature (under `specs/`)

```
specs/
  <NNN>-<slug>/                                  ← e.g., 003-photo-albums
    spec.md                                      ← phase 1 output
    plan.md                                      ← phase 3 output
    tasks.md                                     ← phase 4 output
    challenges.md                                ← phase 5 output
    checklists/
      requirements.md                            ← unit-tests-for-English (auto-generated phase 1; updated phases 2/6)
      <domain>.md                                ← optional per-domain checklists (security.md, ux.md, performance.md, …)
    data-model.md                                ← optional (phase 3, on request)
    contracts/                                   ← optional (phase 3, on request)
    research.md                                  ← optional (phase 3, on request)
    quickstart.md                                ← optional (phase 3, on request)
    validation-report.md                         ← phase 6 output
```

**Default file count per spec: 4** (spec.md, plan.md, tasks.md, checklists/requirements.md). Optional artifacts are off by default — this directly addresses Fowler's review-burden complaint.

---

## 4. Templates — section-by-section spec

### 4.1 `constitution-template.md`

Required sections:

- **Purpose** — one paragraph stating what this codebase is and what kinds of features it ships.
- **Articles (numbered)** — each article is a non-negotiable principle written as MUST/SHOULD/MAY (RFC 2119 style). Three articles are *required* by default in this repo:
  - **Article I — TDD is mandatory.** No production code without a failing test first. (Mirrors existing `tdd` skill.)
  - **Article II — Specs are evidence-driven.** Claims about requirements, behaviour, or constraints must cite an authoritative source. No vague adjectives without quantification.
  - **Article III — Hard-fail on CRITICAL findings.** A spec cannot proceed to implementation while any CRITICAL finding from the validator or challenger is unresolved.
  - Additional articles authored by the engineer (Simplicity, Anti-Abstraction, Integration-First, Observability, Library-First, etc. — Spec-Kit-style).
- **Gates** — each gate is a checklist item with explicit pass criteria. The plan template's "Constitution Check" section enumerates these and forces a pass/fail decision per gate.
- **Amendment process** — short paragraph stating how the constitution itself is changed (PR + reviewer approval; not via spec generation).
- **Version + Ratified date + Last amended.**

### 4.2 `spec-template.md` (feature WHAT)

Required sections (`*(mandatory)*` items mirror `[SpecKit]` exactly because they have proven structural value):

- **Header:** Feature Name, Branch slug, Created date, Status (Draft/Clarifying/Planning/Ready/In-Implementation), Input (the engineer's original prompt).
- **User Scenarios & Testing** *(mandatory)* — prioritised P1/P2/P3, each with: Brief title, Why-this-priority, **Independent Test** statement (specific action + value delivered), **Acceptance Scenarios** in Given/When/Then form. *Hard rule:* if you implement only User Story 1, you ship a viable MVP.
- **Edge Cases** — explicit list of boundary, error, and concurrency scenarios.
- **Functional Requirements** *(mandatory)* — `FR-NNN` IDs; every FR is testable and unambiguous; vague adjectives are explicitly forbidden.
- **Key Entities** — only when feature involves data; describes domain entities without implementation language.
- **Success Criteria** *(mandatory)* — `SC-NNN` IDs; every SC is **measurable** (specific metric), **technology-agnostic** (no frameworks/dbs/languages), **user-focused**, and **verifiable**.
- **Assumptions** — reasonable defaults the spec author chose; flagged for engineer review.
- **Constitution Addenda** *(optional)* — feature-only principles that don't contradict the project constitution.
- **Cross-Plugin Surfaces** *(optional)* — listed only when the feature crosses plugin boundaries.

### 4.3 `plan-template.md` (feature HOW)

Required sections:

- **Header:** Feature, Branch, Date, Spec link.
- **Summary** — one paragraph: primary requirement + technical approach.
- **Technical Context** — Language/Version, Primary Dependencies, Storage, Testing framework, Target Platform, Project Type, Performance Goals, Constraints, Scale/Scope. Unknowns are marked `NEEDS CLARIFICATION` and resolved via Phase 0 research.
- **Constitution Check** — a checkbox per gate from the constitution; failed gates *must* have a Complexity Tracking entry (see below).
- **Project Structure** — chosen layout (single project / web / mobile / library / cli) with the *real* directory paths the work will touch.
- **Phase 0 — Research** — for each `NEEDS CLARIFICATION`, a research task; for each dependency, a best-practices task; for each integration, a patterns task. Output: `research.md` with Decision/Rationale/Alternatives-considered triples.
- **Phase 1 — Design & Contracts** — entities → `data-model.md`, interface contracts → `/contracts/`. (Both files optional; created only when the feature has external interfaces or significant data shape.)
- **Complexity Tracking** *(required only on gate failure)* — table with Violation / Why Needed / Simpler Alternative Rejected Because.

### 4.4 `tasks-template.md`

Identical in spirit to Spec-Kit's tasks template, with three deviations:

1. **Tests are mandatory, not optional.** This is enforced by the constitution's Article I.
2. The `[Story]` label is the user story the task belongs to; tasks not in a story are Setup, Foundational, or Polish phase.
3. Task IDs are sequential `T001`, `T002`, …; `[P]` markers indicate parallelisable tasks (different files, no inter-task dependencies). The skill rejects tasks that don't include a file path.

Required phases:

- **Phase 1 — Setup (shared infrastructure).**
- **Phase 2 — Foundational (blocking prerequisites — must complete before any user story).**
- **Phase 3+ — One phase per user story in priority order.** Each story phase ends with a Checkpoint statement that names the independent test the engineer can run to verify the story is done.
- **Final Phase — Polish & cross-cutting concerns.**

### 4.5 `checklist-template.md` (unit tests for English)

Quoted verbatim from `[SpecKit]/templates/commands/checklist.md` — this is the single most valuable pattern. Categories are: Requirement Completeness, Requirement Clarity, Requirement Consistency, Acceptance Criteria Quality, Scenario Coverage, Edge Case Coverage, Non-Functional Requirements, Dependencies & Assumptions, Ambiguities & Conflicts.

Each item:
- Is phrased as a **question about the spec**, not a verification action.
- Tests requirement quality, not implementation behaviour.
- Includes a quality dimension tag in brackets: `[Completeness]`, `[Clarity]`, `[Consistency]`, `[Coverage]`, `[Measurability]`, `[Edge Case]`, `[Gap]`, `[Ambiguity]`, `[Conflict]`, `[Assumption]`.
- ≥80% of items must include a traceability reference: `[Spec §FR-003]`, `[Spec §SC-002]`, etc.

### 4.6 `challenges-template.md`

The output of the `spec-challenger` agent. Required structure:

```markdown
# Spec Challenge Report: <feature>

**Reviewer:** spec-challenger agent
**Generated:** <date>
**Spec version:** <git ref or hash>

## Summary
- CRITICAL findings: N
- HIGH: N  | MEDIUM: N  | LOW: N

## Findings

| ID | Severity | Category | Location | Evidence | Recommendation | Engineer disposition |
|----|----------|----------|----------|----------|----------------|---------------------|
| C1 | CRITICAL | Constitution-violation | spec.md §FR-007 | constitution.md Article III line 22 conflicts with FR-007's "best-effort retry"; no Complexity Tracking entry exists | Add Complexity Tracking entry justifying best-effort retry, OR revise FR-007 to comply | _(engineer fills in: accepted/rejected with rationale)_ |
| H1 | HIGH | Untestable-acceptance | spec.md §AS-2 (US1) | "system feels responsive" — no measurable threshold (Augment Code SDD guide: "Vague adjectives without quantification fail the testable-and-unambiguous gate.") | Replace with `p95 latency ≤ 150ms under N concurrent users, measured via [tool]` | |
```

The agent **must** fill in the Evidence column for every finding. Empty Evidence is itself a CRITICAL.

### 4.7 `validation-report-template.md`

The output of the `spec-validator` agent. Required sections:

- **Coverage Matrix** — every FR-### and SC-### → which T### tasks cover it.
- **Unmapped tasks** — tasks not tied to an FR/SC/user story.
- **Constitution Alignment** — per-gate pass/fail with citation.
- **Cross-artifact Inconsistencies** — terminology drift, contradicting tech choices, ordering violations.
- **Checklist Pass Rate** — `requirements.md` items: total, passed, failed; failed items quoted.
- **Verdict** — `READY` (zero CRITICAL) or `BLOCKED` (list each blocker).

---

## 5. Agent specifications

### 5.1 `spec-challenger`

**Role.** Adversarial reviewer. Counterweight to the cooperative-by-default LLM behaviour the user has explicitly flagged as undesirable.

**Anti-sycophancy mandate (verbatim in agent body):**

> You are blunt, evidence-driven, and not deferential. You do not say "great spec!" or "this looks good." You report findings. If the spec has zero defensible flaws, you say "no findings; spec passes adversarial review" and explain *why* — citing what you checked. Disagreement is the default; agreement requires evidence.

**Authority order for citations** (decision §1, Q3):
1. Files in this repo (give `path:line` references when quoting).
2. Git history / PR descriptions (`git log --oneline path/to/file`).
3. The project constitution and any active plugin's `CLAUDE.md` / `AGENTS.md`.
4. Tests and CI artifacts (paths to test files; failures observed).
5. The spec's own prior versions (diff against the spec at the start of the phase).
6. *Reductio* — explicit logical contradiction between two parts of the spec; both quoted.
7. External web sources — only when the engineer has authorised research; quoted with URL.

Findings without an authority-ordered citation are themselves CRITICAL findings against the challenger and the agent must self-correct.

**Required passes** (run all):
- Vague-adjective scan: every spec sentence containing one of {fast, slow, scalable, robust, secure, intuitive, simple, lightweight, modern, efficient} without an adjacent quantification.
- Contradiction scan: cross-section pairs (e.g., FR-003 says X, SC-002 implies not-X).
- Constitution-violation scan: each project constitution article vs. spec/plan/tasks.
- Speculative-feature scan: requirements not traceable to a user story.
- Test-coverage scan: each FR → at least one task with a test in tasks.md.
- Edge-case completeness: empty/zero/error/concurrency cases for every primary flow.
- Independent-test integrity: every P1 user story must have a *concrete* "if we ship only this, here is the value delivered" statement; otherwise the spec fails MVP independence.
- Cross-plugin contract scan: when `## Cross-Plugin Surfaces` is present, every named plugin must have explicit obligations listed.

**Output.** `specs/<NNN-slug>/challenges.md` filled from `challenges-template.md`. Severity grading is non-negotiable: a vague NFR is HIGH, a contradiction is HIGH, an FR with zero task coverage is CRITICAL, a constitution violation is CRITICAL.

**Failure mode.** If the agent finds itself softening language ("this might be a small issue", "perhaps consider"), it stops and rewrites with concrete severity + concrete recommendation.

### 5.2 `spec-validator`

**Role.** Cross-artifact consistency + checklist gate enforcement. **Read-only.**

Distinct from `spec-challenger` because:
- Challenger runs an adversarial *substantive* review; validator runs a deterministic *structural* review.
- Challenger can recommend spec changes; validator only reports findings and verdict.
- Validator's outputs feed the implementation gate; challenger's outputs feed the engineer's review.

**Required passes:**
- Coverage matrix: every FR-/SC- ↔ tasks.md.
- Constitution gate per article.
- Checklist pass: every `requirements.md` item must be checked off with the engineer's initial.
- Terminology drift: same concept named differently across spec/plan/tasks.
- Path validity: every file path in tasks.md either exists or is the output of an earlier task.
- Phase ordering: tests precede implementations of the same FR.

**Verdict.** Either `READY` (proceeds to `/execute-plan`) or `BLOCKED` (list each blocker with file:line).

---

## 6. Command file (thin wrapper)

`commands/spec.md` follows the existing pattern:

```markdown
---
description: "Author a granular, unambiguous spec for a complex feature using spec-driven development"
disable-model-invocation: true
---

Invoke the core-superpowers:spec-driven-development skill and follow it exactly as presented to you.
```

---

## 7. Catalog updates

The following existing files need a single-row addition each:

- `skills/using-superpowers/SKILL.md` — add `Spec-Driven Development | /spec | When a feature is complex enough that interpretation drift would be expensive | Rigid` to the Skill Catalog table.
- `skills/CLAUDE.md` — add the equivalent row.
- `commands/CLAUDE.md` — add `/spec | spec.md | core-superpowers:spec-driven-development`.
- `agents/CLAUDE.md` (if present; otherwise `agents/AGENTS.md` per existing convention) — add `spec-challenger` and `spec-validator` rows.

These are the only modifications to existing artifacts. No existing skill, command, agent, or hook is altered.

---

## 8. Test plan

Following this repo's `tdd` discipline:

1. **JSON validation** — `find . -name "*.json" -not -path "./.claude/*" -exec python3 -m json.tool {} \;` continues to pass after additions (no new JSON in this PR).
2. **Markdown lint** (if configured) — new markdown files are valid.
3. **Skill invocation smoke** — `Skill('spec-driven-development')` loads without error after PR.
4. **Command frontmatter** — `commands/spec.md` follows the `disable-model-invocation: true` convention.
5. **Existing bats suite** — `make test` continues to pass; existing tests do not test command/skill content semantically, so no regression risk.
6. **Manual end-to-end** — invoke `/spec "Build a per-team rate-limited API gateway"` against a scratch directory and confirm the four artifacts (`spec.md`, `plan.md`, `tasks.md`, `checklists/requirements.md`) are produced and `spec-validator` returns READY only when the engineer fills the clarifications.

---

## 9. Sequencing

The implementation order is:

1. Templates (constitution, spec, plan, tasks, checklist, challenges, validation-report).
2. Agent files (`spec-challenger.md`, `spec-validator.md`).
3. Skill (`skills/spec-driven-development/SKILL.md`) — references templates and agents.
4. Supporting prompts under `skills/spec-driven-development/prompts/`.
5. Command (`commands/spec.md`).
6. Catalog updates (using-superpowers, CLAUDE.md files).
7. README link.

---

## Addendum (2026-05-02) — Deterministic-everything refinement

After the initial design landed, the engineer requested a single decision: *all SDD operations on engineer artifacts must be deterministic.* No silent agent assumptions; verbatim copy beats paraphrase; engineer-approved change-sets beat in-place rewrites; project defaults live in a versioned catalog the engineer maintains. This addendum records the resulting additions.

### A.1 New phases

- **Phase 0b — Defaults Catalog.** Engineer-authored `docs/spec/defaults.md` (template at `skills/spec-driven-development/templates/defaults-catalog-template.md`). Defines every project-wide default the agent is allowed to apply, with stable IDs (`D-AUTH-1`, `D-PERF-1`, …). Anything not in the catalog → `[NEEDS CLARIFICATION]` rather than a silent assumption.

### A.2 Phase 1 Specify — tightened

- The agent no longer makes "informed guesses" or applies "reasonable defaults" silently. It applies catalog entries (citing the ID in `## Defaults Applied`) or flags `[NEEDS CLARIFICATION]`.
- The 3-marker budget is removed. Markers accumulate and are worked through `/spec clarify` in batches of 5.
- User-story Independent Tests and priorities are NEVER agent-assigned; they are engineer inputs or `[NEEDS CLARIFICATION]`.

### A.3 New mode — `/spec import <source>`

- Brings an existing PRD, plan file, JIRA epic, or Confluence page into the SDD workflow. Verbatim mapping per `skills/spec-driven-development/templates/import-mapping.md`.
- Source format detection by extension/path/URL; supports markdown files, directories, JIRA epic keys, and Confluence URLs (last two require Atlassian MCP).
- Determinism contract: same source content hash → byte-identical artifacts (modulo timestamp).
- Output structure adds `imported/source-original/` (audit copy), `imported/source-manifest.md` (mapping table + hashes), `imported/source-excerpts.md` (UNMAPPED sections).
- `--reconcile` flag re-applies only the source-side diff against an existing imported spec; engineer approves before re-import.

### A.4 New mode — `/spec amend <spec-dir> <change-description>`

- Generation pass: read existing artifacts, parse change description against deterministic verb taxonomy (ADD / MODIFY / REMOVE / RENAME / SPLIT / MERGE / [UNPARSED]), produce `change-set.md` listing every proposed edit with confidence (HIGH/MEDIUM/LOW). Read-only — no artifact is modified.
- Apply pass: `/spec amend --apply <change-set.md>` writes only ACCEPTED rows. One git commit per row. Refuses to apply derived (cascade) rows whose parent is not also ACCEPTED. Verifies the source spec hash before applying — refuses if artifacts changed since change-set generation.
- Validator pre-check: simulates the proposed artifacts in memory, runs `spec-validator`, reports predicted verdict shift. Regressions require `--allow-regression`.
- No automatic rollback. Failed validation after apply is reported; engineer uses `git revert` if desired.

### A.5 Files added

- `skills/spec-driven-development/templates/defaults-catalog-template.md`
- `skills/spec-driven-development/templates/import-mapping.md`
- `skills/spec-driven-development/templates/change-set-template.md`
- `skills/spec-driven-development/prompts/import-protocol.md`
- `skills/spec-driven-development/prompts/amend-protocol.md`

### A.6 Files modified

- `skills/spec-driven-development/SKILL.md` — added Iron Law #6 (Deterministic by default), Phase 0b, tightened Phase 1, new Skill Invocation Modes table, expanded Hard Rules, expanded References list.
- `skills/spec-driven-development/templates/spec-template.md` — removed "informed guesses" / "≤3 marker budget" language; added `### Defaults Applied` and `### Defaults Overridden` subsections under Assumptions.
- `skills/spec-driven-development/references/sdd-decision-tree.md` — replaced single-paragraph brownfield section with explicit `/spec import` + `/spec amend` guidance.
- `README.md` — described the three deterministic entry modes.

### A.7 Determinism test (manual)

Verification recipe for the deterministic guarantees:

1. `/spec import docs/plans/2026-04-12-foo-plan.md` — note the SHA-256s recorded in `imported/source-manifest.md` for each produced artifact.
2. Delete the produced `specs/<NNN>-<slug>/` directory.
3. Re-run the same import. Compare hashes — must match (modulo the `Imported:` timestamp line).
4. For amend: generate a change-set; record SHA-256 of `change-set.md` minus its timestamp line. Re-run amend with the same description; the hash must match.

Failure of either is a bug to file.
