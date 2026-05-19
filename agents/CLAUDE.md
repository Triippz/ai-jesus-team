# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Purpose

Shared agent definitions for the core-superpowers plugin. These agents are project-agnostic and available across all profiles.

## Agents

| Agent | File | Purpose |
|-------|------|---------|
| orchestrator | orchestrator.md | Detects project type, routes to domain agents, enforces workflow order |
| arch-reviewer | arch-reviewer.md | Architecture compliance — module boundaries, dependency direction, circular deps |
| code-reviewer | code-reviewer.md | Code quality — SOLID, DRY, KISS, naming, function size, nesting depth |
| security-auditor | security-auditor.md | Security — OWASP top 10, secrets, injection, auth, input validation |
| test-automator | test-automator.md | Test strategy — coverage gaps, test quality, framework-appropriate patterns |
| debugger | debugger.md | Structured debugging — reproduce, isolate, hypothesize, verify, fix |
| design-patterns | design-patterns.md | Pattern selection — GoF, functional, concurrent, anti-pattern detection |
| spec-challenger | spec-challenger.md | Adversarial spec review with cited evidence — anti-sycophancy reviewer for /spec |
| spec-validator | spec-validator.md | Read-only structural validation of spec/plan/tasks — coverage, gates, paths |
| grafana-engineer | grafana-engineer.md | Grafana / Prometheus / Loki / OpenTelemetry — dashboards, PromQL/LogQL, alerts, OTel pipelines, log ingestion; reads latest docs via context7 MCP |
| protobuf-expert | protobuf-expert.md | Protocol Buffers — schema review, evolution safety, style compliance, encoding efficiency |

## File Format

Each agent is a markdown file with YAML frontmatter:

```yaml
---
name: agent-name
description: One-line description
model: opus  # optional
---
```

Body contains the agent's instructions in markdown.
