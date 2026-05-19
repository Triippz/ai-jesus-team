---
name: writing-skills
description: "Meta-skill for authoring new skills using TDD principles."
---

# Writing Skills Skill

## Purpose

Meta-skill for authoring new skills using TDD principles.

**Skill Type: Flexible** — Adapt to the complexity of the skill being authored.

## Process

### 1. Define Purpose and Triggers
- What does this skill do?
- When should it be invoked?
- What inputs/outputs?
- Rigid or Flexible?

### 2. Write Test Cases
- Define success criteria before writing the skill
- Include edge cases and failure cases

### 3. Write the SKILL.md
- YAML frontmatter with name and description
- Process steps with clear instructions
- Rules and constraints

### 4. Create Supporting Files
- References, templates, prompts as needed
- Place alongside SKILL.md in the skill directory

### 5. Create Codex Mirror
- `.agents/skills/<name>/SKILL.md` (plain markdown, no YAML frontmatter)
- `.agents/skills/<name>/agents/openai.yaml`

### 6. Update Catalogs
- `skills/CLAUDE.md` and `skills/AGENTS.md`
- `skills/using-superpowers/SKILL.md` skill catalog
- `.agents/skills/AGENTS.md` and `.agents/skills/CLAUDE.md`
- Root CLAUDE.md if counts change

### 7. Verify
- Run `/verify` to ensure no test regressions
- Validate all JSON configs
