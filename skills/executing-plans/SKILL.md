---
name: executing-plans
description: Triggered when executing an implementation plan step-by-step with TDD enforcement
---

# Executing Plans Skill

Execute implementation plans methodically, one step at a time, with strict TDD enforcement.

**Skill Type: Rigid** — Follow this process exactly. Do not skip steps.

## Process

### 1. Load the Plan
- Read the plan from `docs/plans/` directory
- If no plan exists, STOP and direct the user to `/write-plan` first
- Confirm the plan with the user before starting execution

### 1b. Check for JIRA Linkage (Optional)

- Look for a `.jira-map.json` file matching the loaded plan (same base name in `docs/plans/`)
- If found, load the step-to-issue mapping and the `cloudId`
- JIRA integration is optional — if no map file exists, skip all JIRA operations silently

### 2. For Each Step

#### a0. Transition JIRA to In Progress (if linked)

If this step has a linked JIRA issue key in the map file:
- Call `getTransitionsForJiraIssue` with the issue key to find a transition whose name contains "In Progress" (case-insensitive fuzzy match)
- Call `transitionJiraIssue` to move the issue
- If the transition fails (already in progress, transition not available, MCP not connected), log a warning and continue — **never block execution for JIRA**

#### a. Check Tests Exist
- Do tests for this step already exist?
- If NO tests exist → **REFUSE TO IMPLEMENT**
- Direct the user to `/tdd` to write tests first
- Do not proceed until tests exist and fail

#### b. Implement
- Write the minimal production code to make the tests pass
- Follow the plan's specification for what to implement
- Stay within the scope of the current step — don't get ahead

#### c. Run Tests
- Run the tests for this step — they must pass
- Run the FULL test suite — check for regressions
- If any test fails, fix before moving to the next step

#### d. Verify
- Check: does the implementation match the step's acceptance criteria?
- Check: is the code clean? Refactor if needed (tests must still pass)
- Report status to the user

### 3. After Each Step
- Run the full test suite
- Check for regressions
- Report: "Step N/M complete. All tests passing. Moving to step N+1."
- If a step fails, stop and debug before continuing
- **JIRA (if linked):** Call `addCommentToJiraIssue` with a brief status: "Step N/M complete. All tests passing."

### 4. After All Steps
- Run the full test suite one final time
- Report completion status
- Offer next steps: `/review` for code review, `/verify` for full verification

## Rules

1. **TDD is non-negotiable**: No implementation without failing tests first
2. **One step at a time**: Complete each step fully before starting the next
3. **Regressions block progress**: If a previous test breaks, fix it before continuing
4. **Stay on plan**: If the plan needs changes, update the plan document first, then continue
5. **Report progress**: After each step, tell the user where you are

## Error Recovery

If a step can't be completed as planned:
1. Stop execution
2. Explain what went wrong
3. Suggest plan modifications
4. Wait for user approval before changing the plan
5. Update the plan document
6. Resume execution
