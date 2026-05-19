# ACCEPTED-RISKS Suppression System

This document defines the schema and behavioral rules for the `ACCEPTED-RISKS.md` suppression file. Review agents and the orchestrator use this reference to validate suppression entries and apply them correctly.

---

## File Location

`ACCEPTED-RISKS.md` must be placed in the project root directory — the same directory that contains the project's primary configuration file (package.json, pyproject.toml, go.mod, etc.). The orchestrator does not search subdirectories.

---

## Entry Schema

Each suppression entry is expressed as a YAML frontmatter block within a Markdown section. The file may contain multiple entries. All fields listed as required must be present; a missing required field causes a schema-invalid hard failure for that entry (see enforcement below).

### Required Fields

| Field | Type | Description |
|---|---|---|
| `rule_id` | string | The identifier of the rule being suppressed. Must match the rule_id emitted by the agent or SAST tool. |
| `file_pattern` | string | A glob pattern matching the file or files to which suppression applies. |
| `rationale` | string | Explanation of why the finding is suppressed. Minimum 50 characters. |
| `accepted_by` | string | GitHub handle or email of the person who accepted this risk. |
| `accepted_date` | ISO date string | Date the risk was accepted (YYYY-MM-DD format). |

### Optional Fields

| Field | Type | Description |
|---|---|---|
| `expires` | ISO date string | Date on which the suppression becomes inert (YYYY-MM-DD format). Omit if the suppression has no planned expiry. |
| `broad` | boolean | Set to `true` when the `file_pattern` matches more than one file. Required when the pattern is broad (see below). |

### Example Entry

```markdown
## suppress-hardcoded-secret-in-fixtures

```yaml
rule_id: hardcoded-secret
file_pattern: "test/fixtures/**"
rationale: >
  Hardcoded test fixture credentials used only in spec files; not loaded in
  production builds. Verified by webpack.config.prod.js which excludes the
  test/ directory from all production bundles. Credentials are synthetic and
  not valid in any environment.
accepted_by: "@eng-lead"
accepted_date: "2025-11-01"
expires: "2026-11-01"
broad: true
```
```

---

## Rationale Quality Rules

The rationale field must explain **why** the finding is a false positive or an accepted trade-off in the specific context. A rationale that merely labels the finding without reasoning is not acceptable.

**Not acceptable**: "Known false positive", "Not applicable here", "Safe in this context", "Tool error"

**Acceptable rationale must answer**: Why is this particular instance not a real risk? What evidence (file, config, build step, deployment constraint) supports that conclusion?

Agents must flag entries with rationale shorter than 50 characters or with rationale matching common dismissal phrases as schema violations. When flagged, the entry is treated as invalid and the finding is not suppressed.

---

## Detection and Suppression Order

Suppression is post-detection, not pre-detection.

Agents always run a full scan. After the scan completes, the orchestrator loads `ACCEPTED-RISKS.md`, validates all entries, and then filters the finding set. Findings matched by a valid, non-expired suppression rule are moved to the "Suppressed by ACCEPTED-RISKS" section of the report. They are never silently dropped.

This ordering ensures:
1. The scan is not altered by suppression rules — every finding is captured
2. Suppressed findings remain visible to reviewers who can audit whether the rationale still holds
3. Schema errors in `ACCEPTED-RISKS.md` are caught before filtering, not discovered later when a finding is missing

---

## Suppressed Findings in Reports

Suppressed findings are always listed in the report under the "Suppressed by ACCEPTED-RISKS" section. The listing includes:
- The rule_id
- The matched file and line
- The original message
- The accepted_by field
- The expiry date if present

Suppressed findings do not contribute to fail counts, warn counts, or the health score calculation.

---

## Expiry Enforcement

When an entry's `expires` field contains a date that is earlier than the current run date, the entry is inert. An inert rule does not suppress any finding. Additionally, the orchestrator emits a WARN for each inert rule, identifying the rule_id and the date it expired.

Expired rules do not cause a hard failure, but the WARN is included in the report's warn count and factors into the health score.

---

## Schema-Invalid Rule Enforcement

An entry is schema-invalid when any of the following conditions are true:
- A required field is missing
- `accepted_date` or `expires` is not a valid ISO date
- `rationale` is shorter than 50 characters
- `rationale` matches a known dismissal phrase
- `file_pattern` is syntactically invalid as a glob

Schema-invalid entries cause a hard failure for the run. The orchestrator does not silently skip invalid entries or fall back to treating them as inert. The run reports the schema error and exits before producing agent results.

Rationale: Silently skipping invalid rules would cause findings to appear unsuppressed without explaining why, creating confusion. Hard failure forces the author to fix the entry before the suppression takes effect.

---

## Broad Rule Handling

A rule is considered broad when its `file_pattern` matches more than one file in the repository at the time of the run. Broad rules require the `broad: true` flag to be explicitly set.

If a rule's pattern matches multiple files and `broad: true` is not present, the entry is treated as schema-invalid (hard failure).

Broad rules that are valid are flagged in the report every run with a note for auditor attention. The flag does not block the run or change the health score, but it ensures that broad suppressions are never silently forgotten.

---

## Match Precedence

When a finding could be matched by more than one suppression rule, the first matching rule in declaration order wins. Subsequent rules for the same finding are not evaluated.

This first-match-wins behavior is intentional for traceability: the report entry for the suppressed finding references the specific rule_id that matched, making it clear which suppression decision was applied.
