# AGENTS.md

This file provides guidance to AI coding agents when working with code in this repository.

## Purpose

Shared skill definitions for the core-superpowers plugin. Skills are the primary unit of reusable workflow capability.

## Skills

| Skill | Directory | Type | Purpose |
|-------|-----------|------|---------|
| using-superpowers | using-superpowers/ | Entry | Session start — catalogs all skills/agents, loaded by session-start hook |
| brainstorming | brainstorming/ | Flexible | Collaborative design exploration before implementation |
| writing-plans | writing-plans/ | Rigid | Step-by-step implementation plans with acceptance criteria |
| tdd | tdd/ | Rigid | Test-driven development — write failing tests before code |
| executing-plans | executing-plans/ | Rigid | Execute plans step-by-step with TDD enforcement |
| debugging | debugging/ | Rigid | Structured: reproduce → isolate → hypothesize → verify → fix |
| code-review | code-review/ | Rigid | Dispatch arch-reviewer, code-reviewer, security-auditor in parallel |
| verification | verification/ | Rigid | Run tests, lint, type-check — block if failures |
| finishing-branch | finishing-branch/ | Rigid | Auto-update docs, present merge/PR options |
| git-worktrees | git-worktrees/ | Rigid | Create isolated worktree for feature work |
| dispatching-agents | dispatching-agents/ | Flexible | Parallel dispatch for 2+ independent tasks |
| agent-teams | agent-teams/ | Flexible | Multi-agent coordination with file ownership |
| merge-request | merge-request/ | Rigid | Push branch and create a GitLab merge request via glab CLI |
| resolve-reviews | resolve-reviews/ | Rigid | Research-backed triage of MR review comments, implement fixes, reply to all threads |
| plan-to-jira | plan-to-jira/ | Rigid | Convert implementation plans into JIRA issues with parent Story + subtasks |
| update-jira | update-jira/ | Rigid | Update JIRA issues with implementation details and QA test steps |
| spec-driven-development | spec-driven-development/ | Rigid | Multi-phase spec/PRD authoring with adversarial review and deterministic validation; the /spec command |
| writing-skills | writing-skills/ | Meta | TDD-based skill authoring (skill for writing skills) |

## Skill Types

- **Rigid**: Follow exactly as written. Don't adapt away discipline.
- **Flexible**: Adapt principles to context while maintaining intent.
- **Entry**: Loaded automatically at session start.
- **Meta**: Skills about skills.

## File Structure

Each skill lives in its own directory:
```
skills/<name>/
├── SKILL.md          # Entry point (required)
├── references/       # Supporting docs (optional)
├── assets/           # Templates, prompts (optional)
└── scripts/          # Helper scripts (optional)
```

SKILL.md has YAML frontmatter with `name` and `description`.
