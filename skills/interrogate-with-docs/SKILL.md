---
name: interrogate-with-docs
description: Adversarial interview with domain-language enforcement, ADR generation, and code-vs-intent cross-referencing
---

# Interrogate With Docs Skill

All the behaviour of the `interrogate` skill, plus three additional capabilities: domain-language enforcement via a living glossary (CONTEXT.md), ADR generation for decisions that meet the bar, and code-vs-intent cross-referencing to surface contradictions between what the user says and what the code does.

**Skill Type: Flexible** — Adapt the question sequence to the design space, but enforce all three additional behaviours throughout.

## When to Invoke

Use this instead of `/interrogate` when:
- The project has a CONTEXT.md or needs one (domain language matters)
- The conversation involves terms that are likely overloaded or contested in this codebase
- Decisions may be hard to reverse and the reasoning should be preserved as ADRs
- You have access to the codebase and want to verify the user's stated understanding against actual code

## Core Behaviour (from interrogate)

All steps from the `interrogate` skill apply:
- Map the decision space before asking anything
- Ask one question at a time with a recommended answer
- Track branch status across the dialogue
- Surface contradictions
- Conclude with a decisions table

The three additional behaviours below run in parallel with the core interrogation loop — they are not separate phases.

---

## Additional Behaviour 1: Challenge Against the Glossary

**Before each question**, check whether the user's last response used any term that appears in CONTEXT.md (the domain glossary).

1. **Read CONTEXT.md** at the start of the session if it exists. If it does not exist, begin with an empty mental glossary and create the file lazily when the first term is defined (see Additional Behaviour 2).
2. **On each user response**, scan for terms that appear in the glossary.
3. If a term is used in a way that conflicts with its glossary definition, interrupt immediately — before the next question:

```
Terminology check — your glossary defines '<term>' as: "<definition>"
But you seem to be using it to mean "<inferred meaning>".
Which is it? (a) The glossary definition (b) Your new meaning — I'll update the glossary (c) A different term entirely — tell me the right word
```

4. Do not proceed to the next branch until the terminology conflict is resolved.
5. If the user corrects the usage, note it and continue. If the glossary needs updating, update it (see Additional Behaviour 2).

---

## Additional Behaviour 2: Sharpen Fuzzy Language

When the user uses vague, overloaded, or context-dependent language, propose a precise canonical term before accepting the answer.

**Trigger words that typically need sharpening:** "it", "the thing", "that part", "handle", "manage", "process", "service", "module", "component", "data" (unqualified), "entity" (unqualified), "event" (unqualified).

When triggered:

```
'<fuzzy term>' is ambiguous here. Would you mean:
(a) <precise term A> — <1-sentence definition>
(b) <precise term B> — <1-sentence definition>
(c) Something else — tell me

I'll add whichever you choose to CONTEXT.md.
```

**CONTEXT.md format:**

```markdown
# Domain Glossary

## <Term>
**Definition:** <precise definition>
**Avoid:** <synonym(s) not to use>
**Related:** <other terms in this glossary>

---
```

**Rules for CONTEXT.md:**
- Create lazily at `CONTEXT.md` in the project root the first time a term is defined
- Devoid of implementation details — domain language only, not a spec
- Update inline as each term is resolved in the dialogue; do not batch updates
- Never add a term unless the engineer has accepted the definition
- Record "Avoid" synonyms so future readers know what not to use

---

## Additional Behaviour 3: Offer ADRs Sparingly

Offer to create an Architecture Decision Record only when ALL THREE conditions are true:

1. **Hard to reverse** — changing this decision later would require significant rework, migration, or coordination
2. **Surprising without context** — someone reading the code six months from now would wonder why this choice was made
3. **Result of a real trade-off** — the decision was made by explicitly rejecting one or more alternatives

If any condition is missing, do not offer an ADR. Instead, record the decision in the session summary table.

**When all three are met:**

```
This decision meets the bar for an ADR:
- Hard to reverse: <why>
- Surprising without context: <why>
- Real trade-off: <what was rejected and why>

Want me to create an ADR for this? (y/n)
```

**ADR format and location:**
- Check whether the project has an existing ADR format. If so, use it exactly.
- If not, create `docs/adr/` lazily and use this template:

```markdown
# ADR-NNN: <Title>

**Date:** YYYY-MM-DD
**Status:** Accepted

## Context
<What situation led to this decision>

## Decision
<What was decided>

## Alternatives Considered
<What was rejected and why>

## Consequences
<What becomes easier, what becomes harder>
```

- Number ADRs sequentially by scanning `docs/adr/` for existing files
- Do not create an ADR without the engineer's explicit "yes"

---

## Additional Behaviour 4: Cross-Reference With Code

When the user states a fact about how the system works, verify it.

1. Read the relevant code before accepting the claim
2. If the code agrees, proceed
3. If the code contradicts the user's claim, surface it immediately:

```
Code check — you said <claim>. I read <file>:<line> and it actually does <what the code does>.
Which is correct — is the code wrong, or is your understanding of the intent wrong?
```

4. If the user's stated intent is correct and the code is wrong, note it as a debt item in the session summary
5. If the code is correct and the user's understanding was off, update the user's mental model before continuing — the next questions may change based on this correction

---

## Conclusion

When all branches are resolved, produce:

```
## Decisions Made

| Branch | Decision | Reasoning |
|--------|----------|-----------|
| ...    | ...      | ...       |

## Terms Defined
<list of terms added or updated in CONTEXT.md this session>

## ADRs Created
<list of ADR files created, or "none">

## Code Contradictions Found
<any discrepancies between stated intent and actual code — flag as debt if unresolved>

## Deferred Decisions
<branches explicitly deferred and their revisit conditions>

## Open Risks
<branches accepted without full evidence>
```

Then offer next steps:
- "Ready to write an implementation plan?" → writing-plans skill
- "Want to go deeper on any branch?" → continue interrogating
- "Ready to create a spec?" → spec-driven-development skill

## Rules

1. All rules from `interrogate` apply
2. **Check the glossary before every question** — terminology conflicts block progression
3. **Sharpen fuzzy language before accepting answers** — do not record vague answers
4. **Update CONTEXT.md inline** — never batch; update as each term is accepted
5. **ADR bar is strict** — all three conditions must be met; partial matches do not qualify
6. **Read the code before accepting a factual claim** — verify, don't trust
7. **CONTEXT.md is domain language, not implementation** — no file paths, no function names, no data types
