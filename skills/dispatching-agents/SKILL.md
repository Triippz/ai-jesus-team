---
name: dispatching-agents
description: Triggered when running multiple independent tasks in parallel using agents
---

# Dispatching Agents Skill

Dispatch multiple agents in parallel for independent tasks that don't share state.

**Skill Type: Flexible** — Adapt agent selection and task decomposition to the context.

## Process

### 1. Identify Independent Tasks
- Break the user's request into discrete, independent tasks
- Tasks are independent if they:
  - Don't modify the same files
  - Don't depend on each other's output
  - Don't share mutable state
- If tasks have dependencies, they must be sequenced, not parallelized

### 2. Assign Agents
- Match each task to the most appropriate agent:
  - Architecture analysis → arch-reviewer
  - Code quality check → code-reviewer
  - Security scan → security-auditor
  - Test gap analysis → test-automator
  - Bug investigation → debugger
  - Pattern analysis → design-patterns
- One agent per task (an agent can handle multiple related sub-tasks)

### 3. Launch in Parallel
- Use the Agent tool to launch each agent simultaneously
- Provide each agent with:
  - Clear task description
  - Scope (which files/modules to focus on)
  - Expected output format

### 4. Collect Results
- Wait for all agents to complete
- Gather results from each agent

### 5. Merge Results
- Combine findings from all agents
- Resolve any conflicts (different agents recommending contradictory changes)
- Deduplicate overlapping findings
- Present a unified, prioritized report

## When to Use

- Code review (architecture + quality + security in parallel)
- Codebase analysis (multiple modules analyzed simultaneously)
- Multiple independent bug investigations
- Parallel refactoring analysis across modules

## When NOT to Use

- Tasks with sequential dependencies
- Tasks that modify the same files
- Tasks where one agent's output is another's input
- Single, focused tasks (just use the agent directly)
