---
name: verification
description: Triggered when running tests, linter, and type checker to verify code is ready for merge
---

# Verification Skill

Pre-merge verification — confirm everything passes before claiming "done."

**Skill Type: Rigid** — No claiming done without evidence.

## Process

### 1. Run Test Suite
- Detect the test runner from the project:
  - `pytest` / `python -m pytest` (Python)
  - `npm test` / `npx vitest` / `npx jest` (JavaScript/TypeScript)
  - `cargo test` (Rust)
  - `flutter test` (Flutter/Dart)
  - `go test ./...` (Go)
  - `bundle exec rspec` (Ruby)
  - `./gradlew test` or `mvn test` (Java/Kotlin)
  - `dotnet test` (.NET)
- ALL tests must pass
- Report: total tests, passed, failed, skipped
- If any test fails: **STOP** — report failures, do not proceed

### 2. Run Linter
- Detect the linter from the project:
  - `ruff check .` (Python)
  - `npx eslint .` or `npx biome check .` (JavaScript/TypeScript)
  - `cargo clippy` (Rust)
  - `dart analyze` (Flutter/Dart)
  - `golangci-lint run` (Go)
  - `rubocop` (Ruby)
  - `./gradlew lint` or `ktlint` (Kotlin)
- Report: total warnings, total errors
- Errors block verification; warnings are reported but don't block

### 3. Run Type Checker (If Applicable)
- Detect if the project uses type checking:
  - `mypy .` (Python with type hints)
  - `npx tsc --noEmit` (TypeScript)
  - Type checking is built into compiled languages (Rust, Go, Java)
- Report: type errors found
- Type errors block verification

### 4. Check for Uncommitted Changes
- Run `git status`
- Are there uncommitted changes that should be included?
- Warn if there are modified files not yet committed

### 5. Report Results

```
## Verification Results

| Check | Status | Details |
|-------|--------|---------|
| Tests | PASS/FAIL | X passed, Y failed, Z skipped |
| Linter | PASS/FAIL | X errors, Y warnings |
| Types | PASS/FAIL/N/A | X errors |
| Clean | PASS/WARN | X uncommitted files |

**Overall: READY / NOT READY**
```

## Rules

1. **All checks must run**: Don't skip a check because another passed
2. **Evidence required**: Show the actual command output, not just "it passed"
3. **Failures block**: Any test failure or type error means NOT READY
4. **No guessing**: Run the actual commands, don't assume results
5. **Report everything**: Include warnings even if they don't block
