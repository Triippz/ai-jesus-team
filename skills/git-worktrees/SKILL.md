---
name: git-worktrees
description: Triggered when creating an isolated git worktree for feature work
---

# Git Worktrees Skill

Create isolated worktrees for feature work, allowing parallel development without branch switching.

**Skill Type: Rigid** — Follow this process exactly.

## Process

### 1. Determine Branch Name
- Derive an appropriate branch name from the task description
- Format: `feature/<short-description>`, `fix/<short-description>`, or `refactor/<short-description>`
- Use kebab-case: `feature/add-user-auth`, `fix/login-timeout`
- Ask the user to confirm the branch name

### 2. Create Worktree
- Create the worktree in the project's `.worktrees/` directory
- Command: `git worktree add .worktrees/<branch-name> -b <branch-name>`
- If `.worktrees/` doesn't exist, create it
- Ensure `.worktrees/` is in `.gitignore`

### 3. Verify Clean State
- Check that the worktree is clean: `git status` in the worktree directory
- Verify the correct branch is checked out
- Verify the worktree is based on the expected parent branch

### 4. Report
Provide the user with:
- Worktree path: `.worktrees/<branch-name>`
- Branch name: `<branch-name>`
- Parent branch: what it branched from

### 5. Remind
- Worktrees can commit freely — commits in a worktree don't affect the main working directory
- The main branch requires explicit user permission for commits and pushes
- When done, use `/finish` to prepare the branch for merge

## Cleanup

When a worktree is no longer needed:
- `git worktree remove .worktrees/<branch-name>`
- Or manually delete the directory and run `git worktree prune`

## Rules

1. **Always use `.worktrees/` directory**: Keep worktrees organized in one place
2. **Always add to `.gitignore`**: The `.worktrees/` directory should never be committed
3. **Confirm branch name**: Ask the user before creating
4. **Verify after creation**: Don't assume it worked — check
