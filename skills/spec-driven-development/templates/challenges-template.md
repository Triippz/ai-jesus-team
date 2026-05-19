# Spec Challenge Report: [FEATURE NAME]

**Reviewer:** spec-challenger agent
**Generated:** [YYYY-MM-DD HH:MM]
**Spec version:** [git ref or commit hash]
**Constitution:** `docs/spec/constitution.md` v[X.Y.Z]

> This report is adversarial by design. Findings without evidence are themselves CRITICAL.
> Engineer disposition is recorded per finding; rejected findings require rationale.

---

## Summary

| Severity | Count | Open | Resolved | Rejected (with rationale) |
|----------|-------|------|----------|---------------------------|
| CRITICAL | N | N | N | N |
| HIGH | N | N | N | N |
| MEDIUM | N | N | N | N |
| LOW | N | N | N | N |

**Verdict:** [BLOCKED / CONDITIONAL / READY]

- BLOCKED: ≥1 open CRITICAL.
- CONDITIONAL: zero open CRITICAL, ≥1 open HIGH.
- READY: zero open CRITICAL or HIGH.

---

## Findings

| ID | Severity | Category | Location | Evidence | Recommendation | Engineer disposition |
|----|----------|----------|----------|----------|-----------------|----------------------|
| C1 | CRITICAL | [Constitution-violation / Coverage-gap / Contradiction / Missing-test] | [spec.md §FR-007 / plan.md §1.1 / tasks.md T011] | [Concrete citation: file:line, git ref, RFC, or explicit reductio quoting both contradictory passages] | [Specific change to make: rewrite FR-007 to comply with Article III, OR add Complexity Tracking entry justifying deviation] | _(engineer fills in: ACCEPTED — spec updated in commit X / REJECTED — rationale)_ |
| H1 | HIGH | Untestable-acceptance | spec.md §US1 AS-2 | "system feels responsive" — vague adjective without quantification; constitution Article II forbids; Augment Code SDD guide §"Forcing Explicit Uncertainty Markers": *"Vague adjectives without quantification fail the testable-and-unambiguous gate."* | Replace with a measurable acceptance: `p95 user-perceived latency ≤ 150 ms at 1000 concurrent users, measured via [tool]` | |
| M1 | MEDIUM | Terminology-drift | spec.md §FR-003 vs. plan.md §Storage | spec.md uses "album"; plan.md §Storage uses "collection" for the same concept | Pick one term; update the other and tasks.md | |
| L1 | LOW | Style | spec.md §Edge Cases | EC-002 missing measurable expected outcome | Specify the conflict-resolution behaviour | |

---

## Categories

A finding's category determines its expected severity floor:

| Category | Floor | Example |
|----------|-------|---------|
| Constitution-violation | CRITICAL | FR contradicts a project-constitution article without Complexity Tracking |
| Coverage-gap | CRITICAL | FR or SC has zero corresponding tasks |
| Independent-MVP-failure | CRITICAL | A P1 user story has empty or non-specific Independent Test |
| Test-coverage gap | CRITICAL | Implementation task exists without a preceding test task for the same behaviour |
| Contradiction | HIGH | Two parts of spec/plan/tasks state mutually exclusive things |
| Untestable-acceptance | HIGH | Acceptance scenario uses vague language without measurable threshold |
| Vague-adjective | HIGH | Spec uses fast, scalable, secure, robust without quantification |
| Speculative-feature | HIGH | Requirement not traceable to a user story |
| Cross-plugin-undefined | HIGH | Cross-Plugin Surfaces section omits an obligation for an affected plugin |
| Terminology-drift | MEDIUM | Same concept named differently across artifacts |
| Edge-case-missing | MEDIUM | Edge case category (zero-state, boundary, concurrency, malicious) absent for a flow with state mutation |
| Style / wording | LOW | Improvement to clarity that does not affect implementation correctness |

---

## Pass Coverage

The challenger ran the following passes; each pass is reported even if it produced zero findings.

| Pass | Findings | Notes |
|------|----------|-------|
| Vague-adjective scan | N | Words flagged: [list] |
| Contradiction scan | N | Pair-checked sections: [list] |
| Constitution-violation scan | N | Articles checked: I, II, III, [others] |
| Speculative-feature scan | N | FRs without user-story traceability: [list] |
| Test-coverage scan | N | FRs without test tasks: [list] |
| Edge-case completeness | N | Categories checked: zero-state, boundary, concurrency, malicious-input |
| Independent-test integrity | N | P1 stories with empty/non-specific Independent Test: [list] |
| Cross-plugin contract scan | N | Plugins listed in Cross-Plugin Surfaces: [list] |

---

## Engineer Acknowledgement

I have reviewed every finding above and either:

- accepted it and updated the spec/plan/tasks (citing the commit hash), OR
- rejected it with a recorded rationale.

Signed: _____________________ Date: _________
