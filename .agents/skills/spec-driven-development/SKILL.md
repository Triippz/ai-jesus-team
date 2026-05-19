---
name: spec-driven-development
description: "Multi-phase spec/PRD authoring with adversarial review and deterministic validation."
---

# Spec-Driven Development Skill

## Purpose

Author a granular, unambiguous spec/PRD that leaves zero room for interpretation, with built-in validation and adversarial review. Rigid multi-phase workflow.

## When to Use

Use when >=2 of these are true:
- The feature crosses >=2 plugins (e.g., frontend + backend; Rust SDK + Flutter app)
- The feature has >=3 distinct user stories or persona interactions
- The feature touches a contract or protocol other systems depend on
- A misinterpretation by the implementing agent would cost >30 minutes to repair
- Multiple agents will work on parts in parallel
- A non-engineer stakeholder must review before code is written

## The Iron Laws

1. **The engineer is in the hot seat.** Artifacts are reviewed, edited, and approved by the engineer.
2. **Specs are evidence-driven.** Vague adjectives without quantification fail the constitution.
3. **Tests precede implementation.** Tasks without test tasks for behaviour-changing work fail validation.
4. **CRITICAL findings hard-fail.** Implementation will not start while unresolved CRITICALs exist.
5. **Each P1 user story is independently shippable.**
6. **Deterministic by default.** Two runs against the same input produce byte-identical artifacts.

## Modes

- `/spec "<description>"` — author a new spec from scratch
- `/spec import <source>` — verbatim mapping from existing PRD, docs/plans/*.md, JIRA epic, or Confluence page
- `/spec amend <dir> <change>` — engineer-approved change-set; apply with `/spec amend --apply`

## Pipeline

constitution -> defaults -> specify -> clarify -> plan -> tasks -> challenge -> validate

Verdict gates handoff to `/execute-plan`: READY (all checks pass) or BLOCKED (failures listed).

## Key Agents

- **spec-challenger**: Adversarial substantive review with cited evidence
- **spec-validator**: Deterministic structural validation (coverage matrix, constitution gates, path validity)
