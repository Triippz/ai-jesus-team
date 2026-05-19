---
name: merge-request
description: "Use when you need to push a branch and create a GitLab merge request via glab CLI"
---

# Merge Request

## Purpose

Push the current branch and create a GitLab merge request using the `glab` CLI.

## Prerequisites

Verify `glab` is installed and authenticated before proceeding:
```bash
glab --version
glab auth status
```

If `glab` is missing: "Install with `brew install glab`, then `glab auth login`."
If not authenticated: "Run `glab auth login` in your terminal."

## Workflow

1. **Gather context** — branch name, status, commits vs main, diff stats
2. **Verify commit messages** — format `type: [scope] description`, no AI attribution, no Co-Authored-By
3. **Generate MR title and description** — title under 70 chars, description with Summary, Changes, Test Plan, Notes
4. **Push and create** — `git push -u origin <branch>` then `glab mr create --title "..." --description "..." --target-branch main`
5. **Report** — MR URL, title, target branch, commit count

## Rules

- Never push to main/master directly
- Commit messages must follow `type: [scope] description` format
- No AI attribution in commits
- Always ask user permission before pushing
