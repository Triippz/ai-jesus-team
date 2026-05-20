---
name: using-superpowers
description: Entry point skill loaded at session start — contains skill catalog, workflow, and agent roster
---

# Using Superpowers

## The Rule

Before responding to ANY user request, check if a relevant skill exists. If it does, invoke that skill BEFORE generating your response. Skills encode battle-tested workflows that produce better results than ad-hoc responses.

## Skill Catalog

| Skill | Command | When to Use | Type |
|-------|---------|-------------|------|
| Brainstorming | `/brainstorm` | Exploring a new feature, design decision, or technical approach | Flexible |
| Spec-Driven Development | `/spec` | Authoring a granular, unambiguous PRD/spec when interpretation drift would be expensive | Rigid |
| Writing Plans | `/write-plan` | Creating a step-by-step implementation plan from a design | Rigid |
| TDD | `/tdd` | Writing tests before implementation code | Rigid |
| Executing Plans | `/execute-plan` | Implementing a plan step-by-step | Rigid |
| Debugging | `/debug` | Investigating and fixing a bug | Rigid |
| Code Review | `/review` | Reviewing code for quality, architecture, and security | Rigid |
| Verification | `/verify` | Checking if code is ready for merge (tests, lint, types) | Rigid |
| Finishing Branch | `/finish` | Preparing a branch for merge or PR | Rigid |
| Merge Request | `/mr` | Pushing a branch and creating a GitLab merge request | Rigid |
| Resolve Reviews | `/resolve-reviews` | Addressing MR review comments with research-backed triage and replies | Rigid |
| Plan to JIRA | `/plan-to-jira` | After writing a plan, to create linked JIRA issues with subtasks | Rigid |
| Update JIRA | `/update-jira` | After completing work, to update JIRA with implementation details and QA steps | Rigid |
| Git Worktrees | — | Creating isolated worktrees for feature work | Rigid |
| Dispatching Agents | — | Running multiple independent tasks in parallel | Flexible |
| Agent Teams | — | Coordinating multi-agent work on large features | Flexible |
| Writing Skills | — | Authoring new skills using TDD | Flexible |
| Interrogate | `/interrogate` | Stress-testing a plan or design through adversarial interview | Flexible |
| Interrogate with Docs | `/interrogate-with-docs` | Stress-testing with glossary sharpening, ADR creation, and code cross-referencing | Flexible |
| Handoff | `/handoff` | Compacting conversation into a continuation doc for the next session | Rigid |
| Terse | `/terse` | Ultra-compressed communication mode (~75% token reduction) | Flexible |
| Orient | `/orient` | Quick codebase orientation — map of modules, callers, dependencies | Flexible |
| Prototype | `/prototype` | Throwaway code to answer a design question before committing | Flexible |
| Improve Architecture | `/improve-codebase-architecture` | Finding deepening opportunities — shallow→deep module refactors | Flexible |
| Async Audit | `/async-audit` | Auditing async code for races, deadlocks, leaks, cancellation safety | Flexible |

## Workflow

The standard workflow progression:

```
brainstorm → write-plan → tdd → execute-plan → review → verify → finish
```

For complex features where misinterpretation by an implementing agent would be expensive (cross-plugin, multiple user stories, contractual surface, multiple agents in parallel), use the heavier-weight SDD entry point:

```
spec (specify → clarify → plan → tasks → challenge → validate) → execute-plan → review → verify → finish
```

`/spec` produces `tasks.md` directly, so `/execute-plan` runs against it without a separate `/write-plan` step. Use the decision tree in `skills/spec-driven-development/references/sdd-decision-tree.md` to choose.

Steps may be skipped with justification, but the ORDER must never be violated. You cannot execute before planning, or finish before verifying.

## Agent Roster

| Agent | Role |
|-------|------|
| orchestrator | Detects project type, routes tasks, enforces workflow |
| arch-reviewer | Reviews architecture compliance |
| code-reviewer | Reviews code quality (SOLID, DRY, KISS) |
| security-auditor | Reviews security (OWASP, secrets, injection) |
| test-automator | Identifies test coverage gaps, validates test quality |
| debugger | Structured debugging (reproduce, isolate, hypothesize, verify, fix) |
| design-patterns | Pattern selection, anti-pattern detection, refactoring guidance |
| spec-challenger | Adversarial spec review with cited evidence (anti-sycophancy) |
| spec-validator | Deterministic structural validation of spec/plan/tasks (coverage, gates, paths) |
| grafana-engineer | Grafana / Prometheus / Loki / OpenTelemetry — dashboards, PromQL/LogQL, alerts, OTel pipelines, log ingestion (reads latest docs via context7 MCP) |

## Skill Types

- **Rigid**: Follow the skill's process exactly as written. Do not skip steps, do not improvise.
- **Flexible**: Adapt the skill's guidance to the specific context. Use judgment on which parts apply.

## Red Flags

Watch for these rationalizations. If you catch yourself thinking any of them, STOP and follow the skill instead:

| Rationalization | Reality |
|----------------|---------|
| "This is too simple for TDD" | Simple things are fastest to TDD. No excuse. |
| "I'll add tests after" | You won't. And if you do, they'll be weaker. |
| "The plan is in my head" | Write it down. Plans catch gaps that heads miss. |
| "Just a quick fix" | Quick fixes without tests become recurring bugs. |
| "I know this code well enough to skip review" | That's when you miss things. Review anyway. |
| "It works on my machine" | Verify. Run the tests. Check the linter. |

## Support Commands

Available anytime during a session:
- `/debug` — Switch to structured debugging mode
- `/brainstorm` — Switch to collaborative exploration mode
- `/interrogate` — Stress-test a plan or design through adversarial interview
- `/interrogate-with-docs` — Same with glossary sharpening and ADR creation
- `/terse` — Toggle ultra-compressed communication mode
- `/orient` — Quick codebase map at a higher abstraction level
- `/handoff` — Compact conversation for the next session
- `/prototype` — Build throwaway code to answer a design question
- `/improve-codebase-architecture` — Find deepening opportunities in the codebase
- `/async-audit` — Audit async code for races, deadlocks, leaks, and cancellation safety
