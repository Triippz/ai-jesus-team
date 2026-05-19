# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Purpose

Codex-compatible mirror of shared agents and workflow skills. Each subdirectory contains a SKILL.md and an `agents/openai.yaml` for Codex discovery.

## Structure

```
.agents/skills/<name>/
├── SKILL.md              # Skill description
└── agents/
    └── openai.yaml       # Codex agent config (allow_implicit_invocation: false)
```

## Mirrored Skills

10 agent skills: orchestrator, arch-reviewer, code-reviewer, security-auditor, test-automator, debugger, design-patterns, grafana-engineer, spec-challenger, spec-validator

18 workflow skills: brainstorming, writing-plans, tdd, executing-plans, debugging, code-review, verification, finishing-branch, merge-request, resolve-reviews, plan-to-jira, update-jira, spec-driven-development, agent-teams, dispatching-agents, git-worktrees, writing-skills, using-superpowers

## SKILL.md Format (Codex)

Codex SKILL.md files use YAML frontmatter with `name` and `description`, followed by markdown. Title as `# Name`, purpose as `## Purpose`, content below.

## openai.yaml Format

```yaml
name: skill-name
description: "Trigger description"
allow_implicit_invocation: false
```
