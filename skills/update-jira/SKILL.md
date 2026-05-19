---
name: update-jira
description: Use when updating JIRA issues with implementation details, QA test steps, and code change summaries after work is complete
---

# Updating JIRA Issues After Implementation

## Overview

After implementation is complete, update linked JIRA issues with what was actually built, how QA can test it manually, technical details of the changes, and acceptance criteria status.

**Core principle:** Determine scope -> Gather details from git -> Build update content per issue -> Confirm with user -> Apply updates -> Report.

**Announce at start:** "I'm using the update-jira skill to update JIRA issues with implementation details and QA instructions."

## Prerequisites

**Before starting, verify the Atlassian MCP server is connected.**

Try calling `getJiraIssue` or any Atlassian MCP tool. If the tools are not available or return an auth error, STOP and print:

```
This skill requires the Atlassian MCP server to update JIRA issues.

Setup (in Claude Code):
  /plugin                    # Search for "Atlassian" and install it
  /mcp                       # Select Atlassian and authenticate with your account

Once connected, re-run /update-jira.
```

## The Process

### Step 1: Determine Scope

**Single-issue mode** (argument provided):
- User provides an issue key (e.g., `/update-jira PROJ-123`)
- Load JIRA config from `.jira-config.json` or the `.jira-map.json` that contains this key

**Batch mode** (no argument):
- Scan `docs/plans/` for `.jira-map.json` files
- If multiple found, ask user to pick; if one found, use it
- Load all step-to-issue mappings from the map file

If no `.jira-map.json` exists and no issue key provided, report: "No linked JIRA issues found. Provide an issue key (e.g., `/update-jira PROJ-123`) or create links with `/plan-to-jira` first." and stop.

### Step 2: Gather Implementation Details

Run these commands to understand what was built:

```bash
# File change summary
git diff main...HEAD --stat 2>/dev/null || git diff master...HEAD --stat 2>/dev/null

# Commit history
git log main..HEAD --oneline 2>/dev/null || git log master..HEAD --oneline 2>/dev/null

# Detailed diff for understanding changes
git diff main...HEAD 2>/dev/null || git diff master...HEAD 2>/dev/null
```

For batch mode, group changes by plan step using the map file:
- Match changed files to the plan steps that specified them
- Match commits to steps based on commit message references

### Step 3: Build Update Content Per Issue

For each issue, construct the update using the **mandatory template**:

```markdown
## What Was Implemented
- [Commit-level summary: "Added validation service with input sanitization"]
- [Files created: `src/services/validator.rs` (new), `src/models/input.rs` (modified)]
- [Key decisions: "Used regex-based validation per RFC 5322 for email fields"]

## How to Test (QA Steps)
1. **Setup:**
   - [Environment prerequisites: "Ensure dev server is running on port 8080"]
   - [Data prerequisites: "Create a test user via admin panel"]

2. **Test Steps:**
   1. [Navigate to / open / call specific endpoint]
   2. [Perform specific action with specific input]
   3. [Observe specific result]

3. **Expected Result:**
   - [What QA should see: "Form submits successfully, confirmation toast appears"]
   - [What should NOT happen: "No error in console, no duplicate entries"]

4. **Edge Cases to Verify:**
   - [Boundary condition 1: "Empty input should show validation error"]
   - [Boundary condition 2: "Special characters in name field should be escaped"]

## Technical Details
- **APIs changed:** [New endpoints, modified request/response schemas]
- **Database changes:** [New tables, altered columns, migrations]
- **Configuration:** [New env variables, feature flags, config values]
- **Infrastructure:** [New services, changed deployments, dependency updates]

## Acceptance Criteria Status
- [x] [Criterion from the original issue] — verified by [specific test or manual check]
- [x] [Criterion 2] — verified by [specific test]
- [ ] [Criterion not met] — [explanation of what's pending]
```

**Rules for QA test steps:**
- Must be concrete and actionable — never generic ("test that it works")
- Include specific input values, URLs, or commands
- Describe expected visual/behavioral outcomes, not just "it should work"
- Include at least 2 edge cases per issue

### Step 4: Present and Confirm

**In batch mode:** Show a preview of all updates grouped by issue key. Ask for confirmation before applying any.

**In single mode:** Show the full update content. Ask to proceed.

Ask user preference: **"Update the issue description or add as a comment?"**
- **Description update**: Appends to the existing description (never overwrites)
- **Comment**: Adds a new comment with the implementation details (preserves original description untouched)

Default recommendation: **Comment** — this preserves the original spec and creates a clear timeline.

**STOP and wait for user confirmation.**

### Step 5: Apply Updates and Report

For each issue:

**If adding as comment:**
- Call `addCommentToJiraIssue` with `contentFormat: "markdown"` and the built content

**If updating description:**
- Call `getJiraIssue` to fetch the current description
- Append the new content below the existing description (with a `---` separator)
- Call `editJiraIssue` with `contentFormat: "markdown"` and the combined description

Report:

```
JIRA issues updated:

| Issue    | Mode    | Summary                    |
|----------|---------|----------------------------|
| PROJ-101 | Comment | Domain model types          |
| PROJ-102 | Comment | Port traits                 |
| PROJ-103 | Comment | Service layer               |

All issues updated with implementation details and QA test steps.
```

## Error Handling

| Error | Action |
|-------|--------|
| Atlassian MCP not available | Report and suggest `/plugin` + `/mcp` setup |
| Auth failure | Report: "Re-authenticate via `/mcp`" |
| No .jira-map.json and no issue key | Report and suggest `/plan-to-jira` or provide a key |
| Issue not found | Report which key failed, continue with remaining issues |
| Edit fails | Try adding as comment instead; report if both fail |
| No git diff available | Ask user to describe what was implemented manually |

## Guidelines

- **Never overwrite the original description** — always append or use comments
- **Use `contentFormat: "markdown"`** for all content
- **QA steps must be specific** — include real URLs, input values, and expected outputs
- **Fill every section** — use "N/A" for sections with no relevant changes, not omission
- **In batch mode, always preview before applying** — never update silently
- **Acceptance criteria should reference specific tests** by name when possible
