---
name: agent-teams
description: Triggered when coordinating multi-agent work on large features requiring file ownership
---

# Agent Teams Skill

Coordinate multiple agents working on a large feature, with file ownership and isolation.

**Skill Type: Flexible** — Adapt team size and structure to the task.

## Process

### 1. Break Feature Into Domains
- Analyze the feature and identify distinct domains/areas of work
- Each domain should be as independent as possible
- Examples:
  - Frontend vs Backend
  - Data layer vs Business logic vs API layer
  - Module A vs Module B vs Shared interfaces

### 2. Assign File Ownership
- Each agent owns specific files or directories
- **No two agents modify the same file** — this is critical for avoiding conflicts
- Shared interfaces should be designed first and owned by one agent
- Document the ownership map:

```
Agent 1 (domain-a): src/domain_a/*, tests/domain_a/*
Agent 2 (domain-b): src/domain_b/*, tests/domain_b/*
Agent 3 (shared):   src/shared/interfaces.*, tests/shared/*
```

### 3. Create Worktrees (Optional)
- For true isolation, create a worktree per agent
- Each agent works in its own worktree on its own branch
- This prevents any possibility of file conflicts
- Use the git-worktrees skill for each agent's worktree

### 4. Coordinate Interfaces
- Before agents start working, define the interfaces between domains
- Shared types, function signatures, API contracts
- These interfaces are agreed upon upfront and owned by one agent
- Other agents code against the interface, not the implementation

### 5. Execute
- Launch agents in parallel (using dispatching-agents skill)
- Each agent works within its owned files
- Agents follow the standard workflow (TDD, implement, verify)

### 6. Merge and Verify
- Merge all agents' work into a single branch
- Run the full test suite — integration tests are critical here
- Resolve any interface mismatches
- Run code review on the merged result

## Team Sizing

| Feature Size | Team Size | Approach |
|-------------|-----------|----------|
| Small (1-3 files) | 1 agent | No team needed |
| Medium (4-10 files) | 2 agents | Split by layer or module |
| Large (10+ files) | 3-4 agents | Split by domain |
| Very Large | 4+ agents | Split by domain with coordinator |

## Rules

1. **No shared file modification**: If two agents need to modify the same file, redesign the split
2. **Interfaces first**: Define contracts before implementation
3. **Integration tests**: Required after merging agent work
4. **Coordinator role**: For 3+ agents, one agent (or the orchestrator) coordinates
