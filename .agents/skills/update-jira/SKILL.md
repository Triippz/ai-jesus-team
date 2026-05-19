---
name: update-jira
description: "Update JIRA issues with implementation details, QA test steps, and code change summaries after work is complete"
---

# Update JIRA

## Purpose

After implementation, update linked JIRA issues with what was built, how QA can test it, technical changes, and acceptance criteria status.

## Prerequisites

Verify the Atlassian MCP server is connected. If not available, STOP and print:

```
This skill requires the Atlassian MCP server to update JIRA issues.

Setup (in Claude Code):
  /plugin       # Search for "Atlassian" and install it
  /mcp          # Select Atlassian and authenticate

For Codex/Cursor: ensure the Atlassian MCP server is configured in your tool settings.
```

## Workflow

1. **Determine scope** — single issue (argument provided) or batch (from `.jira-map.json`)
2. **Gather details** — `git diff/log` for file changes and commit history, group by plan step
3. **Build update content** — mandatory template per issue:
   - What Was Implemented (commits, files, key decisions)
   - How to Test / QA Steps (setup, specific steps, expected result, edge cases)
   - Technical Details (APIs, schema, config, infrastructure changes)
   - Acceptance Criteria Status (checked/unchecked with verification method)
4. **Present and confirm** — preview all updates, ask user: update description or add as comment (default: comment)
5. **Apply and report** — `editJiraIssue` or `addCommentToJiraIssue` with `contentFormat: "markdown"`

## Rules

- Never overwrite original description — append or use comments
- QA steps must be specific with real URLs, inputs, and expected outputs
- Fill every section — use "N/A" rather than omitting
- In batch mode, preview before applying
- Use `contentFormat: "markdown"` for all content
