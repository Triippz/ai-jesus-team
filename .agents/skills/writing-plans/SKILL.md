---
name: writing-plans
description: "Use when creating a step-by-step implementation plan with clear deliverables and dependencies."
---

# Writing Plans

## Purpose

Create structured implementation plans that guide development from design through completion.

## Plan Structure

### 1. Overview
- Problem statement (1-2 sentences)
- Chosen approach (from brainstorming)
- Scope boundaries (what is and is not included)

### 2. Requirements
- Functional requirements (must-have)
- Non-functional requirements (performance, security, etc.)
- Acceptance criteria

### 3. Technical Design
- Architecture decisions
- Data model changes
- API contract changes
- Integration points

### 4. Implementation Steps
- Ordered list of discrete tasks
- Each task should be completable in one session
- Dependencies between tasks noted
- Estimated complexity per task

### 5. Testing Strategy
- What tests to write (types and scope)
- Test data requirements
- Edge cases to cover

### 6. Rollout Plan
- Migration steps if needed
- Feature flags if applicable
- Rollback strategy

## Rules

- Plans must be specific enough to execute without ambiguity
- Each step should be independently verifiable
- Include test strategy before implementation steps
- Keep plans up to date as implementation progresses
