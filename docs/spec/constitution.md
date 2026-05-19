# dev-ai-utilities spec constitution

**Version:** 1.0.0
**Ratified:** 2026-05-17
**Last Amended:** 2026-05-17

## Purpose

dev-ai-utilities is a personal Claude Code plugin marketplace that generates, installs, and maintains self-contained project plugins for multiple repositories spanning various tech stacks (Rust, Flutter, Python/Django, Go, Deno/Hono, and others). The codebase produces plugins via a template factory, enforces conformance via drift detection, and serves personal side projects. Consumers depend on generated plugins for deterministic AI-assisted development workflows.

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

### Article IV — Simplicity Gate

The implementation MUST use the smallest project structure that solves the problem. Adding a new project, library, or service requires a recorded Complexity Tracking entry with a rejected-alternative analysis.

**Why:** Plugin ecosystems grow complex fast. Every new abstraction layer, template engine feature, or configuration knob has a maintenance cost multiplied by the number of generated plugins.

**How to verify:** Project Structure section in plan.md uses the chosen structure unmodified, OR Complexity Tracking has an entry per added piece.

### Article V — Idempotency

All scaffold, install, generate, repair, and conformance operations MUST be idempotent. Re-running any operation with the same input MUST NOT alter previously-produced output. Every operation MUST report its effect as one of: `created`, `updated`, `skipped`, `protected`, `merged`, `conflicted`.

**Why:** Plugin consumers re-run install/repair in CI, on session start, and during onboarding. Non-idempotent operations corrupt user-modified files, duplicate hook registrations, or produce different plugins on different machines.

**How to verify:** Tests run each operation twice with identical input and assert zero filesystem diff between runs. Every operation function returns a status enum, not void.

### Article VI — Determinism

Two runs of the generator against the same input (profile content hash + template version) MUST produce byte-identical artifacts. Generated files MUST NOT contain timestamps, random IDs, session-dependent values, or machine-specific paths. The only exception is the install-state manifest, which records a generation timestamp for audit purposes.

**Why:** Non-deterministic generation makes drift detection meaningless — every doctor run would flag false positives. Deterministic output enables content-hash-based caching and CI reproducibility.

**How to verify:** CI job runs generate twice, computes SHA-256 of the output directory, asserts equality. Install-state timestamp is excluded from the hash.

### Article VII — Schema Validation

All structured output MUST validate against a declared JSON schema before being written to disk. This includes: review agent JSON envelopes, install-state manifests, project profiles, hook registrations, and conformance reports. Schemas use JSON Schema draft/2020-12. `additionalProperties: false` is the default for all object schemas.

**Why:** Unvalidated structured output is the primary source of silent failures in multi-agent systems. A review agent that adds an undeclared field breaks downstream aggregation. A profile with a typo'd key silently produces a wrong plugin.

**How to verify:** Every write of a structured file is preceded by an AJV validation call. CI runs schema validation on every committed structured file. Schema files live in `schemas/` and are themselves validated.

### Article VIII — Conformance Tracking

Every generated plugin MUST include an install-state manifest recording every file, its source template, and its write strategy (`overwrite`, `skip_if_exists`, `deep_merge`). Every installation into a project repo MUST produce a conformance state file enabling drift detection. The doctor command MUST be able to report the full conformance status of any installed plugin without network access.

**Why:** Without conformance tracking, generated plugins drift silently as team members edit files, hooks get deregistered, or CLAUDE.md gets overwritten. Drift detection is the mechanism that makes the template factory trustworthy over time.

**How to verify:** Doctor command runs against a freshly-installed plugin and reports all files as `ok`. A test then modifies one file and re-runs doctor, asserting it reports `drifted` for exactly that file.

## Gates

| Gate | Article | Pass Criteria | Failure Remedy |
|------|---------|----------------|----------------|
| Test-First | I | tasks.md shows test task IDs preceding the first implementation task ID for the same behaviour | Re-order tasks.md or add missing test tasks |
| Evidence | II | spec-challenger vague-adjective scan returns zero HIGH findings | Quantify each flagged adjective |
| CRITICAL-Resolved | III | spec-validator verdict is READY | Resolve every CRITICAL finding or rewrite the spec |
| Simplicity | IV | Project Structure section in plan.md uses the chosen structure unmodified, OR Complexity Tracking has an entry per added piece | Either justify each violation or remove the addition |
| Idempotency | V | Every operation tested with duplicate-run assertion; every function returns a status enum | Add status reporting and duplicate-run tests |
| Determinism | VI | CI generate-twice-and-hash job passes | Remove non-deterministic content from templates |
| Schema-Validated | VII | CI schema validation passes on all structured files with zero errors | Fix schema violations or update schemas |
| Conformance-Tracked | VIII | Doctor command reports all files as `ok` on fresh install; reports `drifted` correctly after modification | Add missing install-state entries or fix doctor logic |

## Amendment Process

The constitution is amended via PR to `docs/spec/constitution.md` with reviewer approval. It is not amended via the spec-generation flow. Amendments increment the Version field per semantic versioning:

- **MAJOR:** an article is removed or its meaning is reversed.
- **MINOR:** a new article is added or an existing article gains a new gate.
- **PATCH:** wording, clarifications, typo fixes.

The Last Amended field is set to the date of merge.
