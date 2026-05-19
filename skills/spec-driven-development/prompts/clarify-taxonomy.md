# Clarify Phase — Taxonomy and Question Protocol

This prompt guides Phase 2 of the spec-driven-development skill.

## Goal

Reduce ambiguity in `spec.md` by asking the engineer **at most 5** high-impact questions, one at a time, and integrating each answer into the spec under a `## Clarifications` section before moving on.

## Hard Limits

- Maximum **5** asked-and-accepted questions per session.
- Each question must be answerable with EITHER:
  - a multiple-choice selection (2–5 distinct, mutually exclusive options), OR
  - a one-word / short-phrase answer constrained to "≤5 words".
- A clarification retry on the same question does not count as a new question.

## Taxonomy (10 categories)

For each category, mark internal status as `Clear` / `Partial` / `Missing` while reading the spec. Only `Partial` or `Missing` categories generate candidate questions.

1. **Functional Scope & Behaviour** — core user goals, success criteria, explicit out-of-scope declarations, user roles/persona differentiation.
2. **Domain & Data Model** — entities, attributes, relationships, identity & uniqueness rules, lifecycle/state transitions, data volume & scale.
3. **Interaction & UX Flow** — critical user journeys, error/empty/loading states, accessibility, localisation.
4. **Non-Functional Quality Attributes** — performance (latency, throughput), scalability (horizontal/vertical), reliability/availability, observability (logs/metrics/traces), security/privacy (authn/authz, data protection, threat assumptions), compliance (HIPAA, GDPR, FIPS, etc.).
5. **Integration & External Dependencies** — external services/APIs and failure modes, data import/export formats, protocol/versioning assumptions.
6. **Edge Cases & Failure Handling** — negative scenarios, rate limiting/throttling, conflict resolution (e.g., concurrent writes).
7. **Constraints & Tradeoffs** — technical constraints (language, storage, hosting, region), explicit tradeoffs or rejected alternatives.
8. **Terminology & Consistency** — canonical glossary terms, avoided synonyms / deprecated terms.
9. **Completion Signals** — acceptance-criteria testability, measurable Definition of Done indicators.
10. **Misc / Placeholders** — TODO markers, ambiguous adjectives ("robust", "intuitive") lacking quantification.

## Prioritisation Rule

Among candidate questions, rank by `Impact × Uncertainty`. Impact priorities (high → low): **scope > security/privacy > user experience > technical details**. Skip any candidate where the answer would not change implementation, validation strategy, or task decomposition.

## Question Format

For multiple-choice, present:

```
**Question N: [Topic]**

**Context:** [Quote relevant spec section]

**What we need to know:** [Specific question from a Partial/Missing category]

**Recommended:** Option [X] — [1-2 sentence reasoning rooted in best practices for the project type, risk reduction, and explicit constraints in the spec]

| Option | Answer | Implications |
|--------|--------|--------------|
| A      | [First] | [What this means for the feature] |
| B      | [Second] | [What this means for the feature] |
| C      | [Third] | [What this means for the feature] |
| Custom | Provide your own answer | [How to format the response] |

You can reply with the option letter, "yes" / "recommended" to accept the recommendation, or your own short answer.
```

For short-answer, present:

```
**Question N: [Topic]**

**Context:** [Quote relevant spec section]

**Suggested:** [Best-practice answer] — [brief reasoning]

Format: short answer, ≤5 words. Reply with the suggestion ("yes" / "suggested") or your own answer.
```

## Integration Rule

After each accepted answer, **immediately** edit the spec:

- Append a bullet to `## Clarifications` → `### Session YYYY-MM-DD`: `- Q: <question> → A: <final answer>`.
- Apply the clarification to the most appropriate downstream section:
  - Functional ambiguity → update or add to Functional Requirements.
  - User-interaction / actor distinction → update User Stories.
  - Data-shape / entities → update Key Entities.
  - Non-functional constraint → update Success Criteria with a measurable target.
  - Edge case / negative flow → add to Edge Cases.
  - Terminology conflict → normalise across the spec.
- Save the spec file atomically after each integration.

## Stop Conditions

Stop asking before reaching 5 when any of these is true:

- All critical ambiguities are resolved.
- The engineer signals completion ("done", "good", "no more").
- Remaining queued items become unnecessary because earlier answers covered them.
- The engineer explicitly declines further questions.

## Final Report

After the session ends:

1. Number of questions asked and answered.
2. Path to updated `spec.md`.
3. Sections touched.
4. Coverage Summary table:

| Category | Status |
|----------|--------|
| Functional Scope & Behaviour | Clear / Resolved / Deferred / Outstanding |
| Domain & Data Model | … |
| … | … |

5. Recommendation: proceed to Phase 3 (plan), or run /spec clarify again later, or run /spec challenge first.

## Behaviour Rules

- If no meaningful ambiguities exist at start: report "No critical ambiguities detected." and recommend proceeding.
- If `spec.md` is missing: instruct engineer to run /spec specify first.
- Never reveal queued questions in advance.
- Never exceed 5 asked questions.
- Avoid speculative tech-stack questions unless the absence blocks functional clarity.
- Respect early-termination signals.
