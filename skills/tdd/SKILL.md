---
name: tdd
description: Triggered when writing tests before implementation using test-driven development
---

# TDD Skill

Test-Driven Development — the discipline of writing failing tests before production code.

## The Iron Law

**NO PRODUCTION CODE WITHOUT A FAILING TEST FIRST.**

There are no exceptions. Not for "simple" code, not for "obvious" implementations, not for prototypes.

## The Cycle: Red-Green-Refactor

### Red: Write a Failing Test
1. Write the smallest test that describes the next behavior needed
2. Run the test — it MUST fail
3. Verify it fails for the RIGHT reason (not a syntax error or import issue)

### Green: Make It Pass
1. Write the MINIMAL production code to make the test pass
2. Don't write more than what the test demands
3. Run the test — it MUST pass
4. Run ALL tests — nothing else should break

### Refactor: Clean Up
1. Both test code and production code
2. Remove duplication
3. Improve naming
4. Run ALL tests after refactoring — they must still pass

### Verify
After each cycle:
- All tests pass
- No test was modified to make it pass (test stays as written in Red phase)
- Production code does exactly what the tests specify, no more

## Good Test Qualities

- **Minimal**: Test one behavior per test
- **Clear name**: Describes scenario and expected outcome
  - Good: `test_login_with_invalid_password_returns_401`
  - Bad: `test_login`, `test1`, `testStuff`
- **Real dependencies preferred**: Use real implementations when practical, mock only external I/O
- **Independent**: Each test runs in isolation, no shared mutable state
- **Fast**: Milliseconds per unit test
- **Deterministic**: Same result every time

## Common Rationalizations (Don't Fall For These)

| Rationalization | Response |
|----------------|----------|
| "This is too simple to test" | Simple things are fastest to TDD. Do it. |
| "I'll write tests after" | Tests written after implementation are weaker and test implementation, not behavior. |
| "I know what the code should do" | Then writing the test first takes 30 seconds. Do it. |
| "Mocking is too complex" | Use real dependencies. Only mock external I/O boundaries. |
| "The test framework doesn't support this" | It does. Find the right approach. |
| "I need to write the production code to understand what to test" | Write the test for what you WANT to happen, not what the code does. |

## Wrote Code Before Test?

Delete it. Start over with a test. The code you wrote from memory will be better the second time anyway.

This is not punishment — it's the fastest path to correct code.

## Verification Checklist

After each TDD cycle, confirm:
- [ ] Test was written BEFORE production code
- [ ] Test failed before production code was written
- [ ] Test failed for the RIGHT reason
- [ ] Minimal production code was written to pass the test
- [ ] All existing tests still pass
- [ ] Code was refactored after going green
- [ ] All tests still pass after refactoring
