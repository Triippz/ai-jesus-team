# ai-jesus-team — agent instructions

This file provides guidance to codex-compatible agents working in this repository.

## project overview

Personal plugin factory and workflow toolkit for Claude Code. Generates self-contained, stack-tailored plugins from project profiles.

## common commands

```bash
node scripts/generate.js --profile profiles/nuv.json
node scripts/install-plugin.js --plugin generated/nuv-superpowers --target <path>
node scripts/doctor.js --target <path>
node scripts/repair.js --target <path> --source generated/nuv-superpowers
npm test
make test
```

## commit message format

Required format: `type: [scope] description`

Allowed types: `feat`, `fix`, `perf`, `build`, `ci`, `docs`, `refactor`, `test`

Do not include AI tool names in commit messages.

## workflow

```
brainstorm → write-plan → tdd → execute-plan → review → verify → finish
```

## agent catalog

### team agents

| Agent | File | Role |
|-------|------|------|
| orchestrator | orchestrator.md | Central dispatcher, model routing, phase protocols |
| arch-reviewer | arch-reviewer.md | Architecture compliance, dependency direction |
| code-reviewer | code-reviewer.md | Code quality (SOLID, DRY, KISS) |
| security-auditor | security-auditor.md | OWASP top 10, secrets, injection |
| test-automator | test-automator.md | Test strategy, coverage gaps |
| debugger | debugger.md | Structured debugging (reproduce → isolate → fix) |
| design-patterns | design-patterns.md | Pattern selection, anti-pattern detection |
| spec-challenger | spec-challenger.md | Adversarial spec review |
| spec-validator | spec-validator.md | Structural spec validation |
| grafana-engineer | grafana-engineer.md | Observability, dashboards, alerts |
| protobuf-expert | protobuf-expert.md | Proto schema review, evolution safety |

### review agents (in generated plugins)

| Agent | Model | Scope |
|-------|-------|-------|
| complexity-review | haiku | Function length, cyclomatic complexity, nesting, parameters |
| naming-review | haiku | Naming conventions, magic values |
| concurrency-review | sonnet | Race conditions, thread safety, async correctness |
| domain-review | opus | Anemic models, boundary violations, DDD health |
| test-review | sonnet | Test quality (Farley Score), framework patterns |
| structure-review | sonnet | File/module organization |
| spec-compliance-review | sonnet | Implementation vs spec, scope creep |
| performance-review | haiku | Performance anti-patterns, N+1 queries |
| doc-review | sonnet | Documentation accuracy, stale docs |
| progress-guardian | haiku | Loop detection, stuck agents |

## design principles

- Idempotent: re-run = zero changes
- Deterministic: same input = byte-identical output
- Schema-validated: all structured output validated before writing
- Test-first: no implementation without failing tests
