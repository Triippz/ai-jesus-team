---
name: using-superpowers
description: "Session entry point — skill catalog, workflow, and agent roster."
---

# Using Superpowers

## Purpose

Entry point skill loaded at session start. Contains the skill catalog, workflow progression, and agent roster.

## The Rule

Before responding to ANY user request, check if a relevant skill exists. If it does, invoke that skill BEFORE generating your response.

## Skill Catalog

| Skill | Command | When to Use | Type |
|-------|---------|-------------|------|
| Brainstorming | /brainstorm | Exploring a new feature, design decision, or technical approach | Flexible |
| Spec-Driven Development | /spec | Authoring a granular, unambiguous PRD/spec | Rigid |
| Writing Plans | /write-plan | Creating a step-by-step implementation plan | Rigid |
| TDD | /tdd | Writing tests before implementation code | Rigid |
| Executing Plans | /execute-plan | Implementing a plan step-by-step | Rigid |
| Debugging | /debug | Investigating and fixing a bug | Rigid |
| Code Review | /review | Reviewing code for quality, architecture, and security | Rigid |
| Verification | /verify | Checking if code is ready for merge | Rigid |
| Finishing Branch | /finish | Preparing a branch for merge or PR | Rigid |
| Merge Request | /mr | Pushing a branch and creating a GitLab merge request | Rigid |
| Resolve Reviews | /resolve-reviews | Addressing MR review comments | Rigid |
| Plan to JIRA | /plan-to-jira | Creating linked JIRA issues with subtasks | Rigid |
| Update JIRA | /update-jira | Updating JIRA with implementation details | Rigid |
| Git Worktrees | — | Creating isolated worktrees for feature work | Rigid |
| Dispatching Agents | — | Running multiple independent tasks in parallel | Flexible |
| Agent Teams | — | Coordinating multi-agent work on large features | Flexible |
| Writing Skills | — | Authoring new skills using TDD | Flexible |

## Workflow

brainstorm -> write-plan -> tdd -> execute-plan -> review -> verify -> finish

For complex features: spec -> execute-plan -> review -> verify -> finish

## Agent Roster

| Agent | Role |
|-------|------|
| orchestrator | Detects project type, routes tasks, enforces workflow |
| arch-reviewer | Reviews architecture compliance |
| code-reviewer | Reviews code quality (SOLID, DRY, KISS) |
| security-auditor | Reviews security (OWASP, secrets, injection) |
| test-automator | Identifies test coverage gaps |
| debugger | Structured debugging |
| design-patterns | Pattern selection, anti-pattern detection |
| spec-challenger | Adversarial spec review with cited evidence |
| spec-validator | Deterministic structural validation of spec/plan/tasks |
| grafana-engineer | Grafana/Prometheus/Loki/OTel observability |
