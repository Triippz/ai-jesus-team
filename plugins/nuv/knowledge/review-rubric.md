# Review Rubric — Health Scoring and Orchestration Rules

This document defines how the orchestrator aggregates review agent results into a health score and governs the review-fix loop.

---

## Health Score Definitions

Health scores are computed after all agents complete and all escalation rules are applied.

| Score | Condition |
|---|---|
| HEALTHY | 0 fail AND ≤2 warn across all agents |
| NEEDS_ATTENTION | 1–2 fail OR 3+ warn across all agents |
| CRITICAL | 3+ fail OR any security-review fail |

A project scores HEALTHY only when both conditions hold simultaneously. A single fail combined with 3+ warn scores NEEDS_ATTENTION, not CRITICAL, unless escalation rules apply (see below).

---

## Escalation Rules

Escalation rules override the base health score calculation and can promote a result directly to CRITICAL.

### Security Failures — Always Escalate

Any fail emitted by the `security-review` agent escalates the overall health score to CRITICAL regardless of the total fail count from other agents. A single security fail is sufficient.

Rationale: Security findings represent exploitable risk that cannot be treated as equivalent to style or architecture issues.

### Architecture Failures — Escalate at 2+

Fails emitted by `arch-review` or `domain-review` escalate to CRITICAL when the combined count reaches 2 or more. A single architecture fail alone does not escalate.

Rationale: One architecture deviation may be an intentional exception; two or more signals systemic design breakdown.

---

## Confidence–Actionability Matrix

Each finding carries a confidence level that determines what action the orchestrator is permitted to take without user intervention.

| Confidence | Action |
|---|---|
| high | Auto-fixable — apply the fix without asking. Stage the change and note it in the report. |
| medium | Fixable with confirmation — present the diff, ask the user to approve before applying. |
| none | Report only — describe the issue and recommendation. Make no fix attempt. |

Agents must emit one of these three confidence values on every finding. The orchestrator rejects findings with missing or unrecognized confidence values as schema errors.

---

## Plan Review Warning Threshold

When the orchestrator is evaluating a plan (not code), a count of 3 or more warnings across all reviewing agents triggers a `needs-revision` status on the plan, blocking progression to execution. The plan author must address the warnings and resubmit before the plan is marked ready.

---

## Review-Fix Loop Rules

The orchestrator runs reviews iteratively when auto-fixable or confirmed-fix findings are present. The following rules govern loop behavior.

### Maximum Iterations

The loop runs at most 5 iterations. If fixable findings remain after iteration 5, the loop exits and the remaining findings are reported as unresolved. The final health score reflects the post-loop state.

### Convergence Detection

Before starting each iteration, the orchestrator compares the current finding set to the previous iteration's finding set. If the same issues persist (identical agent, rule_id, file, and line) across two consecutive iterations, convergence is declared and the loop exits early. Continuing to apply the same fix repeatedly without improvement is treated as a loop failure condition, not a success.

### Partial Re-Run Strategy

On each iteration after the first, only agents that emitted at least one fail or warn in the previous iteration are re-run. Agents that reported all-pass results are skipped. This reduces latency and token cost for large codebases where only a subset of checks are affected by a fix.

---

## Agent Tier and Weight

The orchestrator treats all agent results as equal for scoring purposes. Tier (haiku / sonnet / opus) affects model selection and cost, not whether a finding counts toward the health score. A warn from a haiku-tier agent carries the same weight as a warn from an opus-tier agent.
