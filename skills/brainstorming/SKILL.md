---
name: brainstorming
description: Triggered when exploring a new feature, design decision, or technical approach before implementation
---

# Brainstorming Skill

A collaborative dialogue skill for exploring design ideas before committing to implementation.

## Process

### 1. Gather Context
- Check project structure and type (examine config files, directory layout)
- Read relevant existing code, docs, and recent commits
- Understand the current state before proposing changes

### 2. Ask Questions (One at a Time)
- Ask clarifying questions ONE AT A TIME
- Prefer multiple-choice questions when possible (easier for the user to answer)
- Examples:
  - "Which approach do you prefer? (a) Event-driven (b) Request-response (c) Hybrid"
  - "What's the expected scale? (a) <100 users (b) 100-10K users (c) 10K+ users"
- Follow up based on answers, don't front-load all questions

### 3. Explore Approaches
- Present 2-3 viable approaches with trade-offs
- For each approach:
  - **What**: Brief description (2-3 sentences)
  - **Pros**: Key advantages
  - **Cons**: Key disadvantages
  - **Best when**: Conditions that make this the right choice
- Don't advocate for one approach — present them neutrally

### 4. Present Design in Sections
- Once an approach is selected, present the design in 200-300 word sections
- After each section, pause and ask: "Does this make sense? Any concerns?"
- Don't dump the entire design at once
- Validate understanding at each step before proceeding

### 5. Write Design Document
- Write the finalized design to `docs/plans/YYYY-MM-DD-<topic>-design.md`
- Include:
  - Problem statement
  - Chosen approach with rationale
  - Key design decisions
  - Trade-offs accepted
  - Open questions (if any)

### 6. Offer Next Steps
After writing the design document, offer to continue:
- "Ready to create a worktree for this work?" → git-worktrees skill
- "Ready to write an implementation plan?" → writing-plans skill
- "Need to explore more?" → continue brainstorming

## Guidelines

- This is a DIALOGUE, not a monologue — keep the user involved
- Shorter responses are better — don't overwhelm with information
- Be honest about trade-offs — every approach has downsides
- Challenge assumptions when appropriate, but respectfully
- If the user has a strong preference, explore it rather than overriding it
- Reference existing code patterns in the project when suggesting approaches
