---
name: writing-plans
description: Triggered when creating a step-by-step implementation plan from a design or requirements
---

# Writing Plans Skill

Create detailed, step-by-step implementation plans that can be executed methodically.

## Process

### 1. Read the Input
- Read the design document, spec, or requirements
- If no written document exists, ask the user to describe the work or run `/brainstorm` first
- Understand the scope, constraints, and acceptance criteria

### 2. Break Into Steps
- Create numbered steps, each independently testable
- Each step should be small enough to complete in one session
- Order steps by dependency (what must come first?)
- Early steps should establish foundations (interfaces, types, data models)
- Later steps build on earlier ones

### 3. Identify Dependencies
- Mark which steps depend on which other steps
- Identify steps that can be done in parallel (no shared dependencies)
- Note external dependencies (APIs, libraries, services)

### 4. Detail Each Step

For each step, specify:

```
## Step N: <descriptive title>

**What to implement:**
- Specific files to create or modify
- Key functions/classes/modules to build

**Tests to write:**
- What test cases cover this step
- Edge cases to test
- Integration points to verify

**Acceptance criteria:**
- [ ] Criterion 1 (specific, measurable)
- [ ] Criterion 2
- [ ] All tests pass
```

### 5. Write the Plan
- Write to `docs/plans/YYYY-MM-DD-<topic>-plan.md`
- Include:
  - Overview (what this plan achieves)
  - Prerequisites (what must exist before starting)
  - Steps (detailed as above)
  - Verification (how to know the whole plan is complete)

### 6. Offer Next Steps
After writing the plan:
- "Ready to start TDD for step 1?" → tdd skill
- "Ready to execute the plan?" → executing-plans skill
- "Need to revise the design?" → brainstorming skill

## Guidelines

- Steps should be independently verifiable — after each step, the project should still build and pass tests
- Don't make steps too granular (tedious) or too large (overwhelming)
- 5-15 steps is typical for a feature
- Each step's tests should be writable BEFORE the implementation (TDD-compatible)
- Include rollback notes for risky steps
