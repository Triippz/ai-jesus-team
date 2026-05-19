# Import Phase — Deterministic Mapping Protocol

This prompt is loaded by the spec-driven-development skill when the engineer invokes `/spec import <source>`.

## Mandate

You are a mechanical importer, not an interpreter. You copy text from the source verbatim into the matching target sections per `templates/import-mapping.md`. You do not paraphrase. You do not merge similar items. You do not invent IDs, priorities, Independent Tests, defaults, or quality judgements. You flag anything you cannot confidently map.

Two runs against the same source content hash MUST produce byte-identical artifacts (modulo the timestamp line in `imported/source-manifest.md`).

## Inputs

- `<source>`: path to a markdown file, directory of markdown files, JIRA epic key, or Confluence URL.
- (optional) `--reconcile`: if `imported/source-manifest.md` exists, only re-apply the diff between the recorded source content hash and the current source.

## Pre-flight

1. Resolve `<source>`:
   - File path → read directly. Compute SHA-256 of the file bytes.
   - Directory → list all `*.md` files, sorted alphabetically by relative path. Compute SHA-256 of the concatenation in that order.
   - JIRA key (`^[A-Z]+-\d+$`) → require Atlassian MCP; fetch the epic and all child issues. Compute SHA-256 of a deterministic JSON serialisation of `{epic_summary, epic_description, [{key, summary, description, issuetype, parent} for each child sorted by key]}`.
   - Confluence URL → require Atlassian MCP; fetch page content; convert to markdown; compute SHA-256 of the markdown.
2. Generate the spec slug:
   - From a markdown file: kebab-case the file's H1 title (or the filename minus extension).
   - From a directory: kebab-case the directory's basename.
   - From a JIRA epic: kebab-case the epic summary; truncate to ≤40 chars.
   - From Confluence: kebab-case the page title; truncate to ≤40 chars.
3. Compute `<NNN>` as the next sequential feature number under `specs/`.
4. Create `specs/<NNN>-<slug>/`, `specs/<NNN>-<slug>/imported/`, `specs/<NNN>-<slug>/imported/source-original/`, and `specs/<NNN>-<slug>/checklists/`.
5. Copy the source verbatim into `imported/source-original/` (the audit copy).

## Mapping pass

Apply the heading mapping in `templates/import-mapping.md` to every level-2 heading in the source (and level-3 if the level-2 was generic like "Details"). For each heading:

1. Extract the heading text.
2. Match against the regex table (case-insensitive, anchored at the start of the heading text).
3. Copy the section's content **verbatim** into the matched target section, prefixed with a single line: `<!-- Imported from <source>:LINE — <original heading> -->`.
4. If a section maps to a structured target (FR-NNN, SC-NNN, US, Tasks):
   - **FR**: each top-level bullet or numbered item becomes one FR. Preserve source IDs if present (e.g., `REQ-12` → keep as-is or re-tag as `FR-012` per source order). The body of the bullet is the FR text, copied verbatim.
   - **SC**: same rule with `SC-NNN`.
   - **User Story**: each top-level item becomes one User Story. Sub-items containing `given`/`when`/`then` (case-insensitive) or `should`/`must` become Acceptance Scenarios; everything else stays under the story bullet. Priority is omitted (engineer assigns later). Independent Test is set to `[NEEDS CLARIFICATION: imported from <source>; engineer must define]`.
   - **Tasks**: each line becomes one task with a sequential `T###` ID. Lines starting `- [ ]` or `- [x]` or numbered (`1.`) are mapped 1:1. Un-prefixed bullets are imported but flagged `[NEEDS REVIEW: source line was a bullet without a checkbox/number; may not be a task]`.
5. If the heading does not match any rule, copy the section to `imported/source-excerpts.md` under a `## [UNMAPPED] <original heading>` block.

## Post-mapping

1. Generate `specs/<NNN>-<slug>/checklists/requirements.md` from `templates/checklist-template.md`. All items unchecked.
2. Write `specs/<NNN>-<slug>/imported/source-manifest.md` with:
   - Source path/URL.
   - Source content SHA-256.
   - Importer version.
   - The full mapping table (source heading → source line → target → bytes copied).
   - SHA-256 of each produced artifact (`spec.md`, `plan.md`, `tasks.md`, `checklists/requirements.md`).
3. If a target section ended up empty (no source heading mapped to it), write a single line in the target: `[NEEDS CLARIFICATION: not present in source <source>]`.

## Hard rules

- **Verbatim only.** If you find yourself paraphrasing, stop and copy the source bytes literally.
- **No defaults during import.** Do not consult `docs/spec/defaults.md` during import. Defaults are applied in the follow-up `/spec specify --use-defaults` pass.
- **No priority invention.** All imported user stories are unprioritised.
- **No Independent Test invention.** All imported user stories get `[NEEDS CLARIFICATION: imported …]` for Independent Test.
- **No silent merging.** If two source headings map to the same target, append both verbatim with their `<!-- Imported from … -->` provenance comments. Do not deduplicate.
- **Empty source heading.** If a heading exists in the source with no body, write `<!-- Imported empty section: <heading> -->` to the target — do not synthesise content.
- **Missing source.** If the source path/URL doesn't resolve, abort and report; do not partial-import.
- **Reconcile mode.** Re-run with `--reconcile` only re-applies the source-side diff. Sections in `imported/source-manifest.md` whose source bytes haven't changed are NOT touched in the target. Sections that changed in the source produce a `imported/reconcile-diff.md` listing the proposed re-imports; engineer approves before they're applied.

## Output report

After import completes, print to the engineer:

```
Imported <source> into specs/<NNN>-<slug>/

Manifest: specs/<NNN>-<slug>/imported/source-manifest.md
Source content SHA-256: <hash>

Mapped:
  spec.md      — N user stories (all unprioritised), M FRs, K SCs, J edge cases
  plan.md      — <subsections populated, e.g., §Summary, §1.1, §1.2, §1.3>
  tasks.md     — T tasks (S marked [NEEDS REVIEW])

Unmapped (engineer triage):
  imported/source-excerpts.md — U sections

Pending engineer action:
  - Assign priorities to imported user stories (P1/P2/P3) — none assigned during import.
  - Define Independent Tests for each user story — all currently [NEEDS CLARIFICATION].
  - Triage `imported/source-excerpts.md` — decide what (if anything) belongs in the spec.

Recommended next:
  /spec specify --use-defaults     # apply defaults from docs/spec/defaults.md where applicable
  /spec clarify                    # resolve [NEEDS CLARIFICATION] markers (no 3-marker budget after import — work through them in batches of 5)
  /spec challenge                  # adversarial review
  /spec validate                   # gate to /execute-plan
```

## Failure modes

- Source format unrecognised → abort; do not partial-import; report unsupported format.
- Source contains no recognisable headings → import everything to `imported/source-excerpts.md` flagged `[UNMAPPED]`; spec.md / plan.md / tasks.md are created with `[NEEDS CLARIFICATION: source contained no recognisable headings]` placeholders.
- JIRA / Confluence MCP unavailable → abort with the standard "MCP not connected" message; do not silently fall back to web fetch.
- Reconcile invoked but no manifest exists → treat as fresh import; warn the engineer.
