# Feature Specification: [FEATURE NAME]

**Feature Branch:** `[NNN-feature-slug]`
**Created:** [YYYY-MM-DD]
**Status:** Draft
**Input:** Engineer's original description: "$ARGUMENTS"

> **Spec authoring rules** (from the project constitution):
> - Focus on **WHAT** users need and **WHY**. No HOW (no tech stack, APIs, frameworks, code structure) — that lives in plan.md.
> - Every requirement must be testable and unambiguous. Vague adjectives (fast, scalable, secure, robust) without adjacent quantification fail Article II.
> - User stories are prioritised P1/P2/P3 and each must be independently testable (Article IV).
> - **No silent defaults.** The agent applies project-wide defaults only when they appear in `docs/spec/defaults.md` and cites the catalog ID in `## Defaults Applied`. Anything else the engineer didn't specify becomes `[NEEDS CLARIFICATION]`. There is no per-spec budget on these markers — work them through `/spec clarify` in batches of 5.

---

## User Scenarios & Testing *(mandatory)*

User stories are ordered by priority. P1 is the MVP — if you implement only User Story 1 you must still ship something the user can use and that delivers the value this feature promises.

### User Story 1 — [Brief Title] (Priority: P1)

[Describe the user journey in plain language. Who is the user, what do they do, what do they get?]

**Why this priority:** [Explain why this story is P1 and what fails to ship if it isn't built.]

**Independent Test:** [Specific action + value delivered. Example: "Engineer can run `/photos upload --file=x.jpg` and see the photo appear in the default album within 2 seconds — verifies that upload, default-album-routing, and listing work end-to-end."] This field MUST NOT be empty; spec-challenger flags an empty Independent Test as CRITICAL.

**Acceptance Scenarios:**

1. **Given** [initial state], **When** [action], **Then** [expected outcome with measurable detail]
2. **Given** [initial state], **When** [action], **Then** [expected outcome]
3. **Given** [edge condition], **When** [action], **Then** [expected outcome]

---

### User Story 2 — [Brief Title] (Priority: P2)

[Describe the user journey.]

**Why this priority:** [Why P2 not P1, what it adds beyond MVP.]

**Independent Test:** [Specific action + value delivered.]

**Acceptance Scenarios:**

1. **Given** […], **When** […], **Then** […]

---

### User Story 3 — [Brief Title] (Priority: P3)

[As above. Add more stories as needed; keep priorities meaningful — if everything is P1, nothing is.]

**Why this priority:** […]

**Independent Test:** […]

**Acceptance Scenarios:**

1. **Given** […], **When** […], **Then** […]

---

### Edge Cases

Each edge case is a specific, named scenario the system must handle correctly. Generic "handles errors gracefully" is not acceptable.

- **EC-001:** [Boundary condition — e.g., "User uploads a 5GB photo when storage tier is 1GB."] Expected: [specific behaviour].
- **EC-002:** [Concurrency — e.g., "Two users add the same photo to the same album simultaneously."] Expected: [specific behaviour, including conflict resolution].
- **EC-003:** [Failure mode — e.g., "Storage backend returns 500 mid-upload."] Expected: [specific behaviour, including any retry policy].
- **EC-004:** [Empty/zero state — e.g., "User opens album list when no albums exist."] Expected: [specific behaviour].
- **EC-005:** [Malicious input — e.g., "User uploads a file claiming to be JPEG but containing a script."] Expected: [specific behaviour].

---

## Functional Requirements *(mandatory)*

Each FR is a single testable statement. Vague language is forbidden.

- **FR-001:** System MUST [specific capability with measurable parameters].
- **FR-002:** Users MUST be able to [specific interaction]; on failure the system MUST [specific behaviour].
- **FR-003:** System MUST persist [specific data] across [specific lifetime] with [specific durability guarantee].
- **FR-004:** System MUST emit [specific event/log/metric] when [specific condition].
- **FR-005:** [Add as many as the feature requires; do not pad.]

If any FR cannot yet be quantified, mark it explicitly:

- **FR-006:** System MUST authenticate users via [NEEDS CLARIFICATION: auth method not stated by engineer; not in defaults catalog].
- **FR-007:** System MUST retain user data for [NEEDS CLARIFICATION: retention period not stated by engineer; D-DATA-1 in defaults catalog says "industry-standard for the domain" — engineer to confirm or override].

> No marker budget. Every gap is flagged. The engineer works through them in `/spec clarify` (batches of 5 high-impact questions per session).

---

## Success Criteria *(mandatory)*

Each SC is **measurable**, **technology-agnostic**, **user- or business-focused**, and **verifiable** without knowing the implementation.

- **SC-001:** [Measurable user-facing outcome — e.g., "95% of users complete photo upload in under 10 seconds on a 10 Mbps connection."]
- **SC-002:** [Measurable system outcome — e.g., "System sustains 1000 concurrent uploads without degradation in p95 latency."]
- **SC-003:** [Measurable business outcome — e.g., "Album creation per user increases by 30% within 4 weeks of launch."]

> **Forbidden:** SCs that name frameworks ("React renders in <16ms"), databases ("Postgres query <50ms"), or tools ("Redis hit rate >80%"). Translate to a user-facing metric.

---

## Key Entities *(include only when feature involves data)*

Describe domain entities without implementation language. No types, no SQL, no framework.

- **[Entity 1]:** [What it represents; key attributes; key relationships to other entities; lifecycle/state transitions if any.]
- **[Entity 2]:** [As above.]

---

## Assumptions

Statements the engineer made (or accepted from the defaults catalog) that this spec depends on. Each assumption is reviewable in `/spec clarify`. The agent never invents an assumption — it only records what the engineer stated or what the catalog supplied.

- [Engineer-stated assumption, e.g., "Primary users have stable broadband; mobile-on-cellular is out of scope for v1."]
- [Engineer-stated assumption, e.g., "Albums never nest within other albums."]
- [Engineer-stated assumption, e.g., "Authentication uses the existing user-profile service; this spec does not introduce a new auth mechanism."]

### Defaults Applied

The agent records every default it pulled from `docs/spec/defaults.md` here, with its catalog ID, so the engineer can audit at a glance what the agent applied without explicit instruction.

- [e.g., `D-AUTH-1` — applied to FR-006 (authentication mechanism for new public APIs).]
- [e.g., `D-OBS-1` — applied to plan.md §1.3 Observability (required structured-log fields).]

### Defaults Overridden

When the engineer's input conflicted with the defaults catalog, the engineer's input wins; the conflict is recorded here.

- *(empty)*

---

## Out of Scope

The out-of-scope list matters at least as much as the in-scope list. Without it, agents expand scope to fill the gap.

- [What this feature explicitly does NOT do — e.g., "Does not support photo editing; users edit elsewhere and re-upload."]
- [What is deferred to a later release.]
- [What is owned by another team or feature.]

---

## Dependencies

External services, APIs, libraries, or other features this spec depends on. Each dependency includes its failure mode.

- **[Dependency 1]:** [What it provides; what happens if it is unavailable.]
- **[Dependency 2]:** [As above.]

---

## Constitution Addenda *(optional)*

Feature-only principles that don't contradict the project constitution. Use sparingly; most rules belong in the project constitution.

- [Optional Article F-1: e.g., "All photos are stored encrypted at rest; this spec does not introduce unencrypted storage paths."]

---

## Cross-Plugin Surfaces *(optional, only when feature crosses plugin boundaries)*

When a feature touches more than one plugin in this repo (e.g., frontend + backend, Rust SDK + Flutter app), list every affected plugin and the explicit obligations on each side.

| Plugin | Obligations | Owner |
|--------|--------------|-------|
| `plugins/my-backend/` | New endpoint POST /api/v2/photos with response schema X | […] |
| `plugins/my-frontend/` | Updated PhotoUploadBloc consumes the new endpoint with retry/backoff Y | […] |

---

## Clarifications

Filled in by `/spec clarify`. Each session of clarification appends here as the engineer answers questions.

### Session [YYYY-MM-DD]

- *(filled by /spec clarify)*
