# nuv


**Stack:** typescript / hono
{% else %}
**Stack:** typescript


## Slash Commands

| Command | Purpose |
|---|---|
| `/brainstorm` | Explore requirements and design before writing code |
| `/spec` | Author a granular spec/PRD for complex features |
| `/write-plan` | Produce a step-by-step implementation plan |
| `/tdd` | Write failing tests first |
| `/execute-plan` | Implement against an approved plan with TDD enforcement |
| `/debug` | Investigate bugs before proposing fixes |
| `/review` | Dispatch the full review agent suite |
| `/verify` | Run tests, linter, and type checker |
| `/finish` | Update docs and prepare branch for merge |

## Agent Catalog

### Team Agents

| Agent | Model | Role |
|---|---|---|
| orchestrator | Sonnet | Central dispatcher — workflow routing and phase gating |

### Review Agents

| Agent | Model | Role |
|---|---|---|
| spec-compliance-review | Sonnet | First gate — verifies spec coverage and blocks scope creep |
| structure-review | Sonnet | File/module organization and separation of concerns |
| complexity-review | Haiku | Function length, cyclomatic complexity, nesting depth |
| naming-review | Haiku | Identifier naming conventions for typescript |
| performance-review | Haiku | Hot-path structural patterns and performance anti-patterns |
| progress-guardian | Haiku | Detects AI shortcuts and stubs that bypass real implementation |
| test-review | Sonnet | Farley Score test quality assessment |
| doc-review | Sonnet | Documentation completeness and accuracy |
| concurrency-review | Sonnet | Async/concurrent code correctness |
| domain-review | Opus | Domain model health and DDD pattern compliance |

### Core Agents (core-superpowers)

| Agent | Role |
|---|---|
| security-auditor | Security vulnerabilities and attack surface analysis |
| arch-reviewer | Architectural integrity and structural decisions |
| code-reviewer | Code quality and readability |
| debugger | Bug investigation and root cause analysis |

## Workflow

```
brainstorm → write-plan → tdd → execute-plan → review → verify → finish
```

`/spec` replaces `brainstorm + write-plan` for complex or contractual work.
`/execute-plan` refuses to start without pre-written tests from `/tdd`.

## Build and Test Commands






```bash
deno test
deno lint
deno fmt
deno check **/*.ts
```



## Commit Format


```
type(scope): description
```
{% else %}
```
type: [scope] description

Allowed types: feat, fix, docs, refactor, test, perf, build, ci, chore
```

