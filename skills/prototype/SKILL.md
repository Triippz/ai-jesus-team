---
name: prototype
description: Build throwaway code to answer a design question before committing to an implementation
---

# Prototype Skill

Build throwaway code to answer a question. Not production code — a question with runnable output.

**Skill Type: Flexible** — Branch selection is automatic based on the question type.

## Activation

User provides a question or a module to prototype. Detect the branch automatically.

Confirm branch with one line before building:
- `Logic branch: building state machine explorer.`
- `UI branch: building variation sampler.`

If the question is ambiguous, ask: `Logic question or UI question?` — one line, no elaboration.

## Branch Detection

Read the user's question and route to one of two branches:

### LOGIC Branch

Triggered when the question is:
- "Does this state model feel right?"
- "What happens when X and Y happen in sequence?"
- "Is this business rule correct at the edges?"
- "Does this flow handle the hard cases?"

**Goal**: Push the state machine through the cases that are hard to reason about on paper.

### UI Branch

Triggered when the question is:
- "What should this look like?"
- "Which layout feels right?"
- "How should this interaction work?"
- "What are the options for presenting this data?"

**Goal**: Generate radically different variations to make a concrete decision possible.

---

## LOGIC Branch — Process

### 1. Build a Tiny Terminal App

- Location: place it next to the module it's prototyping, e.g. `src/payments/__prototype__/`
- One file where possible. Two if absolutely necessary.
- Name it clearly: `state-explorer.ts`, `flow-probe.py`, `model-test.js`

### 2. Push Hard Cases

Build scenarios that expose the edges of the model:
- Concurrent or out-of-order events
- Missing or null inputs
- Boundary values (zero, max, empty collection)
- State transitions that seem impossible but could happen
- Rollback / undo / retry sequences

### 3. Surface State After Every Action

After every action or event, print the full relevant state:

```
[action: payment.submitted]
state: { status: "pending", retries: 0, amount: 99.99, lockedAt: null }

[action: payment.timeout]
state: { status: "failed", retries: 1, amount: 99.99, lockedAt: null }
```

### 4. One Command to Run

Use whatever the project's task runner supports:
- `npm run proto` / `npx ts-node src/payments/__prototype__/state-explorer.ts`
- `python proto.py`
- `go run ./proto/`
- `make proto`

Document the command at the top of the file as a comment.

---

## UI Branch — Process

### 1. Generate Radically Different Variations

Build at least 3 variations — make them meaningfully different, not just color swaps:
- Different information hierarchy (what's prominent changes)
- Different interaction model (click vs hover vs inline edit)
- Different density (card vs list vs table)
- Different progressive disclosure (everything visible vs expand-on-demand)

### 2. Make Variations Switchable

Switch via URL param or toggle — user must be able to flip between them without reload:
- `?variant=a`, `?variant=b`, `?variant=c`
- Or a visible toggle in the corner of the screen

### 3. Location

Place next to the module: `src/dashboard/__prototype__/`
One HTML/JSX/Vue file per variation, or one file with a variant switch.

### 4. One Command to Run

```
npm run proto
# or
npx vite src/dashboard/__prototype__/
```

---

## Rules (Both Branches)

1. **Throwaway from day one** — add a comment at the top: `// PROTOTYPE — delete or absorb when answered`
2. **One command to run** — document it at the top of the file
3. **No persistence** — state lives in memory only; no DB writes, no file writes
4. **Skip the polish** — no tests, no error handling beyond runnable, no abstractions, no types unless the language requires them
5. **Surface the state** — after every action, print or render the full relevant state
6. **Clearly marked** — directory name includes `__prototype__` or `_proto`

## When Done

Capture the ANSWER, not the code.

Write the decision to one of:
- Commit message: `proto(payments): state model holds; lock must be explicit`
- ADR: `docs/adr/0014-payment-state-locking.md`
- Issue comment with the finding
- `NOTES.md` next to the prototype directory

Then: delete the prototype or absorb the relevant logic into production code.

Offer: `Delete prototype or absorb logic?` — one line.
