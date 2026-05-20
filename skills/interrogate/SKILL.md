---
name: interrogate
description: Adversarial interview skill for stress-testing plans, designs, and architectural decisions before they are written down
---

# Interrogate Skill

An adversarial interview for stress-testing plans, designs, and architectural decisions through structured dialogue. This skill walks every branch of the decision tree, one question at a time, before any plan is committed to writing.

**Skill Type: Flexible** — Adapt the question sequence to the shape of the design space, but never skip unresolved branches.

This is NOT the spec-challenger (which does formal adversarial review against a written spec). This is an interactive dialogue for working through a plan BEFORE it exists on paper. If a written spec already exists, use `/spec challenge` instead.

## When to Invoke

- Before writing an implementation plan
- Before committing to an architectural decision
- Before starting a feature that has unstated assumptions
- When a plan "feels right" but hasn't been pressure-tested
- When the user says "I'm thinking about..." or "my plan is..."

## Process

### Step 1: Map the Decision Space

Before asking a single question, build a mental map of the decision tree:

1. Read the user's plan or description carefully
2. Explore the codebase for relevant context — read existing code, config, docs, and recent commits rather than asking about things you can discover
3. Identify every branch: explicit choices, implicit assumptions, undeclared dependencies, and reversibility constraints
4. Categorise branches:
   - **Hard to reverse** — architecture, data model, public API surface, protocol choices
   - **Medium reversibility** — library selection, module boundaries, naming
   - **Easy to reverse** — implementation details, internal naming, formatting

Start with hard-to-reverse branches. Work outward.

### Step 2: Ask One Question at a Time

For each branch, ask exactly one question. Never bundle questions.

Format every question as:

```
[Branch: <category>]

<The question>

Recommended: <your recommended answer with 1-2 sentences of reasoning>

(Or tell me if this branch doesn't apply.)
```

Wait for the user's response before continuing. Do not proceed to the next branch until the current one is resolved.

**Challenge answers that are unsupported.** If the user says "it'll be fine" or "that's not a concern," ask what evidence supports that. Accept the answer only when it is backed by reasoning, data, or an explicit acceptance of risk.

**Skip questions you can answer yourself.** If a branch can be resolved by reading the codebase, read the codebase and state what you found rather than asking.

### Step 3: Track Branch Status

Maintain an internal map of branches and their status. After each answer, update your map:

- **Resolved** — answer accepted, decision recorded
- **Open** — not yet asked
- **Deferred** — user explicitly postponed; note the condition for revisiting
- **Blocked** — answer reveals a new sub-branch; add it to the queue

When a new sub-branch emerges from an answer, add it to the open queue before proceeding. Do not lose branches.

### Step 4: Surface Contradictions

When the user's answer conflicts with earlier answers or with what the code shows, surface it immediately:

```
Hold on — earlier you said <X>, but this answer implies <Y>. These conflict. Which do you want to stand?
```

Do not silently accept contradictions.

### Step 5: Conclude

When all branches are resolved, produce a structured summary:

```
## Decisions Made

| Branch | Decision | Reasoning |
|--------|----------|-----------|
| ...    | ...      | ...       |

## Deferred Decisions
<list any branches the user explicitly deferred and their revisit conditions>

## Open Risks
<any branches the user accepted without full evidence — flag these explicitly>
```

Then offer next steps:
- "Ready to write an implementation plan?" → writing-plans skill
- "Want to go deeper on any branch?" → continue interrogating
- "Ready to create a spec?" → spec-driven-development skill

## Rules

1. **One question at a time** — never bundle, never front-load
2. **Recommend before waiting** — always provide your recommended answer with reasoning
3. **Explore before asking** — if the codebase can answer it, read the code
4. **Challenge unsupported answers** — "that's fine" is not an answer
5. **Track every branch** — nothing falls through the cracks
6. **Surface contradictions immediately** — don't accumulate inconsistencies
7. **Hard-to-reverse branches first** — sequence by reversibility cost, not convenience
