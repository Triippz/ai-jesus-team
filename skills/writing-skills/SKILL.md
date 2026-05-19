---
name: writing-skills
description: Triggered when authoring new skills using a TDD-based approach
---

# Writing Skills Skill

A meta-skill for authoring new skills. Uses TDD principles to create reliable, well-tested skills.

**Skill Type: Flexible** — Adapt the process to the complexity of the skill being authored.

## Process

### 1. Define Purpose and Triggers
- What does this skill do?
- When should it be invoked? (What triggers it?)
- What inputs does it need?
- What outputs does it produce?
- Is it Rigid (follow exactly) or Flexible (adapt to context)?

### 2. Write Test Cases
Before writing the skill, define what success looks like:
- Given [specific input/context], the skill should [produce specific output/behavior]
- Include edge cases: What happens with minimal input? Ambiguous input? No input?
- Include failure cases: What should the skill refuse to do?

### 3. Write the SKILL.md
Follow the standard format:

```markdown
---
name: <skill-name>
description: <when this skill is triggered — one line>
---

# <Skill Name> Skill

<Brief description of what this skill does.>

**Skill Type: Rigid/Flexible**

## Process

### Step 1: <Name>
- <Instructions>

### Step 2: <Name>
- <Instructions>

...

## Rules

1. <Rule 1>
2. <Rule 2>
```

### 4. Test with Sub-Agent
- Invoke the new skill using a sub-agent
- Provide it with test inputs from step 2
- Verify it produces expected behavior
- Check: Does the skill handle edge cases?
- Check: Does the skill refuse to do things it shouldn't?

### 5. Iterate
- If the skill doesn't produce correct behavior, revise and re-test
- Common issues:
  - Instructions too vague → agent improvises incorrectly
  - Instructions too rigid → agent can't handle valid variations
  - Missing steps → agent skips important work
  - Missing rules → agent does things it shouldn't

## SKILL.md Format Template

```markdown
---
name: <kebab-case-name>
description: <Triggered when ... — one sentence>
---

# <Human Readable Name> Skill

<1-2 sentence description of what this skill does and why.>

**Skill Type: Rigid/Flexible** — <brief justification>

## Process

### 1. <First Step Name>
- <Clear, actionable instruction>
- <Another instruction>

### 2. <Second Step Name>
- <Instructions>

## Rules

1. <Most important constraint>
2. <Second most important constraint>
```

## Guidelines

- Keep skills focused — one skill, one purpose
- Rigid skills need precise, unambiguous instructions
- Flexible skills need clear principles and guidelines
- Include examples when instructions could be misinterpreted
- Test with realistic scenarios, not toy examples
