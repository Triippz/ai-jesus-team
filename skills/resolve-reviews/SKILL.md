---
name: resolve-reviews
description: Use when a merge request has review comments that need to be addressed - fetches unresolved GitLab MR discussions, researches and triages each comment with evidence, implements fixes, replies to all threads with full rationale, and resolves discussions
---

# Resolving Merge Request Review Comments

## Overview

Fetch all unresolved review comments from a GitLab merge request, research and evaluate each one with evidence-backed rationale, implement approved fixes, reply to every comment thread, and resolve all discussions.

**Core principle:** Fetch -> Research -> Triage (with human approval) -> Plan (with human approval) -> Implement -> Reply to ALL threads -> Resolve.

**Announce at start:** "I'm using the resolve-reviews skill to address merge request review comments."

## Prerequisites

**Before starting, verify `glab` is available:**

```bash
glab --version
```

If `glab` is not installed, STOP and print:

```
This skill requires the GitLab CLI (glab) to fetch and reply to merge request comments.

Setup:
  brew install glab          # Install
  glab auth login            # Authenticate (one-time)

Once installed, re-run /resolve-reviews.
```

If `glab` is installed but not authenticated (`glab auth status` fails), STOP and print:

```
GitLab CLI is installed but not authenticated.

Run this in your terminal:
  glab auth login

Once authenticated, re-run /resolve-reviews.
```

## Phase A: Discovery

### Step 1: Identify the Merge Request

Determine which MR to work on. Try in order:

```bash
BRANCH=$(git branch --show-current)
glab mr list --source-branch="$BRANCH" --json id,iid,title,web_url,state | head -5
```

If no MR found for the current branch, ask the user: "Which MR should I review? Provide the MR number or URL."

### Step 2: Fetch Unresolved Discussions

Use the GitLab API to get all discussions, then filter to unresolved:

```bash
glab api "projects/:fullpath/merge_requests/<MR_IID>/discussions" --paginate
```

From the JSON response, extract discussions where `notes` contain unresolved items:
- A discussion is unresolved if any note has `"resolvable": true` and `"resolved": false`
- Extract per comment: **discussion_id**, note_id, body, author username, file path, line number, created date
- Track the discussion_id for each comment — it is required for replying and resolving later

Also fetch the MR diff for context:

```bash
glab mr diff <MR_IID>
```

### Step 3: Organize and Present Comments

Group unresolved comments and present them as a numbered list:

```
Found <N> unresolved review comments on MR !<IID>:

1. [file.rs:42] @reviewer — "This function is too long, consider splitting"
2. [file.rs:108] @reviewer — "Missing error handling for the timeout case"
3. [General] @ai-reviewer — "Can we add a test for the edge case where..."
4. [lib.rs:15] @reviewer — "Typo in doc comment"
```

If zero unresolved comments are found, report "No unresolved review comments found on MR !<IID>" and stop.

## Phase B: Triage with Research

### Step 4: Evaluate Each Comment with Research

For each comment, analyze it and categorize:

| Category | Description | Action |
|----------|-------------|--------|
| **FIX** | Valid concern, clear fix needed | Implement the fix |
| **DISCUSS** | Valid concern but approach is debatable | Present options to user |
| **DECLINE** | Disagree with the suggestion or out of scope | Present evidence-backed rationale |
| **CLARIFY** | Need more info to understand | Ask user for context |

#### Research Protocol for DECLINE and DISCUSS Items

For every item you categorize as DECLINE or DISCUSS, you MUST perform research before presenting. Do NOT rely on training data alone.

**1. Repository evidence first:**
- Use Grep/Glob/Read to search the codebase for existing patterns related to the reviewer's suggestion
- Check linting configuration (`.eslintrc`, `clippy.toml`, `pyproject.toml`, `.editorconfig`, etc.)
- Look for prior art — has this pattern been used or explicitly avoided elsewhere?
- Check project documentation (README, CLAUDE.md, CONTRIBUTING.md) for relevant conventions

**2. External research second:**
- Use available web search or documentation tools to find authoritative sources
- Look for: language/framework official style guides, security advisories, performance benchmarks, community consensus
- Cite specific URLs for every external claim

**3. Compile a rationale block** for each DECLINE/DISCUSS item:

```
--- Research Rationale ---
Reviewer's suggestion: [what they want changed]

Pros of making the change:
- [bullet point with evidence]
- [bullet point with evidence]

Cons of making the change:
- [bullet point with evidence]
- [bullet point with evidence]

External evidence:
- [Source title](URL) — [key finding]
- [Source title](URL) — [key finding]

Repository conventions:
- [What the codebase already does, with file:line references]

Recommendation: [DECLINE/DISCUSS] — [reasoning]
--- End Rationale ---
```

**Critical rule:** If you cannot find external or repository evidence to support declining a suggestion, default to FIX. The burden of proof is on declining, not on fixing.

### Step 5: Present Triage for Human Approval

Present the full evaluation to the user:

```
=== TRIAGE: <N> unresolved review comments on MR !<IID> ===

FIX (will implement):
  1. [file.rs:42] @reviewer — "Function too long"
     Plan: Split into helper functions
  4. [lib.rs:15] @reviewer — "Typo in doc comment"
     Plan: Fix typo

DECLINE (recommend pushing back):
  3. [General] @ai-reviewer — "Add edge case test"
     --- Research Rationale ---
     Reviewer's suggestion: Add test for X edge case
     Pros of making the change:
     - Increases test coverage metric
     - Defensive coding practice
     Cons of making the change:
     - X is validated at boundary (see src/validator.rs:15), scenario cannot occur
     - Test would be dead code that adds maintenance burden
     External evidence:
     - [Testing Best Practices](https://example.com/...) — "Avoid testing unreachable paths"
     Repository conventions:
     - No existing tests for boundary-guarded scenarios (0 similar tests found)
     - Validator at src/validator.rs:15 rejects this input class
     Recommendation: DECLINE — the test would be unreachable dead code
     --- End Rationale ---

DISCUSS (need your input):
  2. [file.rs:108] @reviewer — "Missing timeout handling"
     --- Research Rationale ---
     ...two approaches with evidence for each...
     Option A: Add timeout wrapper (simple, matches stdlib pattern)
     Option B: Restructure with cancellation (matches framework best practices per [link])
     Recommendation: Option A — simpler, aligns with existing codebase patterns
     --- End Rationale ---

CLARIFY (need more context):
  (none)

>>> For each DECLINE item, confirm or override to FIX (e.g., "3 -> fix")
>>> For each DISCUSS item, choose an option (e.g., "2 -> A")
>>> Type "approve" to accept all recommendations as-is
```

**STOP and wait for explicit user confirmation before proceeding.** Any user overrides convert DECLINE items into FIX items with the user's chosen approach.

## Phase C: Plan and Implement

### Step 6: Implementation Plan

After triage is approved, produce a plan for all FIX items:

```
=== IMPLEMENTATION PLAN ===

Fix #1: [file.rs:42] Split process_data()
  - Extract validate_input() (lines 42-60)
  - Extract transform() (lines 61-85)
  - Extract persist() (lines 86-100)
  - Update call site at main.rs:12

Fix #4: [lib.rs:15] Fix typo
  - Line 15: "recieve" -> "receive"

Files to modify: file.rs, main.rs, lib.rs
```

**STOP and wait for user approval of the plan before implementing.**

### Step 7: Implement Fixes

For each approved FIX item:

1. **Read the relevant file** to understand the full surrounding context
2. **Make the change** — keep fixes focused and minimal, addressing exactly what the reviewer asked
3. **Verify** the fix compiles and tests pass after each change

If a fix breaks tests, stop and report the failure. Ask the user how to proceed.

## Phase D: Commit, Reply, Resolve

### Step 8: Commit and Push

Group related fixes into logical commits:

```bash
git add <changed-files>
git commit -m "fix: [scope] address MR review comments

- Split long function into helpers (comment #1)
- Fix doc comment typo (comment #4)"

git push
```

**Commit rules apply:** No AI references, no Co-Authored-By lines. Format: `type: [scope] description`. Commits must appear fully human-authored.

### Step 9: Reply to ALL Comment Threads (MANDATORY)

This step is NOT optional. You MUST reply to every single unresolved comment thread before resolving it.

#### Reply Templates

**For FIX items:**

```
Addressed in <commit-sha-short>.

**What changed:**
- <specific description of the change>

**Why this approach:**
- <brief rationale for the implementation choice>
```

**For DECLINE items — full educational rationale:**

```
After investigation, we are keeping the current approach. Here is our analysis:

**Your suggestion:** <summary of what was requested>

**Pros of making the change:**
- <bullet>
- <bullet>

**Cons of making the change:**
- <bullet>
- <bullet>

**External evidence:**
- [<source>](<url>) — <finding>
- [<source>](<url>) — <finding>

**Repository conventions:**
- <what the codebase does, with file references>

**Decision:** We are keeping the current approach because <reason>.

Happy to discuss further if you see something we missed.
```

**For DISCUSS items that became FIX:**

```
Addressed in <commit-sha-short>.

**What changed:**
- <specific description>

**Why this approach over alternatives:**
- <rationale for the chosen option, referencing the discussion>
```

**For CLARIFY items (resolved through discussion):**

```
Clarified: <explanation of what was understood and the action taken>.
```

#### Posting Replies

For each comment thread, post the reply:

```bash
glab api "projects/:fullpath/merge_requests/<MR_IID>/discussions/<DISCUSSION_ID>/notes" \
  --method POST \
  --field "body=<reply message>"
```

**Reply rules:**
- Use GitLab-flavored markdown in replies (it renders in the MR)
- Keep FIX replies concise (under 10 lines)
- DECLINE replies should be comprehensive — they educate both human reviewers and AI review agents
- Never mention AI, Claude, automated tools, or agents in replies
- Always end DECLINE replies with an invitation to continue the discussion

### Step 10: Resolve Threads and Report

After replying to each thread, resolve the discussion:

```bash
glab api "projects/:fullpath/merge_requests/<MR_IID>/discussions/<DISCUSSION_ID>" \
  --method PUT \
  --field "resolved=true"
```

If resolution fails (permissions, already resolved), log a warning and continue.

Present the final summary:

```
=== COMPLETE: MR !<IID> Review Comments Resolved ===

Fixed: <N> comments (replied + resolved)
  - [file.rs:42] Split process_data() into validate_input() + transform() + persist()
  - [lib.rs:15] Fixed typo: "recieve" -> "receive"

Declined: <N> comments (replied with rationale + resolved)
  - [General] Edge case test — boundary validation at src/validator.rs:15 makes it unreachable

Discussed: <N> comments (replied + resolved)
  - [file.rs:108] Added timeout wrapper (Option A chosen)

Threads replied to: <total>/<total>
Threads resolved: <total>/<total>
All tests passing. Changes pushed to branch <branch-name>.
```

## Error Handling

| Error | Action |
|-------|--------|
| `glab` not found | Tell user: `brew install glab` |
| Not authenticated | Tell user: `! glab auth login` |
| No MR for branch | Ask user for MR number |
| No unresolved comments | Report "No unresolved review comments found" and stop |
| Fix breaks tests | Report the failure, ask user how to proceed |
| Discussion ID not found | Log warning, skip that thread, report at end |
| Web search unavailable | Fall back to repo evidence only, note the limitation in rationale |
| Reply fails to post | Retry once, then report the failure with discussion ID |
| Resolve fails | Log warning, continue — not blocking |

## Guidelines

- **Research before declining** — never decline a reviewer's suggestion without evidence from the repository or external sources
- **Read before fixing** — always read the full file context around a review comment before making changes
- **Minimal fixes** — address exactly what the reviewer asked for, nothing more
- **Respect reviewers** — treat every comment as worth investigating, even if you ultimately disagree
- **Educate through replies** — DECLINE replies should teach reviewers and AI agents why the current approach is correct
- **Test after every fix** — compile and run tests to catch regressions early
- **Never skip replies** — every thread gets a reply before resolution, no exceptions
- **Human decides** — the developer always has final say on DECLINE/DISCUSS items
