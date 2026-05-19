---
name: plan-to-jira
description: Use when converting an implementation plan from docs/plans/ into JIRA issues — creates a parent Story or Epic with subtasks per plan step, using the standard description template
---

# Converting Plans to JIRA Issues

## Overview

Read an implementation plan from `docs/plans/`, create a parent Story (or Epic) in JIRA, and create one subtask per plan step — each with a structured description including checklist, technical details, acceptance criteria, design notes, and dependencies.

**Core principle:** Load plan -> Discover JIRA config -> Create parent -> Create subtasks with template -> Write map file -> Report.

**Announce at start:** "I'm using the plan-to-jira skill to create JIRA issues from your implementation plan."

## Prerequisites

**Before starting, verify the Atlassian MCP server is connected.**

Try calling `getVisibleJiraProjects` or any Atlassian MCP tool. If the tools are not available or return an auth error, STOP and print:

```
This skill requires the Atlassian MCP server to create JIRA issues.

Setup (in Claude Code):
  /plugin                    # Search for "Atlassian" and install it
  /mcp                       # Select Atlassian and authenticate with your account

Once connected, re-run /plan-to-jira.
```

## The Process

### Step 1: Discover JIRA Configuration

Try these sources in order:

1. Check for `$CLAUDE_PROJECT_DIR/.jira-config.json`:
   ```json
   { "cloudId": "...", "projectKey": "...", "defaultIssueType": "Story" }
   ```

2. If not found, discover via Atlassian MCP:
   - Call `getAccessibleAtlassianResources` to list available sites
   - Call `getVisibleJiraProjects` with the chosen cloudId to list projects
   - Ask the user to select site and project

3. Offer to save the selection to `.jira-config.json` for future use
   - Suggest adding `.jira-config.json` to `.gitignore` if not already there

If the Atlassian MCP tools are not available, report: "Atlassian MCP server not connected. Install via `/plugin` and authenticate via `/mcp`." and stop.

### Step 2: Load the Plan

- List files in `docs/plans/` and let the user pick, or accept a path argument
- Parse the plan markdown:
  - **Title**: H1 heading
  - **Overview**: Content before the first step
  - **Steps**: H2 or H3 sections matching `## Step N:` or `### N.` patterns
  - **Per step**: "What to implement", "Tests to write", "Acceptance criteria" subsections
- Confirm with the user: "Found N steps in plan `<filename>`. Create a parent Story with N subtasks in `<PROJ>`?"

**STOP and wait for user confirmation before creating any issues.**

### Step 3: Choose Parent Issue Type

- Ask the user: **Story** (default) or **Epic**?
- Call `getJiraProjectIssueTypesMetadata` with the chosen `cloudId` and `projectKey`
- Verify the chosen type and Sub-task type both exist
- If Sub-task is not available, fall back to Task type with parent linking

### Step 4: Create Parent Issue

Call `createJiraIssue`:
- `cloudId`: from config
- `projectKey`: from config
- `issueTypeName`: "Story" or "Epic"
- `summary`: plan title
- `description`: plan overview/goal section
- `contentFormat`: "markdown"

Record the returned issue key (e.g., `PROJ-100`).

### Step 5: Create Subtask Per Plan Step

For each step in the plan, build the description using the **mandatory template**:

```markdown
## Description
[Step's "What to implement" content from the plan. Focus on implementation-level details.
Can reference the parent story, but should be self-contained enough for a developer to work from.]

## Checklist
- [ ] [Specific sub-task or deliverable 1]
- [ ] [Specific sub-task or deliverable 2]
- [ ] [Tests written and passing]

## Technical Details
[Files to create or modify, APIs affected, database schema changes,
environment variables, configuration changes. Pull from the plan's
specification for this step.]

## Acceptance Criteria
Given [precondition from the plan's acceptance criteria]
When [action]
Then [expected result]

[Repeat for each criterion. Convert plan's checkbox-style criteria
into Given/When/Then format where possible.]

## Design / UX Notes
[If the plan references Figma files, wireframes, or design decisions,
include them here. Otherwise: "No design changes in this step."]

## Dependencies
[List which prior steps must be complete before this one can start.
Note any external dependencies: APIs, libraries, infrastructure,
other teams. Pull from the plan's dependency analysis.]
```

For each step, call `createJiraIssue`:
- `cloudId`: from config
- `projectKey`: from config
- `issueTypeName`: "Sub-task" (or "Task" if Sub-task unavailable)
- `summary`: `Step N: <step title>`
- `description`: the filled template above
- `contentFormat`: "markdown"
- `parent`: parent issue key from Step 4

**Create issues sequentially** (one at a time) to avoid rate limits.

Record each returned issue key.

### Step 6: Write JIRA Map File

Write `docs/plans/<plan-basename>.jira-map.json`:

```json
{
  "planFile": "docs/plans/2026-04-10-feature-x-plan.md",
  "parentIssue": "PROJ-100",
  "steps": [
    { "step": 1, "title": "Domain model types", "issueKey": "PROJ-101" },
    { "step": 2, "title": "Port traits", "issueKey": "PROJ-102" }
  ],
  "cloudId": "abc-123",
  "projectKey": "PROJ",
  "createdAt": "2026-04-10T10:00:00Z"
}
```

This file links plan steps to JIRA issues. It is used by `/execute-plan` (auto-transitions) and `/update-jira` (post-implementation updates).

### Step 7: Report and Offer Next Steps

```
JIRA issues created from plan "<plan title>":

Parent: PROJ-100 (Story) — <plan title>

| Step | Issue    | Summary                    |
|------|----------|----------------------------|
| 1    | PROJ-101 | Domain model types          |
| 2    | PROJ-102 | Port traits                 |
| 3    | PROJ-103 | Service layer               |

Map file written to: docs/plans/<plan-basename>.jira-map.json

Next steps:
- `/tdd` — Write tests for step 1
- `/execute-plan` — Start executing (will auto-transition JIRA to In Progress)
```

## Error Handling

| Error | Action |
|-------|--------|
| Atlassian MCP not available | Report and suggest `/plugin` + `/mcp` setup |
| Auth failure | Report: "Re-authenticate via `/mcp`" |
| No plans in docs/plans/ | Tell user to run `/write-plan` first |
| Plan not parseable | Report which sections could not be parsed, create issues for what was parsed |
| Sub-task type unavailable | Fall back to Task with parent linking |
| Issue creation fails | Report which step failed, continue with remaining steps, report at end |
| Rate limit | Wait 2 seconds and retry once; if still failing, report and stop |

## Guidelines

- **Never create issues without user confirmation** of the plan and target project
- **Use `contentFormat: "markdown"`** for all descriptions — JIRA renders it natively
- **The mandatory description template must be used for every subtask** — no exceptions, no shortcuts
- **Fill every section** — if information is not in the plan, write "N/A" rather than omitting the section
- **Create issues sequentially** — one at a time, not in parallel, to respect rate limits
- **Always write the map file** — other skills depend on it for auto-transitions and updates
