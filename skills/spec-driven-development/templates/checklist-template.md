# [DOMAIN] Quality Checklist: [FEATURE NAME]

**Purpose:** Validate that the **requirements** for [DOMAIN] are well-written, complete, unambiguous, and ready for implementation. This is **not** a verification checklist for code or behaviour — it tests the spec itself.
**Created:** [YYYY-MM-DD]
**Spec:** [link to spec.md]

> **The "unit tests for English" principle.** Every item is a *question about the requirements*, not an action to perform on the running system.
>
> ✅ "Are visual hierarchy requirements defined for all card types?" `[Completeness]`
> ❌ "Verify the cards render correctly" *(this is integration testing, not requirements validation)*
>
> Each item includes a quality dimension tag in brackets: `[Completeness]`, `[Clarity]`, `[Consistency]`, `[Coverage]`, `[Measurability]`, `[Edge Case]`, `[Gap]`, `[Ambiguity]`, `[Conflict]`, `[Assumption]`.
>
> ≥80% of items must include a traceability reference: `[Spec §FR-003]`, `[Spec §SC-002]`, `[Spec §US1-AS-1]`.

---

## Requirement Completeness

- [ ] CHK001 Are all primary user flows for this feature covered by a P1, P2, or P3 user story? `[Completeness, Spec §User Scenarios]`
- [ ] CHK002 Is every functional requirement (FR-NNN) accompanied by at least one acceptance scenario? `[Completeness]`
- [ ] CHK003 Are all data entities introduced by the feature listed in the Key Entities section? `[Completeness]`
- [ ] CHK004 Are all external dependencies named with their failure modes? `[Completeness, Spec §Dependencies]`

## Requirement Clarity

- [ ] CHK005 Is every vague adjective (fast, scalable, secure, robust, intuitive, lightweight) replaced by an adjacent quantification? `[Clarity, Constitution Article II]`
- [ ] CHK006 Does every FR contain a single testable statement (no compound "and/or" requirements)? `[Clarity]`
- [ ] CHK007 Is the meaning of every domain term consistent across spec.md, plan.md, and tasks.md? `[Clarity, Consistency]`

## Requirement Consistency

- [ ] CHK008 Do the user stories' acceptance scenarios align with the functional requirements they reference? `[Consistency]`
- [ ] CHK009 Are there any contradictory requirements (e.g., FR-A says X, FR-B says not-X)? `[Conflict]`
- [ ] CHK010 Do the success criteria align with the user stories' value propositions? `[Consistency, Spec §Success Criteria]`

## Acceptance Criteria Quality

- [ ] CHK011 Is every acceptance scenario in Given/When/Then form with measurable outcomes? `[Measurability]`
- [ ] CHK012 Are success criteria technology-agnostic (no frameworks, databases, or tools named)? `[Measurability, Spec §SC-NNN]`
- [ ] CHK013 Can every success criterion be verified without knowing the implementation? `[Measurability]`

## Scenario Coverage

- [ ] CHK014 Are the primary "happy path" scenarios covered? `[Coverage]`
- [ ] CHK015 Are alternate-flow scenarios covered (legitimate-but-non-standard paths)? `[Coverage]`
- [ ] CHK016 Are exception/error-flow scenarios covered (invalid input, dependency failure)? `[Coverage]`
- [ ] CHK017 Are recovery/rollback scenarios covered when state mutation occurs? `[Coverage, Edge Case]`

## Edge Case Coverage

- [ ] CHK018 Are zero-state edge cases defined (empty list, no data, first-run)? `[Edge Case]`
- [ ] CHK019 Are boundary edge cases defined (max size, max count, max length)? `[Edge Case]`
- [ ] CHK020 Are concurrency edge cases defined (simultaneous writes, race conditions)? `[Edge Case]`
- [ ] CHK021 Are malicious-input edge cases defined (injection, malformed data, abuse)? `[Edge Case]`

## Non-Functional Requirements

- [ ] CHK022 Are performance targets quantified for all user-facing flows? `[Measurability, Spec §SC-NNN]`
- [ ] CHK023 Are availability/reliability targets quantified? `[Measurability]`
- [ ] CHK024 Are observability requirements (logs, metrics, traces) listed in plan.md? `[Plan §1.3 Observability]`
- [ ] CHK025 Are security requirements (authn, authz, secrets, trust boundaries) listed in plan.md? `[Plan §1.3 Security]`
- [ ] CHK026 Are accessibility requirements specified for user-facing flows (when applicable)? `[Coverage]`

## Dependencies & Assumptions

- [ ] CHK027 Is every external dependency named with its expected behaviour and failure mode? `[Spec §Dependencies]`
- [ ] CHK028 Are all assumptions flagged in the Assumptions section, not buried inside FRs? `[Assumption, Spec §Assumptions]`
- [ ] CHK029 Are out-of-scope items explicitly listed? `[Spec §Out of Scope]`

## Ambiguities & Conflicts

- [ ] CHK030 Are there fewer than 4 [NEEDS CLARIFICATION] markers remaining (constitution allows ≤3)? `[Ambiguity]`
- [ ] CHK031 Has the /spec clarify session been run, with answers integrated into the spec? `[Spec §Clarifications]`
- [ ] CHK032 Are there any sections referencing concepts not defined elsewhere in the spec? `[Gap]`

---

## Notes

- Items are checked off `[x]` only when the engineer has verified the requirement quality, not when the implementation works.
- Failed items require spec edits, not code edits.
- This file is regenerated by /spec validate; engineer-added comments below this line are preserved.

## Engineer Comments
