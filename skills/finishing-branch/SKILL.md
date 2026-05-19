---
name: finishing-branch
description: Triggered when preparing a branch for merge or PR with doc updates and verification
---

# Finishing Branch Skill

Prepare a branch for merge or pull request. Verify, update docs, and present options.

**Skill Type: Rigid** — Follow this process exactly.

## Process

### 1. Run Verification
- Invoke the verification skill (tests, lint, types)
- If verification fails: **STOP** — fix issues before finishing
- Do not proceed until all checks pass

### 1b. Transition JIRA Issues to Review (if linked)

- Scan `docs/plans/` for `.jira-map.json` files associated with the current branch
- If found, for each linked issue:
  - Call `getTransitionsForJiraIssue` to find a transition whose name contains "Review" (e.g., "In Review", "Code Review", "Ready for Review") — case-insensitive fuzzy match
  - Call `transitionJiraIssue` to transition the issue
  - If no review transition exists, call `addCommentToJiraIssue` noting work is complete
- For the parent issue: transition to review if all subtasks are done
- If no JIRA linkage exists, skip silently — this is optional

### 2. Check for Stale Documentation
Scan for docs that may need updating based on the changes in this branch:

- **README.md**: Does it still accurately describe the project?
- **API documentation**: Do any changed functions/endpoints have outdated docs?
- **Inline documentation**: Are docstrings/comments still accurate for changed code?
- **Configuration docs**: Were any config options added or changed?
- **Setup/installation docs**: Were any dependencies or steps added?

For each stale doc found:
- Explain what's stale and why
- Show the proposed update
- Apply the update

### 3. Auto-Update Stale Docs
- Update any documentation that is clearly outdated due to this branch's changes
- Don't add documentation for unchanged code
- Keep doc updates minimal and focused on accuracy

### 4. Present Options

Ask the user which action to take:

1. **Merge to parent branch**: Merge this branch into its parent (e.g., feature branch into main)
2. **Create Pull Request**: Push the branch and create a PR with a summary of changes
3. **Leave for manual review**: Do nothing further — the user will handle it

### 5. Execute Chosen Option

**If merge:**
- Confirm the target branch with the user
- ALWAYS ask for explicit permission before any git push or merge
- Never force push

**If PR:**
- Push the branch (with user permission)
- Create PR with summary of changes, test results, and doc updates
- ALWAYS ask before pushing

**If manual:**
- Report the branch status and what was done
- List any remaining action items

## Rules

1. **Verification first**: Never finish without passing verification
2. **Ask before git operations**: ALWAYS ask before push, merge, or any remote git operation
3. **Doc updates are automatic**: Don't ask permission to update stale docs, just do it
4. **Show your work**: Report what was checked, what was updated, what was skipped
