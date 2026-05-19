# Change Set: [FEATURE NAME]

**Spec dir:** `specs/<NNN>-<slug>/`
**Engineer's change description:**

> $ARGUMENTS (verbatim, copied here for the audit trail)

**Generated:** [YYYY-MM-DD HH:MM]
**Generator version:** spec-driven-development skill vX.Y.Z
**Source spec hash (before changes):** <sha256 of concatenated spec.md + plan.md + tasks.md + checklists/requirements.md>

> **Engineer-approval gate.** No artifact in `specs/<NNN>-<slug>/` is modified until the engineer marks each row's Disposition column with ACCEPTED or REJECTED. Rows with Disposition empty are NOT applied.

---

## Parsed Changes

The change description was parsed against the deterministic taxonomy:

| Verb pattern in description | Action |
|------------------------------|--------|
| `add`, `introduce`, `new`, `create` | ADD |
| `change`, `modify`, `update`, `tighten`, `loosen` | MODIFY |
| `remove`, `drop`, `deprecate`, `delete` | REMOVE |
| `rename`, `replace` | RENAME |
| `split`, `extract` | SPLIT |
| `merge`, `combine` | MERGE |

Phrases that don't match a verb pattern are reported as `[UNPARSED]` rows for engineer triage.

---

## Proposed Changes

Each row is a single proposed edit. Confidence is HIGH (exact ID match in source artifacts), MEDIUM (substring match against item titles), or LOW (best-guess from semantic content; engineer review essential).

| ID | Action | Target file | Target section | Match confidence | Proposed new content (verbatim, or [NEEDS CLARIFICATION]) | Disposition |
|----|--------|-------------|----------------|------------------|------------------------------------------------------------|-------------|
| C1 | MODIFY | spec.md | §FR-007 | HIGH (exact ID match) | Change "best-effort retry" to "deterministic retry with idempotency keys per request" | _(ACCEPTED — commit hash: ___ / REJECTED — rationale: ___)_ |
| C2 | ADD | spec.md | §User Scenarios & Testing | (n/a — new item) | New User Story: "As a tenant admin, I can audit-export the last 90 days of access logs"; Priority: [NEEDS CLARIFICATION: P1/P2/P3?]; Why-this-priority: [NEEDS CLARIFICATION]; Independent Test: [NEEDS CLARIFICATION] | |
| C3 | REMOVE | spec.md | §FR-014 | HIGH (exact ID match) | Remove FR-014 ("System MUST support FTP upload"). Note: FR-014 was referenced by US3 AS-2 and tasks.md T032; spec-validator will surface those references as broken links after this change is applied — engineer must also dispose of C4, C5. | |
| C4 | MODIFY | spec.md | §US3 AS-2 | DERIVED FROM C3 | Remove the Acceptance Scenario referencing FR-014. | |
| C5 | REMOVE | tasks.md | T032 | DERIVED FROM C3 | Remove task T032 (FTP upload handler). Subsequent task IDs are NOT renumbered (preserves audit trail and JIRA mapping). | |
| C6 | RENAME | plan.md | §1.1 Data Model: `Album` | MEDIUM (term match) | Rename entity `Album` → `PhotoCollection` throughout spec.md, plan.md, tasks.md (engineer must also update any external references — see UNRESOLVED REFERENCES below). | |
| C7 | [UNPARSED] | — | — | — | Engineer description fragment "make it work better with mobile" did not match any verb pattern. Engineer triage required: is this a new FR (ADD), a change to an existing FR (MODIFY which one?), or a non-functional addition (which §SC?). | |

---

## Unresolved References

When MODIFY/REMOVE/RENAME affects an item, the change-set lists every reference to the item across all artifacts. The engineer must dispose of each reference (cascade or break).

| Source change | Referenced from | Reference text | Cascade action |
|---------------|------------------|-----------------|-----------------|
| C3 (REMOVE FR-014) | spec.md §US3 AS-2 | "see FR-014 for upload modes" | C4 proposes the cascade; verify |
| C3 (REMOVE FR-014) | tasks.md T032 description | "Implement FTP upload per FR-014" | C5 proposes the cascade; verify |
| C6 (RENAME Album → PhotoCollection) | docs/research/2025-foo.md | external research doc references "Album entity" | NOT auto-cascaded (out of spec dir); engineer's responsibility |

---

## Validator Pre-Check

Before applying, the change-set generator runs `spec-validator` against the *proposed* artifacts (in memory; no file writes) and reports the predicted verdict shift:

| Metric | Before changes | After changes (predicted) |
|--------|------------------|----------------------------|
| Coverage matrix | 100% | 100% |
| Open CRITICAL findings | 0 | 0 |
| Open HIGH findings | 1 | 0 |
| Constitution gates passing | 8/9 | 9/9 |
| Verdict | READY | READY |

If applying the change-set would cause the verdict to regress (READY → BLOCKED), the change-set generator emits a warning at the top of this file and the engineer must explicitly opt in.

---

## Apply / Rollback

After the engineer marks dispositions:

1. Run `/spec amend --apply specs/<NNN>-<slug>/change-set.md`.
2. The applier reads only ACCEPTED rows and writes them in the order listed.
3. Each ACCEPTED row produces a single git commit with message `spec: amend <NNN>-<slug> C<NN> — <action> <target>`. (When the repo's commit hooks are active, the commit format is honoured; the applier does not skip hooks.)
4. After all ACCEPTED rows apply, the applier re-runs spec-validator and writes the resulting `validation-report.md`.
5. If validation fails, the applier does NOT roll back automatically; instead it leaves the partially-applied state and reports which rows broke validation. Rollback is the engineer's call (`git revert <hashes>`).

---

## Engineer Acknowledgement

I have reviewed every row above and either:
- marked it ACCEPTED and accept the proposed text and downstream cascade, OR
- marked it REJECTED with a rationale, OR
- marked it [UNPARSED] for follow-up edits to the change description.

Signed: _____________________ Date: _________
