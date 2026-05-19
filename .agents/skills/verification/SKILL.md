---
name: verification
description: "Use when running tests, linters, and type checkers to verify code correctness."
---

# Verification

## Purpose

Run all verification checks to ensure code is ready for merge: tests, linting, type checking, and build validation.

## Checks

### 1. Tests
- Run full test suite
- Verify all tests pass (no skipped tests without justification)
- Check coverage meets minimum thresholds
- Verify new code has corresponding tests

### 2. Linting
- Run project linter (Ruff for Python, flutter analyze for Dart, clippy for Rust)
- Zero warnings policy — all warnings must be resolved
- No lint rule suppressions without documented justification

### 3. Type Checking
- Full type check passes
- No `any` types (TypeScript) or unnecessary nullable types
- Type assertions are justified

### 4. Build
- Project builds successfully
- No build warnings
- Generated files are up to date

### 5. Per-Project Checks

#### Python/Django
```bash
PYTHONPATH=src pytest test/ -v
ruff check .
ruff format --check .
```

#### Flutter/Dart
```bash
flutter analyze
flutter test
dart format --set-exit-if-changed .
```

#### Rust
```bash
cargo clippy -- -D warnings
cargo test
cargo build
```

#### Terraform / IaC
```bash
terraform fmt -check
terraform validate
tfsec .
```

#### Deno/TypeScript (Nuv)
```bash
deno lint
deno test
deno fmt --check
```

## Output

- PASS/FAIL status for each check
- Details for any failures
- Specific files and lines that need attention
- Commands to reproduce failures locally
