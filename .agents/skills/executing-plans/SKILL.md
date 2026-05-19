---
name: executing-plans
description: "Use when implementing code against an existing plan with TDD enforcement."
---

# Executing Plans

## Purpose

Implement code against an existing plan and tests, following the plan steps methodically.

## Process

### 1. Review Plan and Tests
- Read the implementation plan from `docs/plans/` thoroughly
- If no plan exists, STOP and direct the user to `/write-plan` first
- Understand all existing tests (from TDD phase)
- Identify the current step to implement
- Confirm the plan with the user before starting

### 1b. Check for JIRA Linkage (Optional)
- Look for a `.jira-map.json` matching the plan in `docs/plans/`
- If found, load step-to-issue mapping and cloudId
- If not found, skip all JIRA operations silently

### 2. Implement Step by Step

For each step:

1. **Check tests exist** — if no tests for this step, REFUSE TO IMPLEMENT. Direct user to `/tdd`.
2. **JIRA (if linked):** Transition the step's issue to "In Progress" via `getTransitionsForJiraIssue` + `transitionJiraIssue` (fuzzy match name). If transition fails, log warning and continue.
3. **Implement** — write minimal code to make tests pass. Stay within scope of current step.
4. **Run tests** — step tests must pass, then run full suite for regressions.
5. **Verify** — does implementation match acceptance criteria? Refactor if needed.
6. **JIRA (if linked):** Add progress comment via `addCommentToJiraIssue`: "Step N/M complete. All tests passing."
7. **Report** — "Step N/M complete. Moving to step N+1."

### 3. Handle Deviations
- If the plan needs adjustment, document why
- Update the plan before deviating
- Never silently change scope

### 4. After All Steps
- Run the full test suite one final time
- Report completion status
- Offer next steps: `/review` for code review, `/verify` for full verification

## Rules

- TDD is non-negotiable — no implementation without failing tests first
- Follow the plan — don't improvise unless blocked
- One step at a time — complete each fully before starting the next
- Make tests pass, don't modify tests to pass
- Small, focused commits per plan step
- Run the full test suite regularly, not just the new tests
- If blocked, ask for clarification rather than guessing
- Never block execution for JIRA — transitions are best-effort
