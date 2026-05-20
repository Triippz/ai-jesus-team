---
name: debugging
description: Triggered when investigating and fixing a bug using structured methodology
---

# Debugging Skill

Structured debugging process. Follow these steps in order — do not jump to conclusions.

**Skill Type: Rigid** — Follow this process exactly. Do not skip steps.

## Building a Feedback Loop

**Build the right feedback loop, and the bug is 90% fixed.**

Before diving into hypotheses, establish a loop that can tell you — automatically, quickly, repeatedly — whether the bug is present. Treat the loop as a product: make it faster, sharper, more deterministic.

Choose the tightest loop that can still reach the bug. Work down this hierarchy only when a tighter option cannot expose the bug:

1. **Failing test** at whatever seam reaches the bug — unit, integration, or e2e. The gold standard: runs in CI, documents the bug forever, becomes the regression guard.
2. **Curl / HTTP script** against a running dev server. For bugs in request handling or API behavior: a one-liner you can run in 2 seconds and read instantly.
3. **CLI invocation** with a fixture input, diffing stdout against a known-good snapshot. Deterministic, scriptable, zero UI overhead.
4. **Headless browser script** (Playwright/Puppeteer) — drives UI, asserts on DOM, console output, and network traffic. Use when the bug requires a browser context but not human interaction.
5. **Replay a captured trace** — save the real network request, payload, or event log; replay it through the code path in isolation. Decouples reproduction from live dependencies.
6. **Throwaway harness** — a minimal subset of the system that exercises only the bug code path. Useful when the real entry point is too expensive or too coupled to isolate quickly.
7. **Property / fuzz loop** — if the bug manifests as "sometimes wrong output," run 1,000 random inputs and collect the failures. Turns a vague report into a concrete counterexample.
8. **Bisection harness** — automate "boot at state X, check invariant, repeat" so `git bisect run` can find the introducing commit without human intervention.
9. **Differential loop** — run the same input through old vs. new version and diff the outputs. Useful for regressions where the correct output is known to have changed.
10. **HITL bash script** — last resort when a human must click or observe something. Structure the loop so captured output (screenshots, logs, clipboard) feeds back into the next iteration automatically. Minimize the human step; automate everything around it.

### Non-deterministic bugs

For flaky or intermittent bugs, the goal is higher reproduction rate — not a single reproduction. A 50% flake is debuggable; a 1% flake is not.

Tactics:
- Run the loop 100 times and collect all failures
- Parallelize loop runs to compress wall-clock time
- Add stress (load, concurrency, resource pressure) to surface timing-dependent bugs
- Narrow timing windows by adding artificial delays or disabling optimizations at suspect points
- Log timestamps and thread IDs aggressively until the pattern becomes visible

Do not proceed to hypotheses until you have a loop running at ≥ 20% reproduction rate.

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
