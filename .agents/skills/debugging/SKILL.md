---
name: debugging
description: "Use when investigating bugs, errors, or unexpected behavior with structured methodology."
---

# Debugging

## Purpose

Systematic debugging workflow for investigating and resolving issues.

## Workflow

### 1. Understand the Problem
- Read the error message / bug report carefully
- Identify expected vs. actual behavior
- Determine when the issue started (recent change? always existed?)

### 2. Reproduce
- Create minimal reproduction steps
- Confirm the issue exists in the current codebase
- Capture relevant logs, stack traces, and error messages

### 3. Isolate
- Binary search through the codebase to narrow the scope
- Use git bisect for regression bugs
- Trace data flow from input to the point of failure
- Check recent changes in the affected area

### 4. Root Cause Analysis
- Identify the root cause, not just the symptom
- Understand WHY the bug exists, not just WHERE
- Check if the same pattern exists elsewhere

### 5. Fix
- Make the minimal change that addresses the root cause
- Ensure the fix does not introduce new issues
- Follow project coding conventions

### 6. Verify
- Write a regression test that fails without the fix
- Run all existing tests
- Verify the original reproduction steps pass
- Check for related edge cases

## Rules

- Always write a regression test
- Fix root causes, not symptoms
- Document the root cause in the commit message
- Check for the same bug pattern elsewhere in the codebase
