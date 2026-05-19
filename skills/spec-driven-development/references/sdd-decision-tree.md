# When to use `/spec` vs. existing flows

This reference helps an engineer decide whether SDD is appropriate for the work in front of them. It is referenced from `SKILL.md`.

## Use `/spec` when

- The feature crosses ≥2 plugins (e.g., frontend + backend; Rust SDK + Flutter app).
- The feature has ≥3 distinct user stories or persona interactions.
- The feature touches a contract/protocol that other systems depend on.
- The feature has non-trivial non-functional requirements (latency, durability, security, compliance).
- Multiple agents will work on parts of the feature in parallel.
- A misinterpretation by the implementing agent would cost more than 30 minutes to repair.
- The feature must be reviewed by a non-engineer stakeholder (product, security, compliance) before code is written.

If two or more of these are true, `/spec` is almost certainly the right entry point.

## Skip `/spec` and use `/brainstorm` → `/write-plan` → `/tdd` → `/execute-plan` when

(adopted verbatim from Augment Code's SDD guide)

- Work is exploratory or experimental.
- A single prompt can produce usable output.
- Output can be reviewed in under five minutes.
- Change is mechanical or low-risk (rename, formatting, dependency bump).
- Prototype is meant to be thrown away.
- Bug fix where the spec already exists implicitly in the failing test.

## The decision trigger

> "If I'd be annoyed to have the agent interpret requirements differently than I meant, I write the spec. If I could fix the output in a quick follow-up prompt, I skip the spec and prompt directly."
> — Augment Code, *What Is Spec-Driven Development?* (`https://www.augmentcode.com/guides/what-is-spec-driven-development`)

## Brownfield (existing-system change) guidance

Two deterministic entry points cover brownfield work:

- **`/spec import <source>`** — when the existing system's prior planning artifact (a written PRD, a `docs/plans/*.md`, a JIRA epic, a Confluence page) is the starting point. The importer copies the source into the spec template verbatim per `templates/import-mapping.md` and flags everything not mapped. The engineer then runs `/spec specify --use-defaults` (apply catalog defaults), `/spec clarify` (batch through `[NEEDS CLARIFICATION]` markers), then the rest of the gauntlet.

- **`/spec amend <existing-spec-dir> <change-description>`** — when the existing system already has an SDD spec and the engineer wants to evolve it. The amender produces `change-set.md` listing every proposed edit (file, section, action, new content, confidence). The engineer marks each row ACCEPTED or REJECTED. `/spec amend --apply <change-set.md>` writes only the ACCEPTED rows, one git commit per row, then re-runs the validator.

Neither command modifies code. Both cooperate with the existing constitution and defaults catalog.

For a small bug fix in existing code, `/debug` is still the right entry point. SDD is overkill for one-line fixes.

## Cost of SDD

The full pipeline (Specify → Clarify → Plan → Tasks → Challenge → Validate) takes more time than `/brainstorm` → `/write-plan`. The benefit shows up later: in fewer review iterations, fewer agent misinterpretations, less rework when an agent inherits the spec from another agent or session, and a permanent artifact the team can revisit when behaviour drifts in production.

If the work is small and the engineer is the only reviewer, the cost will not pay back. Use the existing flow.
