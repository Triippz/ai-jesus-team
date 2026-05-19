---
name: agent-teams
description: "Coordinate multi-agent work on large features with file ownership."
---

# Agent Teams Skill

## Purpose

Coordinate multiple agents working on a large feature, with file ownership and isolation.

**Skill Type: Flexible** — Adapt team size and structure to the task.

## Process

### 1. Break Feature Into Domains
- Analyze the feature and identify distinct domains/areas of work
- Each domain should be as independent as possible

### 2. Assign File Ownership
- Each agent owns specific files or directories
- No two agents modify the same file
- Shared interfaces designed first and owned by one agent

### 3. Create Worktrees (Optional)
- For true isolation, create a worktree per agent
- Each agent works in its own worktree on its own branch

### 4. Coordinate Interfaces
- Define interfaces between domains before agents start
- Shared types, function signatures, API contracts agreed upfront

### 5. Execute
- Launch agents in parallel (using dispatching-agents skill)
- Each agent follows the standard workflow (TDD, implement, verify)

### 6. Integrate
- Merge worktrees back to the feature branch
- Run full test suite to verify integration
- Resolve any interface mismatches
