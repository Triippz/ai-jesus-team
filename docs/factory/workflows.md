# development workflows

How to use the skills for different types of work. Each workflow shows the commands in order with what they do.

---

## large feature (full spec-driven development)

Use when: cross-plugin feature, 3+ user stories, multiple agents will implement in parallel, misinterpretation costs > 30 minutes to fix.

```
/brainstorm          → explore the design space collaboratively
/interrogate         → stress-test the design, walk every decision branch
/spec                → write the formal spec (WHAT, not HOW)
  /spec clarify      → resolve ambiguities (≤5 questions)
  /spec plan         → write the implementation plan (HOW)
  /spec tasks        → generate task list grouped by user story
  /spec challenge    → adversarial review (spec-challenger agent)
  /spec validate     → structural validation (spec-validator agent)
/execute-plan        → implement tasks one by one with TDD
/review              → code review with specialist agents
/verify              → tests + lint + types + schema validation
/finish              → prepare branch, update docs, create MR
```

**Example:** Building the plugin template factory, adding a new sync system, redesigning an API.

---

## medium feature (plan then build)

Use when: single-plugin feature, 1-2 user stories, straightforward implementation, one developer.

```
/brainstorm          → quick exploration (skip if design is obvious)
/write-plan          → write implementation plan
/tdd                 → write tests first for each step
/execute-plan        → implement the plan step by step
/review              → code review
/verify              → run all checks
/finish              → prepare for merge
```

**Example:** Adding a new review agent, new CLI command, new profile.

---

## small change / bug fix

Use when: isolated fix, single file or module, clear what needs to change.

```
/debug               → if investigating a bug (structured: reproduce → feedback loop → hypothesize → fix)
/tdd                 → write failing test for the fix
                     → implement the fix (make test pass)
/review              → quick review
/verify              → run all checks
```

No plan needed. TDD is still non-negotiable — even for "obvious" fixes.

**Example:** Fixing a template rendering bug, correcting a schema constraint, updating a threshold.

---

## async / concurrent code

Use when: writing or reviewing code that uses async/await, channels, tasks, goroutines, isolates.

```
/async-audit         → audit for races, deadlocks, leaks, cancellation safety
```

Run standalone or as part of `/review`. Covers Rust (Tokio), Dart (Flutter), Python (asyncio/Celery), Go (goroutines), TypeScript (Deno/Node). Checks for: blocking in async context, unbounded channels, fire-and-forget spawns, missing timeouts, mutex across await, cancellation safety, and more.

**Example:** Reviewing a new Tokio task spawning pattern, auditing Celery task idempotency, checking Dart Stream subscriptions for leaks.

---

## explore / understand a codebase

Use when: unfamiliar with a repo or module, need to understand how things connect.

```
/orient              → get a map of modules, callers, dependencies at a higher abstraction level
/interrogate-with-docs → grill yourself about the design while sharpening the domain glossary
```

`/orient` is quick — one question, one map. `/interrogate-with-docs` is deep — it updates CONTEXT.md with precise domain terms and creates ADRs for important decisions.

**Example:** Starting on a new project, onboarding to an unfamiliar module, preparing to refactor.

---

## refactor / improve architecture

Use when: code works but is hard to test, hard to navigate, or has shallow modules.

```
/improve-codebase-architecture → find deepening opportunities (shallow → deep modules)
/interrogate         → stress-test the refactoring plan
/write-plan          → plan the migration steps
/tdd                 → test the new interfaces first
/execute-plan        → execute the refactor step by step
/review              → verify no regressions
```

The architecture skill uses the **deletion test**: if deleting a module makes complexity vanish, it was a pass-through. If complexity reappears across N callers, it was earning its keep.

**Example:** Consolidating scattered utility modules, extracting a deep interface from tightly-coupled code.

---

## prototype / experiment

Use when: not sure if a design will work, need to try something before committing.

```
/prototype           → build throwaway code to answer a question
```

Routes automatically between logic prototypes (terminal app for state machines) and UI prototypes (multiple variations on one route). Throwaway from day one — capture the answer, delete the code.

**Example:** Testing a new state machine design, comparing UI layout options, validating an API shape.

---

## documentation updates

Use when: docs are stale, new feature needs docs, onboarding guides need updating.

```
/orient              → understand current state of the module being documented
/terse               → if writing a lot, reduce token usage ~75%
                     → write the docs
/review              → doc-review agent checks accuracy
/verify              → confirm no broken links or stale references
```

---

## hand off work to next session

Use when: context window is getting long, switching machines, or ending for the day.

```
/handoff             → compact conversation into a continuation doc
```

Writes a handoff document to the OS temp directory. References artifacts by path, suggests which skills to invoke next, redacts secrets. The next session reads the handoff and picks up where you left off.

---

## stress-test a plan before implementing

Use when: you have a plan or design and want it challenged before writing code.

```
/interrogate         → adversarial interview, walks every decision branch
/interrogate-with-docs → same but also sharpens domain glossary + creates ADRs
```

Different from `/spec challenge` (which reviews a written spec formally). These are interactive dialogues for working through a plan in real-time.

---

## create issues from a plan

Use when: plan is approved and you want to break it into trackable issues.

```
/plan-to-jira        → break plan into vertical-slice JIRA issues
```

Each issue is a tracer-bullet vertical slice (not a horizontal layer). Issues are classified as AFK (agent can handle) or HITL (needs human judgment). Prefer AFK.

---

## reduce token usage in long sessions

```
/terse               → toggle ultra-compressed mode (~75% reduction)
```

Drops articles, filler, pleasantries, hedging. Keeps all technical substance. Persists across turns until you say "stop terse" or "normal mode". Auto-reverts for security warnings and destructive actions.

---

## workflow rules

1. **Order matters.** brainstorm → plan → tdd → execute → review → verify → finish. You can skip steps with justification, but never reorder.
2. **TDD is non-negotiable.** Even for "obvious" fixes. `/execute-plan` refuses to implement without failing tests.
3. **Verification before claiming done.** `/verify` runs tests + lint + types + schemas. No green checkmark without evidence.
4. **Commit format enforced.** `type: [scope] description` — git hooks block non-conforming commits automatically.
