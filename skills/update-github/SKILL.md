---
name: update-github
description: Use when updating GitHub Issues with implementation details, QA test steps, and code change summaries after work is complete
---

# Updating GitHub Issues After Implementation

## Overview

After implementation is complete, update linked GitHub Issues with what was actually built, how QA can test it manually, technical details of the changes, and acceptance criteria status.

**Core principle:** Determine scope -> Gather details from git -> Build update content per issue -> Confirm with user -> Apply updates -> Report.

**Announce at start:** "I'm using the update-github skill to update GitHub Issues with implementation details and QA instructions."

## Prerequisites

**Before starting, verify the `gh` CLI is authenticated.**

Run `gh auth status`. If it fails, STOP and print:

```
This skill requires the GitHub CLI (`gh`) to be authenticated.

Setup:
  brew install gh        # Install if needed
  gh auth login          # Authenticate with your GitHub account

Once authenticated, re-run /update-github.
```

## The Process

### Step 1: Determine Scope

**Single-issue mode** (argument provided):
- User provides an issue number (e.g., `/update-github 123`)
- Verify the issue exists: `gh issue view 123 --json number,title,state`

**Batch mode** (no argument):
- Scan `docs/plans/` for `.github-map.json` files
- If multiple found, ask user to pick; if one found, use it
- Load all step-to-issue mappings from the map file

If no `.github-map.json` exists and no issue number provided, report: "No linked GitHub Issues found. Provide an issue number (e.g., `/update-github 123`) or create links with `/plan-to-github` first." and stop.

### Step 2: Gather Implementation Details

Run these commands to understand what was built:

```bash
# File change summary
git diff main...HEAD --stat

# Commit history
git log main..HEAD --oneline

# Detailed diff for understanding changes
git diff main...HEAD
```

For batch mode, group changes by plan step using the map file:
- Match changed files to the plan steps that specified them
- Match commits to steps based on commit message references

### Step 3: Build Update Content Per Issue

For each issue, construct the update using the **mandatory template**:

```markdown
## Implementation Summary

### What Was Implemented
- [Commit-level summary: "Added validation service with input sanitization"]
- [Files created: `src/services/validator.ts` (new), `src/models/input.ts` (modified)]
- [Key decisions: "Used Valibot schema validation for email fields"]

### How to Test (QA Steps)
1. **Setup:**
   - [Environment prerequisites: "Ensure dev server is running on port 8000"]
   - [Data prerequisites: "Create a test user via dev login"]

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

### Technical Details
- **APIs changed:** [New endpoints, modified request/response schemas]
- **Database changes:** [New tables, altered columns, migrations]
- **Configuration:** [New env variables, feature flags, config values]
- **Infrastructure:** [New services, changed deployments, dependency updates]

### Acceptance Criteria Status
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

**In batch mode:** Show a preview of all updates grouped by issue number. Ask for confirmation before applying any.

**In single mode:** Show the full update content. Ask to proceed.

**STOP and wait for user confirmation.**

### Step 5: Apply Updates

For each issue, add a comment with the implementation details:

```bash
gh issue comment <number> --body "<implementation summary content>"
```

If the issue should be closed (all acceptance criteria met), ask the user:

```
Issue #<number> has all acceptance criteria met. Close it?
```

If confirmed:

```bash
gh issue close <number> --comment "All acceptance criteria verified. Closing."
```

### Step 6: Report

```
GitHub Issues updated:

| Issue | Title                      | Status  |
|-------|----------------------------|---------|
| #101  | Domain model types          | Updated |
| #102  | Port traits                 | Updated |
| #103  | Service layer               | Updated |

All issues updated with implementation details and QA test steps.
```

## Error Handling

| Error | Action |
|-------|--------|
| `gh` not installed | Report and suggest `brew install gh` |
| `gh` not authenticated | Report: "Run `gh auth login` to authenticate" |
| No `.github-map.json` and no issue number | Report and suggest `/plan-to-github` or provide a number |
| Issue not found | Report which number failed, continue with remaining issues |
| Comment fails | Report the error and continue with remaining issues |
| No git diff available | Ask user to describe what was implemented manually |

## Guidelines

- **Always add as comments** — never overwrite the original issue body
- **QA steps must be specific** — include real URLs, input values, and expected outputs
- **Fill every section** — use "N/A" for sections with no relevant changes, not omission
- **In batch mode, always preview before applying** — never update silently
- **Acceptance criteria should reference specific tests** by name when possible
- **Use `gh` CLI for all operations** — never use the GitHub API directly or via MCP
