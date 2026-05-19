---
name: code-review
description: "Use when reviewing completed code for architecture compliance, quality, and security."
---

# Code Review

## Purpose

Comprehensive code review covering architecture, quality, security, and testing.

## Review Dimensions

### Architecture
- Code is in the correct module/layer
- Dependencies flow in the right direction
- No circular dependencies
- Proper use of patterns (repository, service, etc.)

### Code Quality
- SOLID principles followed
- DRY — no duplicated logic
- KISS — simplest solution that works
- Functions under 40 lines
- Clear naming, no magic literals
- Proper error handling

### Security
- Input validation at boundaries
- No hardcoded secrets
- Parameterized queries
- Proper auth checks
- Sensitive data not logged

### Testing
- Adequate test coverage for new code
- Edge cases and error paths tested
- Tests are readable and maintainable
- No mocking of databases (use real/in-memory)

### Style
- Follows project-specific conventions
- Consistent formatting
- Proper import ordering
- No dead code or commented-out code

## Review Output Format

```
## Summary
Brief overall assessment.

## Blocking Issues
- [FILE:LINE] Description and fix suggestion

## Warnings
- [FILE:LINE] Description and recommendation

## Nits
- [FILE:LINE] Minor suggestions

## Positive Notes
- Highlight good patterns and practices observed
```

## Rules

- Be specific — reference files and lines
- Suggest fixes, don't just identify problems
- Distinguish blocking issues from suggestions
- Acknowledge good code, not just problems
