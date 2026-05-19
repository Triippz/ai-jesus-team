# Code Review Report Format

This document defines the standardized output structure for the `/code-review` command. All review agents emit structured findings; the orchestrator assembles them into this report format.

---

## Pre-Flight Gates

Pre-flight gates run before agents are invoked. A gate failure does not block agents from running but is surfaced prominently at the top of the report.

| Gate | Tool | Status |
|---|---|---|
| Lint | eslint / ruff / golangci-lint | ✅ / ❌ / ➖ |
| Type Check | tsc / mypy / go vet | ✅ / ❌ / ➖ |
| Secret Scan | gitleaks / trufflehog | ✅ / ❌ / ➖ |
| SAST | semgrep | ✅ / ❌ / ➖ |

Icons: ✅ passed, ❌ failed, ➖ not configured / skipped.

---

## Agent Results Table

| Agent | Model Tier | Status | Issues |
|---|---|---|---|
| arch-review | sonnet | pass / warn / fail / skip | 0 |
| security-review | opus | pass / warn / fail / skip | 0 |
| domain-review | sonnet | pass / warn / fail / skip | 0 |
| test-review | haiku | pass / warn / fail / skip | 0 |
| style-review | haiku | pass / warn / fail / skip | 0 |

Status values: `pass` (no issues), `warn` (non-blocking issues), `fail` (blocking issues), `skip` (agent not applicable or disabled).

---

## Health Score

```
HEALTH: [HEALTHY | NEEDS_ATTENTION | CRITICAL]
```

The badge reflects the final health score after all escalation rules have been applied. See `review-rubric.md` for scoring logic.

---

## Findings

Findings are grouped by severity in descending order: error, then warning, then suggestion. Within each severity group, findings are sorted by agent name then by file path.

### Error

Each finding follows this structure:

```
[agent-name] path/to/file.ts:42
Message: <short description of the issue>
Fix: <suggested remediation>
Confidence: high | medium | none
```

### Warning

Same structure as Error findings.

### Suggestion

Same structure as Error findings. Suggestions never contribute to fail counts and do not affect the health score.

---

## Recommendations

This section synthesizes the top 3 priorities across all agent findings. The orchestrator selects priorities by combining severity, confidence, and cross-agent recurrence (the same root cause flagged by multiple agents ranks higher).

```
1. [Priority title] — [one-sentence rationale]
2. [Priority title] — [one-sentence rationale]
3. [Priority title] — [one-sentence rationale]
```

---

## Suppressed by ACCEPTED-RISKS

Findings matched by a valid, non-expired rule in `ACCEPTED-RISKS.md` are listed here. They are never silently dropped. Suppressed findings do not contribute to fail or warn counts and do not affect the health score.

| Rule ID | File | Message | Accepted By | Expires |
|---|---|---|---|---|
| rule-id | path/to/file.ts:10 | Short description | @engineer | 2026-12-31 |

If no findings are suppressed, this section reads: "No findings suppressed in this run."

---

## Statistics

```
Total issues:            <n>
  Auto-fixable:          <n>  (high confidence — applied without confirmation)
  Needs confirmation:    <n>  (medium confidence — diff presented, awaiting approval)
  Report only:           <n>  (none confidence — no fix attempted)
Suppressed:              <n>
```

Statistics reflect the post-suppression, post-loop state. Auto-fixable counts include fixes already applied during the review-fix loop.
