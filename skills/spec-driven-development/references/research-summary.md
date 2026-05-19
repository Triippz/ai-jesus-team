# Research summary — pointer

The research synthesis behind this skill lives at:

- `docs/research/spec-driven-development-research.md` — faithful collation of the seven primary sources, with citations.
- `docs/research/spec-driven-development-design.md` — design decisions that translate the research into this skill's structure.

The seven primary sources, in citation order:

1. Augment Code — *What Is Spec-Driven Development?* — `https://www.augmentcode.com/guides/what-is-spec-driven-development`
2. GitHub — *github/spec-kit* — `https://github.com/github/spec-kit`
3. Birgitta Böckeler / Martin Fowler — *Understanding Spec-Driven-Development* — `https://martinfowler.com/articles/exploring-gen-ai/sdd-3-tools.html`
4. Heeki Park — *Using Spec-Driven Development with Claude Code* — `https://heeki.medium.com/using-spec-driven-development-with-claude-code-4a1ebe5d9f29`
5. Rich Naszcyniec / Red Hat Developers — *How Spec-Driven Development Improves AI Coding Quality* — `https://developers.redhat.com/articles/2025/10/22/how-spec-driven-development-improves-ai-coding-quality`
6. Deepak Babu Piskala — *Spec-Driven Development: From Code to Contract in the Age of AI Coding Assistants* — arXiv:2602.00180
7. Zencoder — *A Practical Guide to Spec-Driven Development* — `https://docs.zencoder.ai/user-guides/tutorials/spec-driven-development-guide` (and the supporting blog posts at zencoder.ai/blog)

## Patterns adopted

| Pattern | Strongest source |
|---------|------------------|
| Project constitution with non-negotiable articles + gates | spec-kit |
| User stories prioritised P1/P2/P3 with Independent Test + Given/When/Then | spec-kit |
| Tasks organised by user story with `[P]` parallel markers + concrete file paths | spec-kit |
| Test-first ordering enforced by constitution Article I | spec-kit + Augment + Zencoder |
| `[NEEDS CLARIFICATION]` markers with ≤3 budget | spec-kit + Augment |
| Bounded ≤5-question taxonomy-driven clarification | spec-kit |
| "Unit tests for English" — checklists test requirement quality, not behaviour | spec-kit (verbatim) |
| Cross-artifact consistency analysis (read-only) | spec-kit + Augment |
| Adversarial review by separate agent with opposing goals | Augment + user requirement |
| Spec-anchored discipline (spec is updated when implementation diverges; code is not regenerated from spec) | Augment + Heeki |
| Skip-SDD decision criteria | Augment + Fowler |

## Patterns rejected

- Spec-as-source (regenerate code from spec on every change) — too brittle given LLM nondeterminism (Fowler).
- Heavyweight 8+ files per spec — review burden complaint (Fowler). We default to 4 files.
- Aspirational productivity claims ("95% first-try accuracy") — no empirical backing (Red Hat / spec-kit).
