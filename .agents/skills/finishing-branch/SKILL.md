---
name: finishing-branch
description: "Use when implementation is complete and you need to prepare the branch for merge or MR."
---

# Finishing Branch

## Purpose

Prepare a feature branch for merge: final checks, documentation updates, and clean commit history.

## Checklist

### 1. Verification
- Invoke the verification skill (tests, lint, types)
- If verification fails: STOP — fix issues before finishing
- Do not proceed until all checks pass

### 1b. JIRA Transitions (if linked)
- Scan `docs/plans/` for `.jira-map.json` files
- If found, transition linked issues to "In Review" via `getTransitionsForJiraIssue` + `transitionJiraIssue` (fuzzy match for "Review", "Code Review", "Ready for Review")
- For the parent issue: transition if all subtasks are done
- If no review transition exists, add a comment noting work is complete
- If no JIRA linkage, skip silently

### 2. Code Complete
- All plan steps implemented
- All tests passing
- No TODO items without ticket references
- No debug/temporary code remaining

### 3. Documentation
- Public APIs documented
- README updated if needed (only if explicitly required)
- Breaking changes documented
- Migration steps documented if applicable

### 4. Commit History
- Commits follow `type: [scope] description` format
- Each commit is focused and logical
- No "fix typo" or "wip" commits (squash if needed)
- Commit messages explain WHY, not just WHAT
- No AI attribution

### 5. Branch Hygiene
- Branch is rebased on latest main/master
- No merge conflicts
- Branch name follows convention

### 6. Present Options
- **Merge to parent branch**: confirm target, ask permission before push/merge
- **Create MR**: push and create via `/mr` skill
- **Leave for manual review**: report status and remaining items

### 7. Final Verification
- Full test suite passes
- Linter passes
- Type checking passes
- Build succeeds

## Rules

- Verification first — never finish without passing verification
- Ask before git operations — ALWAYS ask before push, merge, or any remote git operation
- Doc updates are automatic — don't ask permission to update stale docs
- Show your work — report what was checked, updated, skipped
- Never force push to shared branches
