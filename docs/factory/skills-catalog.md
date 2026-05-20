# Skills Catalog

Skills are knowledge modules that encode battle-tested workflows. They are loaded via the `using-superpowers` skill at session start and invoked by slash command or automatically when the orchestrator detects a matching trigger.

---

## Standard Workflow

The seven-step progression covers the full development lifecycle. Steps may be skipped with explicit justification, but **order must never be violated** — no executing before planning, no finishing before verifying.

```
brainstorm → write-plan → tdd → execute-plan → review → verify → finish
```

For complex features crossing plugin boundaries, multiple user stories, or shared contracts where misinterpretation would be expensive, use the SDD entry point instead:

```
spec (specify → clarify → plan → tasks → challenge → validate) → execute-plan → review → verify → finish
```

`/spec` produces `tasks.md` directly, so `/execute-plan` runs against it without a separate `/write-plan` step.

---

## When to Use /spec vs /write-plan

Use `/spec` when 2 or more of these are true:

| Condition | Examples |
|---|---|
| Crosses 2+ plugins | AOK frontend + AOK backend; Atlas Rust + Atlas Flutter |
| 3+ distinct user stories or persona interactions | Multi-role feature with separate flows |
| Touches a contract other systems depend on | Shared API, event schema, database migration |
| Misinterpretation cost > 30 minutes to repair | Anything a junior would get wrong from a vague description |
| Multiple agents work on parts in parallel | Agent team dispatch |
| A non-engineer stakeholder must review before code is written | PM, design, legal sign-off |

Use `/brainstorm` → `/write-plan` when the work is exploratory, a bug fix with an existing failing test, mechanically simple, or throwaway.

---

## Skill Types

| Type | Definition | Examples |
|---|---|---|
| **Rigid** | Follow the process exactly as written. Do not skip steps, do not improvise. | tdd, executing-plans, verification, finishing-branch, git-worktrees, debugging, merge-request, resolve-reviews, plan-to-jira, update-jira, code-review, handoff |
| **Flexible** | Adapt guidance to context. Use judgment on which parts apply. | brainstorming, dispatching-agents, agent-teams, writing-skills, spec-driven-development, interrogate, interrogate-with-docs, terse, orient, prototype, improve-codebase-architecture, async-audit |

---

## Skill Table

| Skill | Command | Phase | Type | When to Use |
|---|---|---|---|---|
| brainstorming | `/brainstorm` | Explore | Flexible | New feature, design decision, or technical approach before implementation |
| spec-driven-development | `/spec` | Specify | Flexible | Complex features where implementation drift would be expensive |
| writing-plans | `/write-plan` | Plan | Rigid | Creating a step-by-step implementation plan from a design or requirement |
| tdd | `/tdd` | Test | Rigid | Writing failing tests before any production code |
| executing-plans | `/execute-plan` | Implement | Rigid | Implementing a plan step-by-step with TDD enforcement |
| debugging | `/debug` | Fix | Rigid | Investigating and fixing a bug using structured methodology |
| code-review | `/review` | Review | Rigid | Multi-agent architecture, quality, and security review on changes |
| verification | `/verify` | Verify | Rigid | Pre-merge check — tests, lint, type-checker must all pass |
| finishing-branch | `/finish` | Finish | Rigid | Preparing a branch for merge or PR with doc updates |
| merge-request | `/mr` | Finish | Rigid | Push a branch and create a GitLab merge request via `glab` |
| resolve-reviews | `/resolve-reviews` | Finish | Rigid | Address GitLab MR review comments with research-backed triage |
| plan-to-jira | `/plan-to-jira` | Integrate | Rigid | Convert a plan in `docs/plans/` into JIRA Story + subtasks |
| update-jira | `/update-jira` | Integrate | Rigid | Update JIRA issues with implementation details and QA steps after completion |
| git-worktrees | — | Any | Rigid | Create isolated git worktrees for feature work |
| dispatching-agents | — | Any | Flexible | Run multiple independent tasks in parallel using agents |
| agent-teams | — | Any | Flexible | Coordinate multi-agent work on large features requiring file ownership |
| using-superpowers | — | Meta | — | Entry point loaded at session start; contains skill catalog, workflow, agent roster |
| writing-skills | — | Meta | Flexible | Authoring new skills using a TDD-based process |
| interrogate | `/interrogate` | Any | Flexible | Adversarial interview to stress-test a plan or design before implementation |
| interrogate-with-docs | `/interrogate-with-docs` | Any | Flexible | Same as interrogate + CONTEXT.md glossary sharpening and ADR creation |
| handoff | `/handoff` | Any | Rigid | Compact conversation into a continuation doc for the next session |
| terse | `/terse` | Any | Flexible | Toggle ultra-compressed communication mode (~75% token reduction) |
| orient | `/orient` | Any | Flexible | Quick codebase map — modules, callers, dependencies at a higher abstraction |
| prototype | `/prototype` | Explore | Flexible | Throwaway code to answer a design question before committing to implementation |
| improve-codebase-architecture | `/improve-codebase-architecture` | Refactor | Flexible | Deep vs shallow module analysis; find and execute shallow→deep refactors |
| async-audit | `/async-audit` | Review | Flexible | Cross-stack async code review — races, deadlocks, leaks, cancellation safety (Rust/Tokio, Dart/Flutter, Python, Go, TypeScript) |

---

## Per-Skill Reference

### brainstorming

Collaborative dialogue for exploring design ideas before committing to implementation.

**Process:** Gather context → Ask questions one at a time (prefer multiple-choice) → Present 2–3 approaches with trade-offs → Design in 200–300 word sections with validation after each → Write finalized design to `docs/plans/YYYY-MM-DD-<topic>-design.md`

**Key outputs:**
- `docs/plans/YYYY-MM-DD-<topic>-design.md` — problem statement, chosen approach, trade-offs, open questions
- Offer to continue to `/write-plan` or `/worktree`

**Rule:** This is a dialogue, not a monologue. Do not dump the full design at once.

---

### spec-driven-development

7-phase rigid workflow for producing an unambiguous spec/PRD that an unfamiliar agent can implement without further interpretation.

**Phases:**

| Phase | Command | Output |
|---|---|---|
| 0a. Constitution | `/spec` (first run) | `docs/spec/constitution.md` |
| 0b. Defaults Catalog | `/spec` (first run) | `docs/spec/defaults.md` |
| 1. Specify | `/spec "<feature>"` | `specs/NNN-slug/spec.md` |
| 2. Clarify | `/spec clarify` | Updates to `spec.md`, ≤5 questions per session |
| 3. Plan | `/spec plan` | `specs/NNN-slug/plan.md` |
| 4. Tasks | `/spec tasks` | `specs/NNN-slug/tasks.md` |
| 5. Challenge | `/spec challenge` | `specs/NNN-slug/challenges.md` |
| 6. Validate | `/spec validate` | `specs/NNN-slug/validation-report.md` |
| 7. Implement | `/execute-plan` | Reads `tasks.md`; skill is done |

**Alternate entry points:** `/spec import <source>` (verbatim import from PRD/JIRA/Confluence), `/spec amend <spec-dir> <description>` (brownfield change-set with engineer approval before applying).

**Iron laws:** Tests precede implementation (Article I). CRITICAL findings block Phase 7. The agent never invents priorities, IDs, or defaults — every gap is flagged `[NEEDS CLARIFICATION]`.

**Key outputs:** Minimum 4 files per spec (`spec.md`, `plan.md`, `tasks.md`, `checklists/requirements.md`); plus `challenges.md` and `validation-report.md` after Phases 5–6.

---

### writing-plans

Creates a detailed, step-by-step implementation plan from a design document, spec, or verbal requirements.

**Process:** Read input → Break into numbered steps (5–15 typical), each independently testable → Identify dependencies and parallel opportunities → Detail each step (what to implement, tests to write, acceptance criteria) → Write to `docs/plans/YYYY-MM-DD-<topic>-plan.md`

**Key outputs:**
- `docs/plans/YYYY-MM-DD-<topic>-plan.md` — overview, prerequisites, steps, verification

**Rules:** Each step must be independently verifiable. Steps must be TDD-compatible — test cases writable before implementation.

---

### tdd

Enforces Red → Green → Refactor. No production code without a failing test first.

**Cycle:**
1. **Red** — write the smallest failing test; verify it fails for the right reason
2. **Green** — write minimal production code to pass the test; run all tests
3. **Refactor** — clean test and production code; all tests must still pass

**Rule:** If code was written before a test — delete it. Start over with a test.

**Verification checklist per cycle:** Test written before code; failed before code; failed for the right reason; minimal production code written; all existing tests pass; refactored; all tests still pass after refactor.

---

### executing-plans

Implements a plan step-by-step with strict TDD enforcement and optional JIRA auto-transition.

**Process per step:**
1. Check for JIRA linkage (`.jira-map.json`); transition to In Progress if found
2. Check tests exist — **refuse to implement if no tests exist**; direct user to `/tdd`
3. Implement minimal production code
4. Run tests for the step + full suite; fix regressions before continuing
5. Verify acceptance criteria; refactor if needed
6. Report step N/M complete

**Error recovery:** If a step cannot be completed as planned — stop, explain, suggest plan modifications, wait for approval, update plan document, then resume.

**Rules:** TDD non-negotiable. One step at a time. Regressions block progress. Plan changes require updating the plan document first.

---

### debugging

Structured 5-step debugging process. Never jumps to conclusions.

**Steps:** Reproduce → Isolate → Hypothesize (2–3 ranked hypotheses) → Verify (one hypothesis at a time) → Fix (regression test first, then minimal fix, then full suite)

**Rules:** No hypothesis without reproduction. Evidence over intuition. One variable changed per experiment. Regression test required for every fix. Minimal fix only — no refactoring while fixing.

---

### code-review

Dispatches 3 review agents in parallel: architecture, code quality, security.

**Agents:**
- `arch-reviewer` — module boundaries, dependency direction, circular deps, abstraction
- `code-reviewer` — SOLID, DRY (3+ occurrences), KISS, naming, function size, magic literals, dead code, error handling
- `security-auditor` — OWASP top 10, hardcoded secrets, injection, input validation, sensitive data exposure

**Output categories:** Must Fix → Should Fix → Consider

**Rules:** All three agents always run. Deduplicate and merge overlapping findings.

---

### verification

Pre-merge check. No claiming done without evidence.

**Checks (all must run):** Test suite → Linter → Type checker (if applicable) → Uncommitted changes check

**Output:**

| Check | Status | Details |
|---|---|---|
| Tests | PASS/FAIL | X passed, Y failed, Z skipped |
| Linter | PASS/FAIL | X errors, Y warnings |
| Types | PASS/FAIL/N/A | X errors |
| Clean | PASS/WARN | X uncommitted files |

**Rules:** Test failures and type errors block (`NOT READY`). Show actual command output, not summaries.

---

### finishing-branch

Prepares a branch for merge or PR.

**Process:** Run verification (stop if fails) → Transition linked JIRA issues to Review (if map file exists) → Scan for stale docs (README, API docs, inline comments, config docs, setup docs) → Auto-update stale docs → Present options: merge / create PR / leave for manual review → Execute with explicit user permission

**Rules:** Never proceed without passing verification. Always ask before any git push or merge. Never force push.

---

### merge-request

Pushes a branch and creates a GitLab merge request via `glab` CLI.

**Process:** Verify `glab` installed and authenticated → Gather context (branch, commits, diff) → Verify commit messages (no AI references, conventional commits format) → Generate MR title (<70 chars) and description → Push and create MR → Report URL

**Commit rules enforced:** No "Claude", "Anthropic", or AI tool references. No `Co-Authored-By` AI lines. Types: `feat`, `fix`, `docs`, `refactor`, `test`, `perf`, `build`, `ci`, `chore`.

---

### resolve-reviews

Fetches all unresolved GitLab MR discussions, triages with evidence, implements fixes, replies to every thread, and resolves discussions.

**Phases:**
- **A. Discovery** — Identify MR, fetch unresolved discussions, present numbered list
- **B. Triage** — Categorize each comment as FIX / DISCUSS / DECLINE / CLARIFY; research-backed rationale required for DECLINE; human approval required before proceeding
- **C. Plan + Implement** — Implementation plan presented; human approval required; fixes applied; tests verified after each fix
- **D. Commit, Reply, Resolve** — Commit with conventional format; reply to every thread (mandatory, no exceptions); resolve discussions

**Key rule:** DECLINE responses must cite repository evidence or external sources. Burden of proof is on declining, not on fixing. If no evidence found, default to FIX.

---

### plan-to-jira

Converts a plan in `docs/plans/` into a JIRA parent Story (or Epic) with one subtask per plan step.

**Process:** Discover JIRA config (`.jira-config.json` or MCP discovery) → Load plan → User confirmation → Choose parent type → Create parent issue → Create subtasks sequentially (rate limit safe) → Write `.jira-map.json` → Report

**Subtask template sections:** Description, Checklist, Technical Details, Acceptance Criteria (Given/When/Then), Design/UX Notes, Dependencies

**Key output:** `docs/plans/<plan-basename>.jira-map.json` — consumed by `/execute-plan` (auto-transitions) and `/update-jira` (post-completion updates)

**Rules:** Never create issues without user confirmation. Use `contentFormat: "markdown"` always. Fill every template section (use "N/A", never omit).

---

### update-jira

Updates JIRA issues with implementation details and QA test steps after work is complete.

**Process:** Determine scope (single issue or batch from `.jira-map.json`) → Gather git diff and commit history → Build update per issue (mandatory template) → User confirmation and mode choice (comment vs description append) → Apply via Atlassian MCP → Report

**Update template sections:** What Was Implemented, How to Test (QA Steps with specific inputs and expected outputs), Technical Details, Acceptance Criteria Status

**Rules:** Never overwrite original description — always append or use comments. QA steps must be concrete and actionable. At least 2 edge cases per issue.

---

### git-worktrees

Creates isolated git worktrees for feature work in `.worktrees/`.

**Process:** Derive branch name → Confirm with user → `git worktree add .worktrees/<branch-name> -b <branch-name>` → Verify clean state → Report path and branch

**Rules:** Always use `.worktrees/` directory. Always add to `.gitignore`. Confirm branch name before creating.

---

### dispatching-agents

Decomposes a request into independent tasks and runs agents in parallel.

**Process:** Identify independent tasks (no shared files, no output dependencies) → Assign one agent per task → Launch in parallel → Collect results → Merge, deduplicate, resolve conflicts → Present unified report

**Use when:** Multi-agent code review, parallel module analysis, multiple independent bug investigations.

**Do not use when:** Tasks have sequential dependencies, tasks modify the same files, or a single focused task is all that is needed.

---

### agent-teams

Coordinates multiple agents working on a large feature, with strict file ownership to prevent conflicts.

**Process:** Break feature into domains → Assign file ownership (no two agents modify the same file) → Define shared interfaces upfront → Create worktrees per agent (optional) → Execute via dispatching-agents → Merge and run integration tests

**Team sizing:**

| Feature Size | Team Size |
|---|---|
| 1–3 files | 1 agent (no team) |
| 4–10 files | 2 agents |
| 10+ files | 3–4 agents |
| Very large | 4+ agents with coordinator |

---

### using-superpowers

Meta-skill loaded at session start. Contains the skill catalog, workflow order, agent roster, skill type definitions, and red-flag rationalizations to watch for.

**Not invoked directly.** Loaded by the orchestrator. Establishes the rule: before responding to any user request, check if a relevant skill exists and invoke it first.

---

### writing-skills

Meta-skill for authoring new skills using TDD principles.

**Process:** Define purpose and triggers → Write test cases (given/when/then, including edge and failure cases) → Write `SKILL.md` using the standard template → Test with a sub-agent against the defined test cases → Iterate until behavior matches tests

**Key outputs:** A `SKILL.md` file in `skills/<skill-name>/` following the standard frontmatter and section format.

**Rules:** Rigid skills need precise, unambiguous instructions. Flexible skills need clear principles. Include examples when instructions could be misinterpreted. Test with realistic scenarios.

### interrogate

Stress-tests a plan or design through structured adversarial questioning before implementation begins.

**Process:** Read the plan or design → Ask targeted adversarial questions (assumptions, failure modes, scale, rollback, dependencies) → Surface hidden risks and gaps → Allow author to refine → Repeat until no critical gaps remain

**Key outputs:** A list of addressed and unaddressed risks; refined plan or design

**Rule:** This is an interview, not a debate. The goal is to surface problems the author hasn't considered, not to block progress.

---

### interrogate-with-docs

Same adversarial interview as `/interrogate`, extended with documentation artifacts.

**Extensions over `/interrogate`:**
- Maintains or creates a `CONTEXT.md` glossary of domain terms agreed during the interview
- Creates Architecture Decision Records (ADRs) for non-obvious design choices surfaced during questioning
- Cross-references claims against existing codebase code where relevant

**Key outputs:** Refined plan, `CONTEXT.md` glossary updates, one or more ADR files

---

### handoff

Compacts the current conversation into a continuation document so the next session can resume without context loss.

**Process:** Summarize work completed → Document current state and blockers → List open decisions and their context → Record next steps in priority order → Write to `docs/handoffs/YYYY-MM-DD-<topic>-handoff.md`

**Key output:** `docs/handoffs/YYYY-MM-DD-<topic>-handoff.md` — objective summary, completed work, current state, open decisions, next steps, file inventory

**Rules:** Ruthlessly compress. Include only what a fresh agent needs to continue. No conversational filler.

---

### terse

Reduces response verbosity by approximately 75% for token-constrained sessions or when speed matters more than explanation depth.

**Mode:** When active, Claude responds with: no preamble, no summaries, direct answers, code without commentary unless asked, bullet points over prose

**Activation:** `/terse` toggles the mode on or off within a session.

**Rule:** Terse mode suppresses explanation, not accuracy. Correctness is never sacrificed.

---

### orient

Produces a quick codebase orientation map at a higher level of abstraction — useful when entering an unfamiliar codebase or returning after a long gap.

**Process:** Enumerate top-level modules → Identify entry points and public API surfaces → Map major caller/callee relationships → Highlight key data flows → Surface the tech stack and major dependencies → Output as a structured map, not prose

**Key output:** A module map with entry points, dependency direction, and data flow summary

**Rule:** Optimize for navigability, not completeness. A good orient output tells a developer where to look next, not everything about the system.

---

### prototype

Builds throwaway code to answer a concrete design question before committing to an implementation approach.

**Process:** Identify the specific design question to answer → Build the minimal code that answers it → Run or analyze the prototype → Report findings and recommendation → Discard the prototype (do not promote to production)

**Rules:** Prototype code is never promoted to production. No tests are written for prototype code — it exists to be deleted. The output is a finding and a recommendation, not a feature.

---

### improve-codebase-architecture

Finds and executes shallow→deep module refactors — moving implementation details from callers into the modules that own them.

**Process:** Read changed files and surrounding modules → Identify shallow patterns (callers doing what modules should do, leaking internals, primitive obsession) → Rank by impact → Propose refactors with rationale → Execute approved refactors with tests

**Key heuristic — shallow vs deep:**
- **Shallow module**: small interface, complex implementation visible to callers; callers know too much
- **Deep module**: small interface, all complexity hidden; callers know only what they need

**Rules:** Never refactor without tests. Propose before implementing. Validate that the refactor makes callers simpler, not just different.

---

### async-audit

Reviews async, concurrent, and parallel code for correctness across multiple language stacks.

**Checks per stack:**
- **Rust/Tokio**: `Arc<Mutex<T>>` held across `.await`, lock ordering, blocking in async context, SQLite across I/O, actor blocking
- **Dart/Flutter**: `await` interleaving, `StreamController` lifecycle, isolate `SendPort` safety, `setState`-after-`dispose`
- **Python**: asyncio lock usage, Celery atomicity/idempotency, Channels state, Redis pipeline races, GIL implications
- **Go**: goroutine loop variable closure, map concurrent access, `WaitGroup.Add` placement, `context.Done` handling
- **TypeScript**: `await` in `forEach`, `Promise.all` side-effect ordering, `Promise.race` without cancellation, event loop blocking

**Output format:** Findings grouped by severity (error / warning / suggestion) with file, line, pattern name, and recommended fix.

**Rule:** Flag ambiguous patterns at `confidence: medium` rather than silently passing. High-confidence pass is not the same as no issues found.

---

## Skills Directory Structure

```
skills/
├── agent-teams/SKILL.md
├── async-audit/SKILL.md
├── brainstorming/SKILL.md
├── code-review/SKILL.md
├── debugging/SKILL.md
├── dispatching-agents/SKILL.md
├── executing-plans/SKILL.md
├── finishing-branch/SKILL.md
├── git-worktrees/SKILL.md
├── handoff/SKILL.md
├── improve-codebase-architecture/SKILL.md
├── interrogate/SKILL.md
├── interrogate-with-docs/SKILL.md
├── merge-request/SKILL.md
├── orient/SKILL.md
├── plan-to-jira/SKILL.md
├── prototype/SKILL.md
├── resolve-reviews/SKILL.md
├── spec-driven-development/
│   ├── SKILL.md
│   ├── references/
│   │   ├── sdd-decision-tree.md
│   │   └── research-summary.md
│   ├── prompts/
│   │   ├── clarify-taxonomy.md
│   │   ├── import-protocol.md
│   │   ├── amend-protocol.md
│   │   ├── challenge-protocol.md
│   │   └── validation-protocol.md
│   └── templates/
│       ├── constitution-template.md
│       ├── defaults-catalog-template.md
│       ├── spec-template.md
│       ├── plan-template.md
│       ├── tasks-template.md
│       ├── checklist-template.md
│       ├── challenges-template.md
│       ├── validation-report-template.md
│       ├── import-mapping.md
│       └── change-set-template.md
├── tdd/SKILL.md
├── terse/SKILL.md
├── update-jira/SKILL.md
├── using-superpowers/SKILL.md
├── verification/SKILL.md
├── writing-plans/SKILL.md
├── writing-skills/SKILL.md
├── AGENTS.md
├── CLAUDE.md
└── readme.md
```

`spec-driven-development` is the only skill with a full subdirectory structure; all other skills are single `SKILL.md` files.
