---
name: dispatching-agents
description: "Run multiple independent tasks in parallel using agents."
---

# Dispatching Agents Skill

## Purpose

Dispatch multiple agents in parallel for independent tasks that don't share state.

**Skill Type: Flexible** — Adapt agent selection and task decomposition to context.

## Process

### 1. Identify Independent Tasks
- Break the request into discrete, independent tasks
- Tasks are independent if they don't modify the same files, don't depend on each other's output, and don't share mutable state
- Dependent tasks must be sequenced, not parallelized

### 2. Assign Agents
- Match each task to the most appropriate agent
- One agent per task

### 3. Launch in Parallel
- Provide each agent with clear task description, scope, and expected output format

### 4. Collect and Merge Results
- Wait for all agents to complete
- Resolve contradictory recommendations
- Deduplicate overlapping findings
- Present a unified, prioritized report

## When to Use

- 2+ tasks with no shared state
- Code review (dispatch arch-reviewer, code-reviewer, security-auditor simultaneously)
- Multi-module analysis
- Independent research tasks
