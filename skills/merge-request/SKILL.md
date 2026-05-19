---
name: merge-request
description: Use when you need to push a branch and create a GitLab merge request - handles branch pushing, MR title/description generation, commit analysis, and glab CLI invocation
---

# Creating a GitLab Merge Request

## Overview

Push the current branch and create a merge request on GitLab using the `glab` CLI.

**Core principle:** Analyze commits -> Generate MR content -> Push -> Create MR -> Return URL.

**Announce at start:** "I'm using the merge-request skill to push and create a merge request."

## Prerequisites

**Before starting, verify `glab` is available:**

```bash
glab --version
```

If `glab` is not installed, STOP and print:

```
This skill requires the GitLab CLI (glab) to create merge requests.

Setup:
  brew install glab          # Install
  glab auth login            # Authenticate (one-time)

Once installed, re-run /mr.
```

If `glab` is installed but not authenticated (`glab auth status` fails), STOP and print:

```
GitLab CLI is installed but not authenticated.

Run this in your terminal:
  glab auth login

Once authenticated, re-run /mr.
```

## The Process

### Step 1: Gather Context

Run these commands in parallel to understand what we're working with:

```bash
# Current branch and status
git branch --show-current
git status

# Check if branch tracks a remote and is up to date
git rev-parse --abbrev-ref --symbolic-full-name @{u} 2>/dev/null || echo "no upstream"

# Recent commits on this branch vs base
git log main..HEAD --oneline 2>/dev/null || git log master..HEAD --oneline 2>/dev/null

# Full diff against base for MR description
git diff main...HEAD --stat 2>/dev/null || git diff master...HEAD --stat 2>/dev/null
```

**If on main/master:** Stop. "You're on the main branch. Create a feature branch first."

### Step 2: Verify Commit Messages

Check ALL commits that will be in the MR:

```bash
git log main..HEAD --format="%s" 2>/dev/null || git log master..HEAD --format="%s" 2>/dev/null
```

Every commit message must:
- Follow format: `type: [scope] description`
- NOT contain "Claude", "Anthropic", or any AI tool references
- NOT contain `Co-Authored-By` AI attribution lines
- Use allowed types: `feat`, `fix`, `docs`, `refactor`, `test`, `perf`, `build`, `ci`, `chore`

**If any commit violates these rules:** Fix them before proceeding. Ask the user for permission to rebase.

### Step 3: Generate MR Title and Description

**Title rules:**
- Under 70 characters
- Derived from the primary commit or branch name
- Format: matches the dominant commit type

**Description template:**

```markdown
## Summary
<1-3 bullet points summarizing what changed and why>

## Changes
<bulleted list of specific changes, grouped by area>

## Test Plan
- [ ] <testing steps or verification done>

## Notes
<any additional context, breaking changes, or follow-up items>
```

### Step 4: Push and Create MR

```bash
# Push branch (set upstream if needed)
git push -u origin <branch-name>

# Create MR via glab CLI
glab mr create \
  --title "<title>" \
  --description "$(cat <<'EOF'
<generated description>
EOF
)" \
  --target-branch main
```

**Optional flags based on context:**
- `--assignee @me` — assign to self
- `--label <labels>` — if labels are known
- `--draft` — if user indicates work-in-progress
- `--remove-source-branch` — clean up after merge

### Step 5: Report Result

```
Merge request created:
  URL: <MR URL>
  Title: <title>
  Target: main
  Commits: <count>
```

## Error Handling

| Error | Action |
|-------|--------|
| `glab` not found | Tell user to install: `brew install glab` |
| Not authenticated | Tell user to run: `! glab auth login` |
| Remote not configured | Run `git remote -v` and help configure |
| Push rejected | Check if branch exists on remote, pull first if needed |
| MR already exists | Show existing MR URL via `glab mr list --source-branch <branch>` |
