---
name: plan-to-github
description: Use when converting an implementation plan from docs/plans/ into GitHub Issues — creates a parent issue with task list and child issues per plan step, using the standard description template
---

# Converting Plans to GitHub Issues

## Overview

Read an implementation plan from `docs/plans/`, create a parent issue with a task list in GitHub, and create one child issue per plan step — each with a structured description including checklist, technical details, acceptance criteria, design notes, and dependencies.

**Core principle:** Load plan -> Verify `gh` CLI -> Create parent issue with task list -> Create child issues -> Write map file -> Report.

**Slicing principle:** Each issue is a tracer-bullet vertical slice — a narrow but complete path through all integration layers from UI to database (or equivalent). Never create horizontal slices (e.g., "implement all models" or "wire up all routes"). A vertical slice delivers end-to-end value that can be demonstrated and tested independently.

**Execution classification:** Every issue is classified as AFK (Away From Keyboard — an agent can implement and merge without human interaction) or HITL (Human In The Loop — requires a human decision, design review, or manual testing step). Prefer AFK slices. Design slices to maximize AFK ratio.

**Announce at start:** "I'm using the plan-to-github skill to create GitHub Issues from your implementation plan."

## Prerequisites

**Before starting, verify the `gh` CLI is authenticated.**

Run `gh auth status`. If it fails, STOP and print:

```
This skill requires the GitHub CLI (`gh`) to be authenticated.

Setup:
  brew install gh        # Install if needed
  gh auth login          # Authenticate with your GitHub account

Once authenticated, re-run /plan-to-github.
```

Also verify the current directory is a git repo with a GitHub remote:

```bash
gh repo view --json nameWithOwner -q '.nameWithOwner'
```

If this fails, STOP and report that no GitHub remote is configured.

## The Process

### Step 1: Discover Repository

1. Run `gh repo view --json nameWithOwner -q '.nameWithOwner'` to get the repo (e.g., `Triippz/nuvcard`)
2. Check for existing labels by running `gh label list`
3. If no `plan-step` label exists, create it: `gh label create "plan-step" --color "0E8A16" --description "Auto-created from implementation plan"`

### Step 2: Load the Plan

- List files in `docs/plans/` and let the user pick, or accept a path argument
- Parse the plan markdown:
  - **Title**: H1 heading
  - **Overview**: Content before the first step
  - **Steps**: H2 or H3 sections matching `## Step N:` or `### N.` patterns
  - **Per step**: "What to implement", "Tests to write", "Acceptance criteria" subsections
- Confirm with the user: "Found N steps in plan `<filename>`. Create a parent issue with N child issues in `<owner/repo>`?"

**STOP and wait for user confirmation before creating any issues.**

### Step 3: Create Parent Issue

Run:

```bash
gh issue create \
  --title "<plan title>" \
  --body "<plan overview + task list linking to child issues>" \
  --label "plan-step"
```

The parent issue body should include:
- The plan overview/goal section
- A task list that will be updated with child issue references after they're created:

```markdown
## Plan Steps

- [ ] Step 1: <title>
- [ ] Step 2: <title>
- [ ] Step 3: <title>
```

Record the returned issue number.

### Step 4: Create Child Issue Per Plan Step

**Vertical slice rule:** Each child issue must be a tracer-bullet vertical slice — a narrow but complete end-to-end path through all integration layers. Do not create issues that implement only one layer. Each issue should deliver a thin slice that works all the way through. A child issue passes this check if: (a) it can be demonstrated running, and (b) it has a clear acceptance test that exercises the full path.

**AFK/HITL classification rule:** Before creating each issue, classify it:
- **AFK** (Away From Keyboard) — An agent can implement, test, and open a PR without any human decision or interaction.
- **HITL** (Human In The Loop) — A human must make a decision, approve a design direction, conduct a manual test, or interact with the system at some point.

Prefer AFK. If an issue is HITL, note specifically what human action is required and when.

For each step in the plan, build the description using the **mandatory template**:

```markdown
## Description
[Step's "What to implement" content from the plan. Focus on implementation-level details.
References parent issue #<parent-number>.
Describe the vertical slice: what end-to-end path does this issue deliver?]

## Execution Classification
**AFK / HITL:** [AFK or HITL]
[If AFK: confirm that acceptance criteria are unambiguous and no human decision or manual test is required.]
[If HITL: describe specifically what human action is required and at what point in implementation.]

## Checklist
- [ ] [Specific sub-task or deliverable 1]
- [ ] [Specific sub-task or deliverable 2]
- [ ] [Tests written and passing]

## Technical Details
[Files to create or modify, APIs affected, database schema changes,
environment variables, configuration changes.]

## Acceptance Criteria
Given [precondition from the plan's acceptance criteria]
When [action]
Then [expected result]

[Repeat for each criterion.]

## Design / UX Notes
[If the plan references Figma files, wireframes, or design decisions,
include them here. Otherwise: "No design changes in this step."]

## Dependencies
[List which prior steps must be complete before this one can start.
Note any external dependencies.]

---
Parent: #<parent-number>
```

For each step, run:

```bash
gh issue create \
  --title "Step N: <step title>" \
  --body "<filled template>" \
  --label "plan-step"
```

**Create issues sequentially** (one at a time) to avoid rate limits.

Record each returned issue number.

### Step 5: Update Parent Issue with Cross-References

After all child issues are created, update the parent issue body to replace the placeholder task list with linked references:

```markdown
## Plan Steps

- [ ] #101 Step 1: <title>
- [ ] #102 Step 2: <title>
- [ ] #103 Step 3: <title>
```

Run:

```bash
gh issue edit <parent-number> --body "<updated body with issue refs>"
```

### Step 6: Write GitHub Map File

Write `docs/plans/<plan-basename>.github-map.json`:

```json
{
  "planFile": "docs/plans/2026-05-19-feature-x-plan.md",
  "repo": "Triippz/nuvcard",
  "parentIssue": 100,
  "steps": [
    { "step": 1, "title": "Domain model types", "issueNumber": 101 },
    { "step": 2, "title": "Port traits", "issueNumber": 102 }
  ],
  "createdAt": "2026-05-19T10:00:00Z"
}
```

This file links plan steps to GitHub Issues. It is used by `/execute-plan` (status updates) and `/update-github` (post-implementation updates).

### Step 7: Report and Offer Next Steps

```
GitHub Issues created from plan "<plan title>":

Parent: #100 — <plan title>

| Step | Issue | Summary                    |
|------|-------|----------------------------|
| 1    | #101  | Domain model types          |
| 2    | #102  | Port traits                 |
| 3    | #103  | Service layer               |

Map file written to: docs/plans/<plan-basename>.github-map.json

Next steps:
- `/tdd` — Write tests for step 1
- `/execute-plan` — Start executing the plan
```

## Error Handling

| Error | Action |
|-------|--------|
| `gh` not installed | Report and suggest `brew install gh` |
| `gh` not authenticated | Report: "Run `gh auth login` to authenticate" |
| No GitHub remote | Report and suggest adding a remote |
| No plans in docs/plans/ | Tell user to run `/write-plan` first |
| Plan not parseable | Report which sections could not be parsed, create issues for what was parsed |
| Issue creation fails | Report which step failed, continue with remaining steps, report at end |
| Rate limit | Wait 2 seconds and retry once; if still failing, report and stop |

## Guidelines

- **Never create issues without user confirmation** of the plan and target repo
- **The mandatory description template must be used for every child issue** — no exceptions
- **Fill every section** — if information is not in the plan, write "N/A" rather than omitting the section
- **Create issues sequentially** — one at a time, not in parallel
- **Always write the map file** — other skills depend on it for status updates
- **Vertical slices only** — every issue must deliver a complete end-to-end path; reject horizontal slices
- **Classify every issue AFK or HITL** — never leave classification blank; if uncertain, default to HITL
- **Prefer AFK** — if an issue can be redesigned to eliminate a human gate without compromising quality, do it before creating the issue
- **Use `gh` CLI for all operations** — never use the GitHub API directly or via MCP
