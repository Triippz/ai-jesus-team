---
name: resolve-reviews
description: "Fetch unresolved GitLab MR review comments, research and triage each, implement fixes, reply to all threads with evidence-backed rationale, and resolve discussions"
---

# Resolve Reviews

## Purpose

Address GitLab merge request review comments with research-backed triage, human-in-the-loop approval, and mandatory replies to every thread.

## Prerequisites

Verify `glab` is installed and authenticated before proceeding:
```bash
glab --version
glab auth status
```

If `glab` is missing: "Install with `brew install glab`, then `glab auth login`."
If not authenticated: "Run `glab auth login` in your terminal."

## Workflow

### Phase A: Discovery

1. **Identify MR** — `glab mr list --source-branch="$(git branch --show-current)" --json id,iid,title,web_url,state`
2. **Fetch discussions** — `glab api "projects/:fullpath/merge_requests/<MR_IID>/discussions" --paginate`
3. **Filter unresolved** — notes where `resolvable: true` AND `resolved: false`
4. **Present numbered list** grouped by file

### Phase B: Triage with Research

5. **Categorize each comment** as FIX / DISCUSS / DECLINE / CLARIFY
6. **For DECLINE and DISCUSS items, research before presenting:**
   - Search the repository for existing patterns and conventions (Grep/Glob/Read)
   - Search external sources (web, documentation) for authoritative evidence
   - Compile rationale: reviewer's suggestion, pros, cons, external evidence with URLs, repo conventions, recommendation
   - Do NOT rely on training data — cite sources
   - If no evidence supports declining, default to FIX
7. **Present triage to user** — STOP and wait for confirmation
   - User can override DECLINE -> FIX or choose DISCUSS options

### Phase C: Plan and Implement

8. **Create implementation plan** for all FIX items — STOP and wait for approval
9. **Implement fixes** — read context, make minimal changes, verify tests pass

### Phase D: Commit, Reply, Resolve

10. **Commit and push** — `fix: [scope] description`, no AI attribution
11. **Reply to ALL threads** via GitLab API (MANDATORY):
    - FIX: what changed + commit SHA + brief rationale
    - DECLINE: full rationale (pros, cons, external evidence, repo conventions, decision)
    - Never mention AI or automated tools in replies
    ```bash
    glab api "projects/:fullpath/merge_requests/<MR_IID>/discussions/<DISCUSSION_ID>/notes" \
      --method POST --field "body=<message>"
    ```
12. **Resolve all threads:**
    ```bash
    glab api "projects/:fullpath/merge_requests/<MR_IID>/discussions/<DISCUSSION_ID>" \
      --method PUT --field "resolved=true"
    ```
13. **Report summary** — counts by category, changes made, rationale summaries

## Rules

- Research before declining — evidence from repo or external sources required
- Human decides — developer has final say on all DECLINE/DISCUSS items
- Every thread gets a reply before resolution, no exceptions
- DECLINE replies should educate reviewers and AI review agents
- Keep fixes minimal and focused
- Test after every fix
