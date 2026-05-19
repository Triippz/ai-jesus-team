---
name: git-worktrees
description: "Create isolated git worktrees for feature work."
---

# Git Worktrees Skill

## Purpose

Create isolated worktrees for feature work, allowing parallel development without branch switching.

**Skill Type: Rigid** — Follow this process exactly.

## Process

### 1. Determine Branch Name
- Derive from task description
- Format: `feature/<short-description>`, `fix/<short-description>`, or `refactor/<short-description>`
- Use kebab-case

### 2. Create Worktree
- Create in `.worktrees/` directory: `git worktree add .worktrees/<branch-name> -b <branch-name>`
- Ensure `.worktrees/` is in `.gitignore`

### 3. Verify Clean State
- Check worktree is clean via `git status`
- Verify correct branch is checked out
- Verify parent branch is correct

### 4. Report
- Worktree path
- Branch name
- Parent branch

## Cleanup

- `git worktree remove .worktrees/<branch-name>`
- Or delete directory manually and run `git worktree prune`

## Rules

1. Always use `.worktrees/` directory
2. Never create worktrees in random locations
3. Always verify clean state after creation
