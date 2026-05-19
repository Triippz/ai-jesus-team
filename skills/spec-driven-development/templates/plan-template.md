# Implementation Plan: [FEATURE]

**Feature Branch:** `[NNN-feature-slug]`
**Date:** [YYYY-MM-DD]
**Spec:** [link to spec.md]
**Constitution:** `docs/spec/constitution.md` v[X.Y.Z]

This plan describes HOW the feature will be built. The WHAT lives in spec.md. Tasks (DO-THIS) live in tasks.md.

## Summary

[One paragraph: the feature's primary requirement (from spec.md) plus the technical approach in 3-5 sentences. No code; no API signatures.]

---

## Technical Context

| Field | Value |
|-------|-------|
| Language / Version | [e.g., Rust 1.87 (Edition 2024), Dart 3.x, Python 3.11+] |
| Primary Dependencies | [Named libraries with version constraints — e.g., `axum 0.7`, `flutter_bloc 8.x`, `Django 4.2`] |
| Storage | [PostgreSQL, SQLite via Drift, NATS JetStream, S3 — or N/A] |
| Testing | [pytest, cargo test, flutter test, bats] |
| Target Platform | [Linux server, iOS 17+, Android 13+, Web, macOS] |
| Project Type | [single library / cli / web service / mobile app / multi-package] |
| Performance Goals | [Quantified — e.g., "p95 latency ≤150ms at 1000 RPS"] |
| Constraints | [Hard constraints — e.g., "memory ≤512MB", "offline-capable", "FIPS-140 ciphers only"] |
| Scale / Scope | [Quantified — e.g., "10k concurrent users; 1M items; 50 screens"] |

> Unknowns are marked `NEEDS CLARIFICATION` and resolved by Phase 0 research.

---

## Constitution Check

Each gate is a checkbox. Failed gates require a Complexity Tracking entry below. Article numbers refer to `docs/spec/constitution.md`.

- [ ] **Gate I — Test-First:** tasks.md will list every test task ID before the implementation task that depends on it.
- [ ] **Gate II — Evidence-Driven:** spec-challenger's vague-adjective scan returns zero HIGH findings against this plan.
- [ ] **Gate III — CRITICAL-Resolved:** No open CRITICAL findings.
- [ ] **Gate IV — Independent MVP:** Each P1 user story has a non-empty Independent Test field.
- [ ] **Gate V — Simplicity:** Project structure uses the smallest layout that solves the problem (or Complexity Tracking justifies each addition).
- [ ] **Gate VI — Anti-Abstraction:** Frameworks are used directly. New abstractions have a Why-Needed entry.
- [ ] **Gate VII — Integration-First:** Contract tests precede implementation for cross-boundary requirements.
- [ ] **Gate VIII — Observability:** Structured log fields and metric names are listed below.
- [ ] **Gate IX — [Project-specific]:** [As defined in constitution.]

---

## Project Structure

The chosen layout, with the *real* directories the work will touch. Remove any options you did not choose.

```
[paste the chosen structure with concrete paths — not the placeholder tree from spec-kit]

# Example for a single-package Rust crate addition:
crates/feature-x/
├── src/
│   ├── domain/         # Pure value objects + entities
│   ├── ports/          # Trait definitions
│   ├── adapters/       # Infrastructure implementations
│   └── lib.rs
└── tests/
    ├── contract/
    ├── integration/
    └── unit/
```

**Structure Decision:** [Why this layout — one paragraph. Reference the constitution gates this satisfies.]

---

## Phase 0 — Research

For each `NEEDS CLARIFICATION` from Technical Context, for each new dependency, and for each integration, dispatch a research task. Output goes to `research.md` (created on engineer request only).

```
For each NEEDS CLARIFICATION in Technical Context:
  Research task: "Resolve {unknown} for {feature}; output Decision/Rationale/Alternatives"
For each new dependency:
  Research task: "Best practices for {dependency} in {project type}; output Decision/Rationale/Alternatives"
For each integration:
  Research task: "Patterns for {integration} between {systems}; output Decision/Rationale/Alternatives"
```

Each `research.md` entry uses this format:

- **Decision:** What was chosen.
- **Rationale:** Why, with citations.
- **Alternatives considered:** What else was evaluated and why it was rejected.

---

## Phase 1 — Design & Contracts

### 1.1 Data Model

If the feature involves persisted entities, list them here in plain prose. (Schema specifics live in `data-model.md` if the engineer requests one.)

- **[Entity 1]:** Fields, relationships, validation rules from FR-N, lifecycle/state transitions.
- **[Entity 2]:** As above.

### 1.2 Interface Contracts

If the feature exposes interfaces (HTTP API, CLI, gRPC, library API, message schema), declare them here at the contract level.

- **[Contract 1]:** [What it is, who calls whom, schema reference (`contracts/foo.yaml` if engineer requested artifact); idempotency, error model, versioning.]
- **[Contract 2]:** As above.

### 1.3 Cross-Cutting Concerns

#### Observability

- **Log fields:** [Named structured-log fields the implementation MUST emit — e.g., `request_id`, `user_id`, `feature.x.duration_ms`.]
- **Metric names:** [Named metrics — e.g., `feature_x_upload_total{status}`, `feature_x_latency_seconds_bucket`.]
- **Trace spans:** [Named spans for distributed traces.]

#### Security

- **Trust boundary:** [Which inputs cross a trust boundary; how each is validated.]
- **Authentication:** [How callers prove identity; references to existing auth.]
- **Authorisation:** [How access decisions are made; references to existing policy.]
- **Secrets:** [What secrets are required; how they are loaded; never inlined.]

#### Failure Modes

- **Retries:** [What is retried, with what policy; idempotency requirements.]
- **Backoff / circuit-breaker:** [Where applied.]
- **Graceful degradation:** [What happens when a dependency is down.]
- **Data integrity:** [How partial failures are reconciled.]

---

## Complexity Tracking

> Fill in only when a Constitution gate fails. Empty section means all gates passed.

| Violated Gate | Why Needed | Simpler Alternative Rejected Because |
|---------------|------------|--------------------------------------|
| [e.g., Gate V — added 4th project] | [Concrete reason] | [Why 3 projects don't solve it] |
| [e.g., Gate VI — wrapped framework] | [Concrete reason] | [Why direct use doesn't solve it] |

---

## Optional Artifacts

These files are created on engineer request, not by default. They reduce review burden when not needed.

- [ ] `data-model.md` — detailed schema, types, indices.
- [ ] `contracts/<name>.yaml` — OpenAPI / AsyncAPI / gRPC IDL / Postcard schema.
- [ ] `research.md` — Phase 0 findings.
- [ ] `quickstart.md` — minimum-viable validation walkthrough an engineer can run end-to-end.
