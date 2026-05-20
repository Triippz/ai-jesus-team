---
name: handoff
description: Compacts the current session into a structured handoff document so a fresh agent can continue the work without context loss
---

# Handoff Skill

Produces a concise, structured handoff document that gives a fresh agent everything it needs to continue the current session's work — without duplicating artifacts that already exist on disk.

**Skill Type: Rigid** — Follow every step in order. Do not skip sections.

## When to Invoke

- Before ending a long session where work is in progress
- Before switching to a different context or machine
- Before handing work to another agent or team member
- When the user says "I need to stop" or "pick this up later"
- When the conversation is approaching a context window limit

## Output Location

Save the handoff document to the OS temp directory, never to the workspace.

Path: `$TMPDIR/handoff-YYYY-MM-DD-HHMMSS.md`

If `$TMPDIR` is not set, use `/tmp/`.

Do not write the handoff to the project directory, `docs/`, or any version-controlled location. Handoffs are ephemeral session artifacts.

After writing, print the full path so the user can open or share it.

## Process

### Step 1: Read the Session State

Before writing anything, gather:

1. **Git state**
   - Current branch: `git branch --show-current`
   - Uncommitted changes: `git status --short`
   - Last 5 commits: `git log --oneline -5`
   - Staged vs unstaged split: `git diff --stat HEAD`

2. **Artifacts on disk**
   - Scan for recently modified files: any plans, specs, ADRs, CONTEXT.md, tasks.md
   - Note paths — do not read full content unless needed for the summary

3. **Test status**
   - Check for a test command in package.json, Makefile, or CI config
   - If tests were run during the session, note whether they pass or fail
   - Do not run tests during handoff generation

4. **Arguments**
   - If the user passed arguments to `/handoff <args>`, treat them as the focus of the next session. Tailor the "Suggested Next Steps" and "Suggested Skills" sections to that focus.

### Step 2: Write the Handoff Document

Write to `$TMPDIR/handoff-YYYY-MM-DD-HHMMSS.md` using this exact structure:

---

```markdown
# Handoff — YYYY-MM-DD HH:MM

## What Was Accomplished
<Bullet list of concrete completed work this session. Reference commits by short hash when relevant. 3-8 bullets.>

## What Is In Progress
<Work that was started but not finished. Be specific: which file, which step, which decision. Reference artifact paths, not content.>

## What Is Blocked
<Anything waiting on an external dependency, decision, or information. Describe the blocker precisely.>

## Git State
- Branch: `<branch-name>`
- Uncommitted changes: <count> files (`git status --short` summary)
- Last commit: `<hash> <message>`

## Key Artifacts
<Reference artifacts by path only — do not duplicate their content.>
- Plan: `<path>` (if exists)
- Spec: `<path>` (if exists)
- Tasks: `<path>` (if exists)
- ADRs: `<paths>` (if any were created or modified)
- CONTEXT.md: `<path>` (if exists)

## Key Decisions Made
<Decisions reached this session that are not yet recorded in an artifact. If a decision is already in an ADR or plan, reference the artifact instead of repeating it.>

## Suggested Next Steps
<Ordered list of what the next session should do first. Tailor to the user's arguments if provided.>

## Suggested Skills
<Which skills the next session should invoke, and when. Format: `/skill-name` — <why and when to use it>.>

## Open Risks and Deferred Decisions
<Anything explicitly left unresolved, with the condition for revisiting.>
```

---

### Step 3: Redact Sensitive Information

Before writing the file, scan the document for:
- API keys, tokens, secrets (patterns: `sk-`, `Bearer `, `password=`, `secret=`, `token=`, long hex/base64 strings)
- Email addresses if they appear as credentials or PII (not as artifact authors)
- Database connection strings with credentials embedded

Replace any match with `[REDACTED]`. If a value looks like a secret but you are uncertain, redact it.

### Step 4: Verify Completeness

Before saving, confirm:

- [ ] "What Was Accomplished" has at least one bullet
- [ ] "What Is In Progress" is specific enough that a new agent can pick up exactly where this one left off
- [ ] All artifact references are real paths that exist on disk
- [ ] No sensitive information remains in plain text
- [ ] The document is concise — target 300-600 words, never more than 800
- [ ] If the user provided arguments, "Suggested Next Steps" reflects them

### Step 5: Save and Report

1. Write the file to the temp path
2. Print the full absolute path
3. Print a one-line summary: "Handoff written. Next session: `<first suggested next step>`."

Do not print the full document to the conversation unless the user asks. The file is the artifact; the path is sufficient.

## Rules

1. **Save to temp, never to the workspace** — handoffs are ephemeral
2. **Reference artifacts by path, never duplicate their content** — this is a pointer document, not a transcript
3. **Redact before writing** — never leave secrets in the handoff file
4. **Tailor to arguments** — if the user specifies what the next session will focus on, every section should reflect that focus
5. **Keep it concise** — 300-600 words; a bloated handoff defeats its purpose
6. **Specific over vague** — "resume Phase 3 of spec 004-payment-flow at the contracts section" beats "continue the spec work"
7. **Do not run tests or builds** — read test status from the session, do not trigger new runs
