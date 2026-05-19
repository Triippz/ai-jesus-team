---
name: debugging
description: Triggered when investigating and fixing a bug using structured methodology
---

# Debugging Skill

Structured debugging process. Follow these steps in order — do not jump to conclusions.

**Skill Type: Rigid** — Follow this process exactly. Do not skip steps.

## Process

### Step 1: REPRODUCE
- Get the exact error message, stack trace, or description of unexpected behavior
- Ask: What are the exact steps to trigger this bug?
- Ask: What environment? (OS, language version, dependency versions)
- Ask: Is it consistent or intermittent?
- Create a minimal reproduction case if one doesn't exist
- **Do not proceed until you can reproduce the bug**

### Step 2: ISOLATE
- Narrow the scope progressively:
  - Which module/service?
  - Which file?
  - Which function?
  - Which line(s)?
- Check recent changes: `git log --oneline -20`
- Check recent diffs: `git diff HEAD~5`
- Use `git bisect` if the bug was recently introduced and you can identify a known-good state
- Trace the data flow: what are the inputs? What are the outputs at each stage?

### Step 3: HYPOTHESIZE
- Form 2-3 hypotheses, ranked by likelihood
- For each hypothesis:
  - **If true**: What evidence would confirm this?
  - **If false**: What evidence would refute this?
  - **Test**: What's the simplest experiment to verify?

Common categories:
- Wrong input data / unexpected null
- Logic error (off-by-one, wrong comparison, missing case)
- State issue (race condition, stale cache, unintended mutation)
- Environment issue (config, version mismatch, platform)
- Integration issue (API change, schema mismatch)

### Step 4: VERIFY
- Test hypotheses starting with the most likely
- One hypothesis at a time — don't change multiple things
- For each test:
  - What did you change or observe?
  - What was the result?
  - Does this confirm or refute the hypothesis?
- Document what you tried and what you learned

### Step 5: FIX
1. Write a regression test FIRST that captures the bug
   - The test must FAIL before the fix
   - The test must PASS after the fix
2. Implement the minimal fix
   - Don't refactor while fixing — fix only the bug
   - Don't change unrelated code
3. Run the full test suite
   - The regression test passes
   - All existing tests still pass
4. Clean up
   - Remove temporary debugging code
   - Add comments if the fix is non-obvious

## Rules

1. **Reproduce first**: No hypothesis without reproduction
2. **Evidence over intuition**: Don't guess — prove
3. **One thing at a time**: Change one variable per experiment
4. **Regression test required**: Every fix needs a test
5. **Minimal fix**: Fix the bug, nothing more
6. **Read the error**: Really read it. The answer is often right there.
