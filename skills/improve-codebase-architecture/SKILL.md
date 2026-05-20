---
name: improve-codebase-architecture
description: Find deepening opportunities in a codebase — refactors that turn shallow modules into deep ones, improving testability and AI-navigability
---

# Improve Codebase Architecture Skill

Find deepening opportunities — refactors that turn shallow modules into deep ones, concentrating complexity behind clean seams and improving testability and AI-navigability.

**Skill Type: Flexible** — Use judgment at each phase. The process is a guide, not a checklist.

## Glossary

Use these terms consistently throughout the session:

- **Module** — anything with an interface and an implementation
- **Interface** — everything a caller must know to use the module (not just the type signature)
- **Implementation** — the code inside the module
- **Depth** — leverage at the interface. Deep = high leverage. Shallow = interface nearly as complex as implementation
- **Seam** — where an interface lives; where behavior can be altered without editing in place
- **Adapter** — a concrete thing satisfying an interface at a seam
- **Leverage** — what callers get from depth: the implementation does real work so callers don't have to
- **Locality** — what maintainers get from depth: change, bugs, and knowledge concentrated in one place

## The Deletion Test

The primary diagnostic tool. Apply it to any suspect module:

> "If I deleted this module, what happens to complexity?"

- **Complexity vanishes** — the module was a pass-through (shallow, potentially unnecessary)
- **Complexity reappears across N callers** — the module was earning its keep (deep, worth defending)

A module that passes the deletion test is a candidate for deepening. A module that fails it may not need to exist at all.

## Process

### Phase 1: Orient

Before reading any code, read context first:

1. Read `CONTEXT.md` (or equivalent domain glossary) for established terms and concepts
2. Read any ADRs (Architecture Decision Records) to understand prior trade-offs
3. Note which decisions are hard to reverse vs. which are open questions

This prevents proposing refactors that contradict hard-won decisions without understanding why they were made.

### Phase 2: Explore

Read the codebase organically, noting friction. Do not optimize for coverage — optimize for finding pain:

**Signals of shallowness:**
- A module whose interface is nearly as large as its implementation
- A module that mostly delegates to one other module with light wrapping
- A function extracted "for testability" that has no meaningful abstraction of its own
- A module that can only be understood by also reading its dependencies

**Signals of coupling leaking across seams:**
- Caller code that reconstructs internal decisions the module should have made
- Data structures passed through multiple layers unchanged
- Error handling duplicated across callers
- Constants or config values spread across many files instead of owned by one

**Signals that pure extraction hurt testability:**
- The pure function is easy to test but the real bugs hide in how it's called (setup, wiring, ordering)
- Tests pass but integration breaks — the seam is in the wrong place
- Mocks outnumber real objects in the test suite

**Apply the deletion test to each suspect.** Record which candidates survive.

### Phase 3: Present Candidates

Present a numbered list. For each candidate:

```
## Candidate N: <short name>

**Files involved:** <list files>

**Problem:** <Why does friction exist here? What is shallow or leaking?>

**Solution:** <Plain English description of the deepened module — what moves behind the seam, what the new interface hides>

**Benefits:**
- Locality: <what change/bug/knowledge gets concentrated where>
- Leverage: <what callers no longer need to know or do>
- Testability: <what tests become possible, what brittle tests disappear>
```

Use domain glossary terms from `CONTEXT.md`. If a candidate contradicts an ADR, note it — but only surface it when the friction is severe enough to warrant revisiting the decision.

### Phase 4: Grilling Loop

When the user picks a candidate, drop into interrogation mode. Work through:

1. **Constraints** — What are the hard constraints on this refactor? (Performance, API stability, team ownership, deployment coupling)
2. **Dependencies** — What depends on the current module? What does the current module depend on?
3. **Shape of the deepened module** — What is the new interface, exactly? What does it hide?
4. **What sits behind the seam** — Walk through what the implementation now owns that callers previously handled
5. **Test survival** — Which existing tests survive the refactor? Which must be rewritten? Which become possible for the first time?
6. **Rollout** — Can this be done incrementally? What is the migration path?

**During the grilling loop:**
- Update `CONTEXT.md` inline as new terms crystallize or existing terms sharpen
- Offer ADRs sparingly — only when all three are true:
  1. The decision is hard to reverse
  2. The trade-off is surprising or non-obvious
  3. There is a genuine alternative worth recording

### Phase 5: Propose Concrete Changes

After grilling, produce:

1. **The new interface** — exact signatures, types, or contracts
2. **Migration steps** — ordered, each independently shippable if possible
3. **Test plan** — what to write before touching production code
4. **Risk assessment** — what can go wrong, how to detect it, how to roll back

Do not propose changes that skip migration steps. Depth is earned incrementally.

## Rules

1. **Read context before code** — ADRs and domain glossary prevent re-litigating settled decisions
2. **Deletion test first** — do not propose deepening without applying it
3. **One candidate at a time in grilling** — do not jump between candidates; exhaust one before moving
4. **Use domain terms** — if the glossary names a concept, use that name; if not, propose a name and add it
5. **Never propose horizontal splits** — do not split a module by layer; split by capability
6. **Earn ADRs** — an ADR is not a comment; only write one when future readers will thank you
7. **Testability is a side effect** — if a refactor improves testability without improving locality and leverage, it moved the seam to the wrong place
