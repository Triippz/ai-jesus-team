# Spec-Driven Development — Research Synthesis

**Created:** 2026-05-02
**Author:** dev-ai-utilities core team
**Purpose:** Faithful collation of seven primary sources on Spec-Driven Development (SDD), used as the design basis for the `/spec` command, the `spec-driven-development` skill, and supporting agents in this repository.

This document is a *research synthesis*, not a tutorial. Every claim is cited to a specific source with the author's wording preserved where useful. The synthesis is the input to the design document at `docs/research/spec-driven-development-design.md` and the implementation rooted at `commands/spec.md` + `skills/spec-driven-development/`.

---

## 1. Sources

| # | Source | Citation key | Provenance |
|---|--------|--------------|-------------|
| S1 | *What Is Spec-Driven Development?* — Augment Code Guides | `[Augment]` | `https://www.augmentcode.com/guides/what-is-spec-driven-development` (fetched 2026-05-02) |
| S2 | **github/spec-kit** — open-source GitHub toolkit | `[SpecKit]` | `https://github.com/github/spec-kit` cloned shallow via `gh repo clone github/spec-kit` (commit on `main`, fetched 2026-05-02). All quotes are from the local clone in `/tmp/sdd-research/spec-kit/` (`spec-driven.md`, `templates/*`, `templates/commands/*`). |
| S3 | *Understanding Spec-Driven-Development* — Martin Fowler / Birgitta Böckeler, *Exploring Gen AI* | `[Fowler]` | `https://martinfowler.com/articles/exploring-gen-ai/sdd-3-tools.html` (fetched 2026-05-02). Part of the *Exploring Gen AI* series; preceded by *Anchoring AI to a reference application* and followed by *Assessing internal quality while coding with an agent*. |
| S4 | *Using Spec-Driven Development with Claude Code* — Heeki Park (Medium) | `[Heeki]` | `https://heeki.medium.com/using-spec-driven-development-with-claude-code-4a1ebe5d9f29` (fetched 2026-05-02). |
| S5 | *How Spec-Driven Development Improves AI Coding Quality* — Rich Naszcyniec, Red Hat Developers | `[RedHat]` | `https://developers.redhat.com/articles/2025/10/22/how-spec-driven-development-improves-ai-coding-quality` (fetched 2026-05-02). |
| S6 | *Spec-Driven Development: From Code to Contract in the Age of AI Coding Assistants* — Deepak Babu Piskala, arXiv:2602.00180 (Jan 30 2026, AIWare 2026 submission) | `[Piskala26]` | `https://arxiv.org/abs/2602.00180` and `https://arxiv.org/pdf/2602.00180` (PDF fetched 2026-05-02). |
| S7a | *A Practical Guide to Spec-Driven Development* — Zencoder Docs | `[Zencoder-Docs]` | `https://docs.zencoder.ai/user-guides/tutorials/spec-driven-development-guide` (fetched via search summary on 2026-05-02; direct fetch returned 403 — synthesis is from Zencoder's own search snippets and the supporting blog posts S7b/S7c). |
| S7b | *Spec-Driven Development (SDD): The AI Engineering Method AI Needed* — Zencoder Blog | `[Zencoder-Blog1]` | `https://zencoder.ai/blog/spec-driven-development-sdd-the-engineering-method-ai-needed` (fetched 2026-05-02). |
| S7c | *Spec-Driven Development: Everything You Need to Know [2026]* — Zencoder Blog | `[Zencoder-Blog2]` | `https://zencoder.ai/blog/spec-driven-development` (fetched 2026-05-02). |

> **Provenance note on Zencoder.** The user-provided URL (`docs.zencoder.ai/.../spec-driven-development-guide`) returned HTTP 403 to direct fetch. The synthesis below uses (a) Zencoder's own search-result page summary of that URL, and (b) the two adjacent canonical Zencoder blog posts (S7b, S7c) that re-state the same workflow. Where a claim is unique to S7a we mark it `[Zencoder-Docs, via search summary]` so reviewers know it should be re-validated against the live page.

---

## 2. Common ground across sources

Despite different vocabularies, all seven sources converge on the same skeleton.

### 2.1 The thesis: invert the hierarchy

| Source | Phrasing |
|--------|----------|
| `[SpecKit]` | "Spec-Driven Development **flips the script** on traditional software development. For decades, code has been king — specifications were just scaffolding we built and discarded once the 'real work' of coding began. Spec-Driven Development changes this: **specifications become executable**, directly generating working implementations rather than just guiding them." (`README.md`) |
| `[SpecKit]` | "Specifications don't serve code—code serves specifications. The Product Requirements Document (PRD) isn't a guide for implementation; it's the source that generates implementation. Technical plans aren't documents that inform coding; they're precise definitions that produce code." (`spec-driven.md` §"The Power Inversion") |
| `[Augment]` | "Spec-driven development (SDD) turns specifications from passive documentation into executable contracts that constrain what AI agents generate." |
| `[Piskala26]` | "Spec-driven development (SDD) inverts the traditional workflow by treating specifications as the source of truth and code as a generated or verified secondary artifact." (Abstract, arXiv:2602.00180.) |
| `[Fowler]` | "Spec-driven development means writing a 'spec' before writing code with AI ('documentation first'). The spec becomes the source of truth for the human and the AI." |
| `[Zencoder-Blog2]` | "Specification as Authority": "the specification becomes the source of truth"; "Code is a regenerable artifact, not a sacred asset." |
| `[RedHat]` | "Humans define the 'what' (functional goals) and the 'how' (rules like standards, architecture, and best practices), while the AI handles the heavy lifting." |

**Synthesis.** All sources agree that the *spec* is promoted from secondary documentation to the primary, version-controlled artifact that constrains AI generation. Code becomes a regenerable downstream output. This is not a marginal improvement to PRD writing; it is a re-ordering of authority in the development workflow.

### 2.2 The artifact set

Every source produces — at minimum — three layered artifacts: a *what* document, a *how* document, and a *do-this* task list. Several sources add a fourth, project-level "principles" or "constitution" document that survives across features.

| Layer | `[SpecKit]` filename | `[Zencoder]` term | `[Augment]` term | `[RedHat]` term | `[Heeki]` term |
|-------|----------------------|--------------------|--------------------|------------------|------------------|
| Project principles | `memory/constitution.md` (§"Constitutional Foundation") | (n/a explicitly named, but "specification as authority" implies same role) | "AGENTS.md persistent project context" | functional + language-agnostic specs | "CLAUDE.md steering document" |
| Feature spec (WHAT) | `specs/[NNN-slug]/spec.md` | "Requirements" (user story, edge cases, success criteria) | "Outcomes + scope boundaries + constraints + prior decisions" (six-element framework) | "Functional specs (the what)" | "Initial project prompt defining phases" |
| Implementation plan (HOW) | `specs/[NNN-slug]/plan.md` (+ `data-model.md`, `contracts/`, `research.md`, `quickstart.md`) | "Technical Specification" (architecture, data flows, impacted files) | "Verification plans + task breakdown" | "Language-agnostic 'how' specs + language-specific specs" | "phase breakdown with testing objectives" |
| Tasks (DO-THIS) | `specs/[NNN-slug]/tasks.md` (per-user-story, parallel-marked) | "Implementation Plan" (RED/GREEN/VERIFY loops, ordered steps) | "sub-task breakdowns with isolated contexts" | "Code generation prompt execution" | "Stack 1–N implementation phases" |
| Quality / validation | `specs/[NNN-slug]/checklists/*.md` ("unit tests for English") | "verification embedded in plan" | "Verifier agent" | "AI handles initial reviews… humans take the spotlight for validation" | "clarifying questions + course-correct" |

`[Piskala26]` formalises the artifact set as a *Specification Spectrum* across three rigor levels — `[Fowler]` uses the same spectrum, attributing it to Birgitta Böckeler:

1. **Spec-first** — "well thought-out spec is written first, then used in the AI-assisted development workflow."
2. **Spec-anchored** — "spec is kept even after the task is complete, for evolution and maintenance."
3. **Spec-as-source** — "spec is the main source file over time" (humans only edit specs; code is regenerated).

### 2.3 The ordered workflow

Every source describes the same five-phase pipeline; only naming differs.

| Phase | `[SpecKit]` slash command | `[Zencoder-Blog1]` step | `[Augment]` step | `[RedHat]` phase | `[Heeki]` step |
|-------|-----------------------------|------------------------------|---------------------|--------------------|------------------|
| 0. Principles | `/speckit.constitution` | (implicit baseline) | "AGENTS.md persistent project context" | (implicit in "how" specs) | "CLAUDE.md steering" |
| 1. Specify | `/speckit.specify` | "agents draft requirements capturing user stories and success criteria for human confirmation" | "Specification Writing" + six-element framework | Phase 1 "Specification Composition" | "research + planning + spec drafting" |
| 2. Clarify | `/speckit.clarify` (≤5 high-impact questions) | "human confirmation" | "Coordinator Agent Decomposition" with clarifications | "Phase 6 Review, Refine, Remix" | "instruct Claude to ask clarifying questions… selectable inputs" |
| 3. Plan | `/speckit.plan` | "propose a technical specification detailing architecture and impacted files" | "Verification Plans + Constraints & Assumptions" | Phases 2–3 "language-agnostic + language-specific" | "implementation plan aligned with design" |
| 4. Tasks | `/speckit.tasks` | "create an implementation plan with exact steps, often using RED/GREEN/VERIFY loops" | "Task Breakdown — too much in one shot is a failure mode" | Phase 5 "code generation prompt execution" | "stepwise small testable chunks" |
| 5. Analyze | `/speckit.analyze` (cross-artifact consistency, read-only) | "review checkpoints pause runs for human approval" | "Verifier Validation against spec" | "AI validates compilation + unit tests pass" | "course correct + update spec" |
| 6. Implement | `/speckit.implement` (gated by checklist completion) | "humans approve before any code changes occur" | "CI/CD Enforcement — build fails on spec divergence" | "Phase 6 Review, Refine, Remix" | "stack-by-stack implementation" |

**Order is universal; nothing skips ahead.** `[SpecKit]/templates/commands/clarify.md` enforces this explicitly: "This clarification workflow is expected to run (and be completed) BEFORE invoking `__SPECKIT_COMMAND_PLAN__`. If the user explicitly states they are skipping clarification (e.g., exploratory spike), you may proceed, but must warn that downstream rework risk increases."

---

## 3. Mechanisms that make specs unambiguous

This is the heart of what we want to import. Each source contributes a mechanism for forcing specs to a level where AI cannot fill a gap with a plausible-but-wrong assumption.

### 3.1 Force explicit uncertainty markers

`[SpecKit]/spec-driven.md` §"Forcing Explicit Uncertainty Markers":

> "Both templates mandate the use of `[NEEDS CLARIFICATION]` markers… This prevents the common LLM behavior of making plausible but potentially incorrect assumptions. Instead of guessing that a 'login system' uses email/password authentication, the LLM must mark it as `[NEEDS CLARIFICATION: auth method not specified - email/password, SSO, OAuth?]`."

`[SpecKit]/templates/commands/specify.md` adds a *budget*:

> "Maximum 3 [NEEDS CLARIFICATION] markers total. Prioritize clarifications by impact: scope > security/privacy > user experience > technical details."

`[SpecKit]/templates/commands/clarify.md` enforces a separate ≤5-question interactive ambiguity scan with an explicit taxonomy: Functional Scope & Behavior, Domain & Data Model, Interaction & UX Flow, Non-Functional Quality Attributes, Integration & External Dependencies, Edge Cases & Failure Handling, Constraints & Tradeoffs, Terminology & Consistency, Completion Signals, Misc / Placeholders.

**Synthesis.** Two complementary devices: (a) inline markers that make the spec self-document its own gaps, and (b) an interactive bounded clarification phase that forces the engineer to resolve those markers before planning begins. Both are bounded (≤3 markers, ≤5 clarification questions) so the process terminates.

### 3.2 Checklists are "unit tests for English"

`[SpecKit]/templates/commands/checklist.md` introduces a concept worth quoting in full:

> "**CRITICAL CONCEPT**: Checklists are **UNIT TESTS FOR REQUIREMENTS WRITING** - they validate the quality, clarity, and completeness of requirements in a given domain.
>
> **NOT for verification/testing**:
> - ❌ NOT 'Verify the button clicks correctly'
> - ❌ NOT 'Test error handling works'
> - ❌ NOT 'Confirm the API returns 200'
> - ❌ NOT checking if code/implementation matches the spec
>
> **FOR requirements quality validation**:
> - ✅ 'Are visual hierarchy requirements defined for all card types?' (completeness)
> - ✅ 'Is "prominent display" quantified with specific sizing/positioning?' (clarity)
> - ✅ 'Are hover state requirements consistent across all interactive elements?' (consistency)
> - ✅ 'Are accessibility requirements defined for keyboard navigation?' (coverage)
> - ✅ 'Does the spec define what happens when logo image fails to load?' (edge cases)
>
> **Metaphor**: If your spec is code written in English, the checklist is its unit test suite. You're testing whether the requirements are well-written, complete, unambiguous, and ready for implementation - NOT whether the implementation works."

The checklist categories are: **Requirement Completeness, Requirement Clarity, Requirement Consistency, Acceptance Criteria Quality, Scenario Coverage, Edge Case Coverage, Non-Functional Requirements, Dependencies & Assumptions, Ambiguities & Conflicts.**

Each item must be traceable: ≥80% must include a reference of the form `[Spec §X.Y]` or one of the markers `[Gap]`, `[Ambiguity]`, `[Conflict]`, `[Assumption]`.

`[SpecKit]/templates/commands/specify.md` runs an automatic *Specification Quality Checklist* immediately after the initial spec is written, with these gates:

```
Content Quality:
- No implementation details (languages, frameworks, APIs)
- Focused on user value and business needs
- All mandatory sections completed

Requirement Completeness:
- No [NEEDS CLARIFICATION] markers remain
- Requirements are testable and unambiguous
- Success criteria are measurable
- Success criteria are technology-agnostic
- All acceptance scenarios are defined
- Edge cases are identified
- Scope is clearly bounded

Feature Readiness:
- All functional requirements have clear acceptance criteria
- User scenarios cover primary flows
- Feature meets measurable outcomes defined in Success Criteria
- No implementation details leak into specification
```

**Synthesis.** The "unit-tests-for-English" framing is the most actionable single idea in the whole literature. It gives engineers a concrete, mechanical way to validate that a spec is *implementable by an unfamiliar agent* — without requiring the engineer to predict what an agent might misinterpret. It maps cleanly to TDD discipline already in this repo's `tdd` skill.

### 3.3 Constitution / non-negotiable principles as enforcement gates

`[SpecKit]/spec-driven.md` §"The Constitutional Foundation":

> "At the heart of SDD lies a constitution—a set of immutable principles that govern how specifications become code. The constitution (`memory/constitution.md`) acts as the architectural DNA of the system."

Spec-Kit ships nine illustrative articles. The two most important for us:

> "**Article III: Test-First Imperative**: This is NON-NEGOTIABLE: All implementation MUST follow strict Test-Driven Development. No implementation code shall be written before:
> 1. Unit tests are written
> 2. Tests are validated and approved by the user
> 3. Tests are confirmed to FAIL (Red phase)"

> "**Article IX: Integration-First Testing**: Tests MUST use realistic environments: Prefer real databases over mocks; Use actual service instances over stubs; Contract tests mandatory before implementation."

Articles VII and VIII pair with each other to combat over-engineering:

> "**Section 7.3 Minimal Project Structure**: Maximum 3 projects for initial implementation; Additional projects require documented justification.
> **Section 8.1 Framework Trust**: Use framework features directly rather than wrapping them."

`[SpecKit]/templates/plan-template.md` operationalises these as **Phase -1 Pre-Implementation Gates**:

```
Simplicity Gate (Article VII):    Using ≤3 projects?  No future-proofing?
Anti-Abstraction Gate (Article VIII):  Using framework directly?  Single model representation?
Integration-First Gate (Article IX):   Contracts defined?  Contract tests written?
```

If a gate fails, the LLM cannot proceed without filing a "Complexity Tracking" justification.

`[Augment]` echoes this with its own framing:

> "Without specs, agents make assumptions and head in the wrong direction fast." It distinguishes three SDD patterns: **Spec-First**, **Spec-Anchored** (with constitutional constraints + audit trails), and **Spec-as-Source**.

`[Piskala26]` situates this in the literature on Design by Contract and ISO 26262 — i.e., the constitution is essentially a re-purposing of contract programming for AI generation.

**Synthesis.** Constitutional gates are the mechanism that prevents AI from "improving" the design by adding plausible-but-unrequested complexity. Every architectural decision must either pass the gates or be explicitly justified. In a distributed-systems context we already encode many of these as plugin-level rules; the SDD constitution is the per-feature place to encode project-wide invariants that shouldn't drift between LLMs or sessions.

### 3.4 Cross-artifact consistency analysis

`[SpecKit]/templates/commands/analyze.md` introduces a read-only consistency pass run after `tasks.md` is generated. It builds semantic models of the spec/plan/tasks and runs six detection passes:

| Pass | What it looks for |
|------|------------------|
| A. Duplication | Near-duplicate requirements; lower-quality phrasing for consolidation |
| B. Ambiguity | Vague adjectives (fast, scalable, secure, intuitive, robust) lacking measurable criteria; unresolved placeholders |
| C. Underspecification | Verbs without objects/measurable outcomes; tasks referencing undefined files |
| D. Constitution Alignment | Any requirement or plan element conflicting with a MUST principle |
| E. Coverage Gaps | Requirements with zero tasks; tasks with no mapped requirement; SC items with buildable work missing tasks |
| F. Inconsistency | Terminology drift; entities in plan not in spec; task ordering contradicting dependencies; conflicting tech choices |

Each finding is graded CRITICAL / HIGH / MEDIUM / LOW with the rule: *"Constitution conflicts are automatically CRITICAL and require adjustment of the spec, plan, or tasks—not dilution, reinterpretation, or silent ignoring of the principle."*

`[Augment]` describes the equivalent operation as a "Verifier Agent" with "opposing goals to implementors" and explains *why* it must be a separate agent: "Implementers are optimistic about their own output. A separate Verifier has a cleaner signal."

**Synthesis.** Consistency analysis is the spec-level analogue of static analysis. It needs to be (a) read-only, (b) deterministic so re-runs match, and (c) blunt about CRITICAL findings — not advisory. The "separate agent with opposing goals" framing is the single most important argument for *why* this is its own role.

### 3.5 Independent, testable user stories with priority

`[SpecKit]/templates/spec-template.md`:

> "User stories should be PRIORITIZED as user journeys ordered by importance. Each user story/journey must be INDEPENDENTLY TESTABLE — meaning if you implement just ONE of them, you should still have a viable MVP (Minimum Viable Product) that delivers value."

Each story includes: brief title + priority (P1/P2/P3), the journey in plain language, *Why this priority*, *Independent Test* (e.g., "Can be fully tested by [specific action] and delivers [specific value]"), and **Acceptance Scenarios** in Given/When/Then form.

This propagates into `tasks-template.md`, which organises the entire task list **by user story**, with each story phase bracketed by independent-test checkpoints:

```
Phase 1: Setup (Shared Infrastructure)
Phase 2: Foundational (Blocking Prerequisites)  ← "No user story work can begin until this phase is complete"
Phase 3: User Story 1 (Priority: P1) 🎯 MVP
   Tests for User Story 1 (write FIRST, ensure they FAIL)
   Implementation for User Story 1
   Checkpoint: User Story 1 should be fully functional and testable independently
Phase 4: User Story 2 (Priority: P2)
   …
Final Phase: Polish & Cross-Cutting Concerns
```

Tasks follow a strict format: `- [ ] [TaskID] [P?] [Story?] Description with file path` (e.g., `- [ ] T012 [P] [US1] Create User model in src/models/user.py`).

**Synthesis.** "Each story is independently shippable" is what makes the workflow work at scale. It (a) gives reviewers and product managers a clean unit to negotiate over, (b) lets parallel agents work without stepping on each other (the `[P]` markers), and (c) maps each story to a self-contained slice of implementation + tests + integration test, which is the smallest unit that meaningfully demonstrates "the spec is correct." Compare this to traditional WBS which decomposes by component — that approach creates cross-component tasks that can't be tested until weeks of work have landed. SDD's by-story decomposition is incremental delivery built into the spec.

### 3.6 Test-first ordering baked into the plan

`[SpecKit]/spec-driven.md` §"File Creation Order":

> "1. Create `contracts/` with API specifications
> 2. Create test files in order: contract → integration → e2e → unit
> 3. Create source files to make tests pass"

`[Zencoder-Blog1]` calls this **RED/GREEN/VERIFY**: tests and code changes bound together, "ensuring tests run before a step is marked complete."

`[RedHat]` Phase 3 ("Language-Specific Fine-Tuning"): "AI often resolves bugs on round two thanks to this" — referring to specifying testing frameworks and scopes up front.

`[Augment]` distinguishes the layers: "TDD drives interface design through red-green-refactor cycles at the unit level. I keep TDD for implementation verification and layer SDD on top for architectural constraints. Unit tests verify individual functions; they don't catch architectural violations, API contract drift, or security anti-patterns that emerge across service boundaries."

**Synthesis.** TDD is *not* replaced by SDD; it is *enclosed* by it. SDD provides the architectural and contract-level constraints; TDD provides the function-level red-green-refactor inside each task. This repo already has a strong `tdd` skill — the SDD work needs to *generate inputs* for it, not duplicate it.

### 3.7 Engineer-in-the-loop verification

`[SpecKit]/README.md` §"Get Started":

> "Crucially, your role isn't just to steer. It's to verify. At each phase, you reflect and refine."

`[Heeki]` makes this a permission-model design point:

> "Three-option approval system for each action: 1/ yes, 2/ yes and don't ask again for [this subset of actions], 3/ no. Initial stance: 'closely observing each action'. Evolution: 'I found myself auto-allowing writes to code files as I trusted the outputs more'. Never reached full automation: 'I still haven't gotten to the point of going full YOLO mode with the --dangerously-skip-permissions flag'."

`[Zencoder-Blog1]`:

> "The gains only show up when humans review and refine each artifact" — through reality checks, prioritization decisions, and accountability. The spec becomes "a contract" guiding execution oversight.

`[Augment]` closes the loop:

> "Implementers are optimistic about their own output. A separate Verifier has a cleaner signal."

**Synthesis.** Reviewer loops at the artifact level (spec, plan, tasks) plus a separate verifier *agent* at the output level. The engineer is never displaced — they are the appellate court for every CRITICAL finding.

---

## 4. Where the sources disagree

### 4.1 How heavyweight should the workflow be?

`[Fowler]` is the most skeptical. Reviewing Spec-Kit on real projects, she writes:

> "Spec-kit created a LOT of markdown files… very verbose and tedious to review. I'd rather review code than all these markdown files."
> "Even with all of these files and templates and prompts and workflows and checklists, I frequently saw the agent ultimately not follow all the instructions."

She also flags scope mismatch:

> "The workflow was like using a sledgehammer to crack a nut" (Kiro applied to a small bug); "spec-kit similarly overkill for 3-5 point features."

`[Augment]` agrees and provides explicit triggers for *not* using SDD:

> "Skip specs when: Work is exploratory or experimental; A single prompt can produce usable output; Output can be reviewed in under five minutes; Change is mechanical or low-risk; Prototype is meant to be thrown away."
> "Decision Trigger: If I'd be annoyed to have the agent interpret requirements differently than I meant, I write the spec. If I could fix the output in a quick follow-up prompt, I skip the spec and prompt directly."

`[RedHat]` and `[Zencoder]` both lean toward "SDD for everything" but they are advocacy pieces published by tool vendors. `[Heeki]` is somewhere in the middle — he wrote the spec for a real project but later reflected that he became "spec-once" rather than "spec-anchored", because he forgot to maintain it.

**Implication for our design.** The `/spec` command should be *opt-in* and target real, non-trivial work — not a replacement for `/brainstorm` for small tasks. The repo's existing flexible vs. rigid distinction ("Skill Types" in `using-superpowers/SKILL.md`) is the right place to make this explicit.

### 4.2 Does the spec generate code, or does code stay primary?

`[SpecKit]` and `[Piskala26]` aspire to *spec-as-source* (humans only edit specs; code regenerates). Tessl (per `[Fowler]`) is the only tool actually attempting it, and even there:

> "Tessl currently supports a 1:1 mapping between spec and code files… still in private beta… demonstrates non-determinism even at low abstraction levels."

`[Augment]` explicitly recommends *against* spec-as-source for most teams:

> "Three Core SDD Patterns: Spec-First (specs guide/constrain; code is primary deliverable); Spec-Anchored (specs govern with checkpoints; constitutional constraints; audit trails required); Spec-as-Source (specs become literal source code — least recommended per ThoughtWorks)."

`[Fowler]` is more measured:

> "Just because the windows are larger, doesn't mean that AI will properly pick up on everything that's in there."

**Implication for our design.** Target **Spec-First with Spec-Anchored discipline** — the spec is authoritative for new work and must be updated when implementation diverges; we do not require regeneration from spec. This matches the "spec-anchored" terminology and is what `[Augment]` actually recommends.

### 4.3 Is empirical evidence available?

`[RedHat]` claims "95% or higher accuracy in implementing specs on the first go, with code that's error-free and unit tested" but presents no measurements.

`[Augment]` cites real numbers:

> "LLMs generate vulnerable code at rates ranging from 9.8% to 42.1% across benchmarks (Yan et al., 2025)… surviving AI-introduced issues in production repositories had topped 110,000 by February 2026."
> "MSR '26 study of Cursor AI found transient velocity gains alongside persistent code complexity increases."

`[Piskala26]` is a position paper (8 pages, 3 figures, AIWare 2026) and reports comparative analysis — not a controlled study.

**Implication.** Treat aspirational productivity numbers with skepticism. The defensible argument for SDD in this repo is *quality and review burden*, not raw speed. We should not put unsubstantiated speed claims into our docs.

### 4.4 Brownfield adaptation is unsolved

`[Augment]` flags this directly:

> "Known limitation in Spec Kit (GitHub issue #1191) is that the workflow is optimized for net-new feature creation, making it difficult to update existing specifications."

`[Fowler]` saw the same issue applying SDD tools to small bug fixes.

**Implication.** Our `/spec` command should not refuse brownfield work, but the skill should explicitly support an "incremental spec" mode where the engineer specifies a *change* to an existing system rather than a greenfield feature, and where the constitution can encode "we already have X" facts.

---

## 5. The most actionable concrete patterns we will adopt

Listed in order of strength of consensus across sources.

| Pattern | Sources | Adoption decision |
|---------|---------|-------------------|
| Three-tier artifact set: principles (constitution) → spec → plan → tasks | All | **Adopt** |
| `[NEEDS CLARIFICATION]` markers with explicit budget (≤3) | `[SpecKit]`, `[Augment]` | **Adopt with budget** |
| Bounded interactive clarification (≤5 high-impact questions, taxonomy-driven) | `[SpecKit]`, `[Heeki]`, `[Augment]` | **Adopt** |
| User stories prioritised P1/P2/… with each independently testable + Given/When/Then acceptance scenarios | `[SpecKit]`, `[RedHat]` | **Adopt** |
| Tasks organised by user story with `[P]` parallel markers and explicit file paths | `[SpecKit]` | **Adopt** |
| Test-first ordering: contracts → contract tests → integration → e2e → unit → source | `[SpecKit]`, `[Zencoder]`, `[Augment]` | **Adopt; integrate with existing /tdd skill** |
| Constitution gates (Simplicity, Anti-Abstraction, Integration-First) with explicit Complexity Tracking justification when violated | `[SpecKit]`, `[Augment]` | **Adopt; project-specific articles defined per-feature or inherited from plugin** |
| Cross-artifact consistency analysis (read-only, deterministic, severity-graded) by a *separate agent with opposing goals* | `[SpecKit]`, `[Augment]` | **Adopt as `spec-validator` agent** |
| "Unit tests for English" — checklists that test requirements quality, not implementation | `[SpecKit]` | **Adopt verbatim — strongest single contribution** |
| Spec-anchored discipline: spec is updated when implementation diverges, but code is not regenerated from spec | `[Augment]`, `[Heeki]` | **Adopt** |
| Adversarial / data-driven review by an agent with explicit anti-sycophancy instructions | (User-stated requirement; supported by `[Augment]`'s separate-Verifier rationale) | **Adopt as `spec-challenger` agent** — this is our distinctive contribution |
| Skip-SDD decision criteria (one-prompt fix, throwaway prototype, mechanical change) | `[Augment]`, `[Fowler]` | **Adopt as opt-in guidance in skill body** |

---

## 6. What we will *not* import

| Pattern | Sources | Why not |
|---------|---------|---------|
| Spec-as-source (regenerate code from spec on every change) | `[Piskala26]`, `[SpecKit]` (aspirational) | Nondeterminism in code generation makes this brittle (`[Fowler]`); `[Augment]` explicitly recommends against it for most teams. |
| Constitution amendment process with semantic-version bumps for principle changes | `[SpecKit]/templates/commands/constitution.md` | Heavyweight for our use case. We use plugin-level docs (`plugins/*/CLAUDE.md`) for stable project rules; per-feature constitution is sufficient. |
| Verbose extension hooks system (`.specify/extensions.yml`) embedded in every command | `[SpecKit]/templates/commands/*` | Our hook system already exists in `hooks/` and is sufficient. |
| 8+ markdown files per spec (data-model.md, research.md, contracts/, quickstart.md, plan.md, spec.md, tasks.md, checklists/*.md) | `[SpecKit]`, `[Fowler]` (criticism) | Fowler's review burden complaint is real. We will collapse to 4 files per feature spec by default (constitution.md inherited from project; spec.md, plan.md, tasks.md, checklists/requirements.md). Optional artifacts (data-model, contracts, research, quickstart) only when the engineer explicitly requests them. |
| Aspirational productivity numbers ("95% first-try accuracy", "12 hours to 15 minutes") | `[RedHat]`, `[SpecKit]/spec-driven.md` | No empirical backing. Our docs will avoid these. |
| Tool-specific CLI (specify init, /speckit.* commands) | `[SpecKit]` | We are a Claude Code plugin marketplace; we use slash-commands and skills natively. |

---

## 7. Open questions to resolve in the design phase

These will be resolved in `docs/research/spec-driven-development-design.md`.

1. **Where does the per-feature constitution live?** Spec-Kit puts it at `memory/constitution.md` (project-level, immutable across features). For us, plugin-level guidance lives in `plugins/*/CLAUDE.md` and `agents/*` already. Question: do we (a) inherit the constitution from the active plugin, (b) author a per-feature constitution, or (c) both with explicit precedence rules?
2. **How does the `/spec` workflow integrate with `/write-plan`?** Spec-Kit's `/speckit.tasks` produces what is essentially the implementation plan. Question: does `/spec` *replace* `/write-plan` for SDD-flagged work, or does it produce an artifact that `/write-plan` consumes? Our policy is "do not replace existing commands," so the artifact path is preferred.
3. **`spec-challenger` agent — what data sources does it cite?** The user is explicit that pushback must be evidence-driven. Question: what sources does it have authority to consult? (Code in the repo? Linked sources? CVE databases? Past project specs?) We need a deterministic citation policy.
4. **Cross-plugin spec composition.** Some features cross plugin boundaries (e.g., a feature that touches both a frontend and backend plugin, or both a Rust SDK and Flutter app). Question: does `/spec` produce one combined spec or one spec per plugin? If combined, who owns the constitutional gates that differ between the plugins?
5. **MVP per user story enforcement.** Spec-Kit's strongest single discipline is "if you implement just ONE user story, you should still have a viable MVP." Question: should we hard-fail the spec validator when a P1 user story does not pass an "Independent Test" check? (Recommended yes.)

---

## 8. Bibliography

1. Augment Code. *What Is Spec-Driven Development?* `[Augment]` — `https://www.augmentcode.com/guides/what-is-spec-driven-development`. Accessed 2026-05-02.
2. GitHub. *github/spec-kit* (open-source toolkit). `[SpecKit]` — `https://github.com/github/spec-kit`. Cloned to `/tmp/sdd-research/spec-kit/` on 2026-05-02 via `gh repo clone github/spec-kit -- --depth=1`. All file references resolve relative to that clone (e.g., `templates/spec-template.md`, `spec-driven.md`, `templates/commands/clarify.md`).
3. Böckeler, Birgitta (Thoughtworks). *Understanding Spec-Driven-Development*. `[Fowler]` — `https://martinfowler.com/articles/exploring-gen-ai/sdd-3-tools.html`. Part of the *Exploring Gen AI* series on martinfowler.com.
4. Park, Heeki. *Using Spec-Driven Development with Claude Code*. `[Heeki]` — `https://heeki.medium.com/using-spec-driven-development-with-claude-code-4a1ebe5d9f29`.
5. Naszcyniec, Rich. *How Spec-Driven Development Improves AI Coding Quality*. `[RedHat]` — `https://developers.redhat.com/articles/2025/10/22/how-spec-driven-development-improves-ai-coding-quality`. Red Hat Developers, 2025-10-22.
6. Piskala, Deepak Babu. *Spec-Driven Development: From Code to Contract in the Age of AI Coding Assistants*. `[Piskala26]` — arXiv:2602.00180, 2026-01-30. AIWare 2026 submission. License: CC BY 4.0. PDF mirrored at `https://arxiv.org/pdf/2602.00180`.
7. Zencoder. *A Practical Guide to Spec-Driven Development*. `[Zencoder-Docs]` — `https://docs.zencoder.ai/user-guides/tutorials/spec-driven-development-guide`. *Note: live page returned HTTP 403 on direct fetch on 2026-05-02; synthesis derived from page summary returned by web search and from the canonical Zencoder blog posts S7b/S7c.*
8. Zencoder. *Spec-Driven Development (SDD): The AI Engineering Method AI Needed*. `[Zencoder-Blog1]` — `https://zencoder.ai/blog/spec-driven-development-sdd-the-engineering-method-ai-needed`.
9. Zencoder. *Spec-Driven Development: Everything You Need to Know [2026]*. `[Zencoder-Blog2]` — `https://zencoder.ai/blog/spec-driven-development`.

### Secondary references cited *by the sources above* (not directly fetched)

- Yan et al. (2025) — LLM code-vulnerability rate study (`[Augment]`).
- MSR '26 study of Cursor AI productivity (`[Augment]`).
- Beck, Kent — *Test-Driven Development by Example* (`[Piskala26]` bibliography).
- North, Dan — *Behavior-Driven Development* origin essay (`[Piskala26]` bibliography).
- ThoughtWorks Technology Radar — emerging-practice classifications referenced by both `[Augment]` and `[Piskala26]`.
- ISO 26262 — automotive safety standard (`[Piskala26]`).
- Design by Contract (Meyer) — formal-methods foundation (`[Piskala26]`).
