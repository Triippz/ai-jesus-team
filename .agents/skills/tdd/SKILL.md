---
name: tdd
description: "Use when writing tests before implementation -- enforces red-green-refactor discipline."
---

# TDD (Test-Driven Development)

## Purpose

Write tests before implementation to ensure correctness, drive design, and maintain coverage.

## Red-Green-Refactor Cycle

### 1. Red — Write a Failing Test
- Write a test that describes the desired behavior
- Run it and verify it fails
- Verify it fails for the RIGHT reason (not a syntax error)

### 2. Green — Write Minimal Implementation
- Write the simplest code that makes the test pass
- Do not over-engineer — just make it green
- Run all tests to ensure nothing else broke

### 3. Refactor — Improve the Code
- Clean up the implementation while keeping tests green
- Extract common patterns
- Improve naming and structure
- Run tests after each refactor step

### Repeat
- Continue the cycle for each new behavior

## Test Design Principles

- One assertion per test (when practical)
- Test behavior, not implementation details
- Use descriptive test names that read as specifications
- Follow AAA pattern: Arrange, Act, Assert
- Test edge cases and error paths, not just happy paths

## Per-Project Patterns

### Python/Django
- pytest with descriptive test class and method names
- model_bakery for test data
- Real database for integration tests

### Flutter/Dart
- Widget tests with `tester.pumpWidget()`
- Unit tests for services and repositories
- In-memory databases, no DB mocking

### Rust
- `#[test]` functions with descriptive names
- In-memory adapters, no mocking libraries
- `proptest` for property-based tests

## Rules

- Never skip the TDD phase
- Tests must exist before implementation
- Tests must fail before implementation passes them
- Keep test code as clean as production code
