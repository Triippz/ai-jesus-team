---
name: plan-to-jira
description: "Convert an implementation plan from docs/plans/ into JIRA issues with a parent Story/Epic and subtasks per plan step"
---

# Plan to JIRA

## Purpose

Create JIRA issues from an implementation plan. Each plan becomes a parent Story (or Epic) with one subtask per step, using a mandatory description template.

## Prerequisites

Verify the Atlassian MCP server is connected. If not available, STOP and print:

```
This skill requires the Atlassian MCP server to create JIRA issues.

Setup (in Claude Code):
  /plugin       # Search for "Atlassian" and install it
  /mcp          # Select Atlassian and authenticate

For Codex/Cursor: ensure the Atlassian MCP server is configured in your tool settings.
```

## Workflow

1. **Discover config** — check `.jira-config.json` or discover via `getVisibleJiraProjects`, ask user to pick
2. **Load plan** — parse `docs/plans/` file for title, steps, acceptance criteria
3. **Choose parent type** — Story (default) or Epic; verify types via `getJiraProjectIssueTypesMetadata`
4. **Create parent** — `createJiraIssue` with plan title and overview, `contentFormat: "markdown"`
5. **Create subtasks** — one per step, using mandatory template:
   - Description (implementation details)
   - Checklist (specific deliverables)
   - Technical Details (files, APIs, database, environments)
   - Acceptance Criteria (Given/When/Then format)
   - Design / UX Notes (Figma links or "N/A")
   - Dependencies (prior steps, external deps)
6. **Write map file** — `docs/plans/<name>.jira-map.json` linking steps to issue keys
7. **Report** — table of issues, link to parent, offer `/tdd` or `/execute-plan`

## Rules

- Never create issues without user confirmation
- Use `contentFormat: "markdown"` for all descriptions
- The mandatory description template must be used for every subtask — fill every section
- Create issues sequentially to avoid rate limits
- Always write the map file after creation
