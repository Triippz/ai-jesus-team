# [PROJECT NAME] Spec Constitution

**Version:** 0.1.0
**Ratified:** YYYY-MM-DD
**Last Amended:** YYYY-MM-DD

## Purpose

[One paragraph: what this codebase is, what kinds of features it ships, who depends on it. Anchor the reader before listing principles.]

## Articles

Articles are non-negotiable. They use RFC 2119 keywords (MUST, MUST NOT, SHOULD, SHOULD NOT, MAY). The first three articles are required by this repo and may not be removed; they only ever expand.

### Article I — Test-First (NON-NEGOTIABLE)

Production code MUST NOT be written before a failing test exists. The Red-Green-Refactor cycle is enforced. The /tdd skill is the implementation of this article.

**Why:** Without this article, AI-generated code is reviewed against a specification it has already shaped its own assumptions around. Tests written first are the only defensible record of what behaviour was actually asked for.

**How to verify:** spec-validator inspects each task in tasks.md and confirms test tasks precede implementation tasks for the same behaviour.

### Article II — Specs Are Evidence-Driven

Every requirement, constraint, performance target, and architectural choice MUST be either (a) quantified, (b) cited to a source (file:line, RFC, benchmark, prior incident, or stakeholder decision), or (c) marked as an explicit Assumption with the engineer's rationale. Vague adjectives (fast, scalable, secure, robust, intuitive, lightweight, modern, simple, efficient) MUST NOT appear without an adjacent quantification.

**Why:** Vague language is the single largest source of agent misinterpretation. "Fast" cannot generate code; "p95 latency under 150 ms at 1000 RPS" can.

**How to verify:** spec-challenger runs a vague-adjective scan over spec.md and reports each violation as a HIGH finding.

### Article III — Hard-Fail on CRITICAL Findings

A spec MUST NOT advance to implementation while any CRITICAL finding from spec-challenger or spec-validator is unresolved. CRITICAL findings include: constitution-article violations without recorded Complexity Tracking justification; functional requirements with zero task coverage; user stories without an Independent Test definition; contradictions between spec.md, plan.md, and tasks.md.

**Why:** Soft-failing CRITICAL findings is how SDD degrades into vibe coding with extra paperwork.

**How to verify:** spec-validator's verdict is `BLOCKED` if any CRITICAL is open.

---

[Add additional articles below. Common candidates — adopt only the ones that apply to this project.]

### Article IV — Independent User Stories (recommended)

Every user story prioritised P1 MUST be independently testable: implementing only that story MUST yield a viable MVP that delivers the user the value the spec promises.

### Article V — Simplicity Gate (recommended)

The implementation MUST use the smallest project structure that solves the problem. Adding a new project, library, or service requires a recorded Complexity Tracking entry with a rejected-alternative analysis.

### Article VI — Anti-Abstraction (recommended)

The implementation SHOULD use framework features directly rather than wrapping them. New abstractions are justified only by repeated concrete need (the rule of three).

### Article VII — Integration-First Testing (recommended)

For features that cross process or service boundaries, contract tests MUST be written before implementation. Mocks are acceptable only for external I/O.

### Article VIII — Observability (recommended)

Production behaviour MUST be observable through structured logs and metrics. Logging fields and metric names are defined in plan.md.

### Article IX — [Project-specific article]

[Author your own. Examples: "All persistent storage uses PostgreSQL — no per-feature database additions"; "All public APIs are versioned with /vN prefix"; "All P2P messages are signed and idempotent."]

## Gates

Each article that the plan template's Constitution Check section must verify, with explicit pass criteria.

| Gate | Article | Pass Criteria | Failure Remedy |
|------|---------|----------------|----------------|
| Test-First | I | tasks.md shows test task IDs preceding the first implementation task ID for the same behaviour | Re-order tasks.md or add missing test tasks |
| Evidence | II | spec-challenger vague-adjective scan returns zero HIGH findings | Quantify each flagged adjective |
| CRITICAL-Resolved | III | spec-validator verdict is READY | Resolve every CRITICAL finding or rewrite the spec |
| Independent-MVP | IV | Each P1 user story has a non-empty Independent Test field | Rewrite Independent Test as a specific action + value-delivered statement |
| Simplicity | V | Project Structure section in plan.md uses the chosen structure unmodified, OR Complexity Tracking has an entry per added piece | Either justify each violation or remove the addition |
| Anti-Abstraction | VI | New abstractions in plan.md have a Why-Needed entry | Same |
| Integration-First | VII | Cross-boundary FRs have contract test tasks before implementation tasks | Add the missing contract tests |
| Observability | VIII | plan.md lists log fields and metric names | Add them |

## Amendment Process

The constitution is amended via PR to `docs/spec/constitution.md` with reviewer approval. It is not amended via the spec-generation flow. Amendments increment the Version field per semantic versioning:

- **MAJOR:** an article is removed or its meaning is reversed.
- **MINOR:** a new article is added or an existing article gains a new gate.
- **PATCH:** wording, clarifications, typo fixes.

The Last Amended field is set to the date of merge.
