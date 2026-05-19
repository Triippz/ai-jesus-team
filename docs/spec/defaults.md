# Project Defaults Catalog

**Purpose:** This file is the **only** place the spec-driven workflow is allowed to apply project-wide defaults. If a piece of information is required by the spec template and is not present in either (a) the engineer's input or (b) this catalog, the agent MUST mark it `[NEEDS CLARIFICATION: not in defaults catalog]` rather than choose a value.

**Why:** Per project policy, the engineer fills gaps, not the agent. Silent agent assumptions are forbidden. This catalog makes every default visible, version-controlled, and reviewable. Adding a new default is an explicit edit to this file.

**Created:** 2026-05-17
**Last amended:** 2026-05-17
**Maintainer:** Mark Tripoli

---

## How to Use

- The agent reads this file at the start of every Specify, Import, or Amend phase.
- Every default the agent applies MUST be cited by section + bullet ID (e.g., `D-AUTH-1`).
- Adding, modifying, or removing a default is an engineer-authored edit to this file. The agent MUST NOT extend the catalog itself.
- If a default applies in some contexts but not others, write the context as part of the bullet (e.g., "applies to public-facing APIs only").
- When the catalog and the engineer's input conflict, the engineer's input wins; the agent records the conflict in the spec under a `## Defaults Overridden` section.

---

## Authentication & Authorisation

N/A — dev-ai-utilities is a local dev tooling project with no authentication surface. Plugin consumers handle auth in their own project contexts.

## Storage & Persistence

- **D-STORE-1**: All persistent state files use JSON with a declared schema version field (e.g., `"schema": "plugin-install.v1"`). No YAML for state files.
- **D-STORE-2**: Install-state manifests are written to the target project's `.claude/` directory as `install-state.json`.
- **D-STORE-3**: Generated plugins are written to `generated/<plugin-name>/` in the dev-ai-utilities repo.
- **D-STORE-4**: User-modifiable files (CLAUDE.md, AGENTS.md) use `skip_if_exists` write strategy — created if absent, never overwritten.
- **D-STORE-5**: JSON config files (settings.json, hooks.json) use `deep_merge` write strategy — additive only, never clobber existing keys.

## Performance & Scale

- **D-PERF-1**: Hook execution time MUST be under 100ms per hook invocation. Hooks that exceed this SHOULD use the in-process `require()` optimization (established pattern: profile-gated hook runner with in-process require()).
- **D-PERF-2**: Plugin generation time MUST be under 5 seconds for a full plugin (all agents, skills, hooks, knowledge files) from a single profile.
- **D-PERF-3**: Doctor (conformance check) MUST complete in under 2 seconds for a full audit of an installed plugin.

## Observability

- **D-OBS-1**: All CLI commands (generate, doctor, repair, install) MUST support `--json` flag for machine-readable output suitable for CI integration.
- **D-OBS-2**: All CLI commands MUST support `--dry-run` flag that shows what would happen without modifying any files.
- **D-OBS-3**: Every file operation MUST report its status (`created`, `updated`, `skipped`, `protected`, `merged`, `conflicted`) in both human-readable and JSON output.

## Security

- **D-SEC-1**: Hook scripts MUST reject any script path that does not start with the plugin root directory (path traversal protection, established pattern: hook runner path validation).
- **D-SEC-2**: Generated plugins MUST NOT contain secrets, API keys, tokens, or machine-specific paths. The only allowed variable reference is `${PLUGIN_ROOT}` which is resolved at runtime.
- **D-SEC-3**: State file writes MUST use atomic write (write to `.tmp` then rename) to prevent corruption on crash (established pattern: atomic session state writes).

## Data Handling

- **D-DATA-1**: Template files use `.j2` extension (Jinja2 convention). Generated output files drop the `.j2` extension.
- **D-DATA-2**: Profile files use `.json` extension and validate against `schemas/profile.schema.json`.
- **D-DATA-3**: All JSON schemas use JSON Schema draft/2020-12 with `additionalProperties: false` as default.

## Testing

- **D-TEST-1**: Hook scripts are tested with bats-core (already established: 159 existing tests).
- **D-TEST-2**: Node.js scripts (generator, doctor, repair) are tested with hand-rolled `test(name, fn)` pattern with `process.exit(failed > 0 ? 1 : 0)` — no external test framework (established pattern: framework-free test runner).
- **D-TEST-3**: Schema validation tests run AJV against every committed structured file in CI.
- **D-TEST-4**: Determinism tests run generate twice with identical input and assert SHA-256 equality of output directory.
- **D-TEST-5**: Idempotency tests run each operation twice and assert zero filesystem diff between runs.
- **D-TEST-6**: Hook subprocess tests use `spawnSync` with injected env vars (`STATE_DIR`, `SESSION_ID`) for deterministic state control.

## Error Handling & Resilience

- **D-RES-1**: All file operations are atomic: write to temp file, validate, rename. Partial writes MUST NOT be visible to consumers.
- **D-RES-2**: Doctor/repair operate only on files recorded in install-state. They MUST NOT walk the filesystem blindly.
- **D-RES-3**: When a template rendering error occurs, the generator MUST fail the entire plan — no partial plugin generation.

## Internationalisation & Accessibility

N/A — dev-ai-utilities produces developer tooling, not user-facing interfaces.

## Project-Specific

- **D-PROJ-1**: The plugin factory uses a two-phase pattern: `resolveGeneratePlan()` (read-only, returns operation list) then `applyGeneratePlan()` (writes files). The plan phase MUST have zero side effects.
- **D-PROJ-2**: Hook profiles are `minimal`, `standard`, `strict`. Each hook declares its own profile membership. Profile selection is via `HOOK_PROFILE` env var.
- **D-PROJ-3**: Agent model tiers are `haiku`, `sonnet`, `opus`. CI validates agent frontmatter `model:` field against this allowlist.
- **D-PROJ-4**: Review agents produce a uniform JSON envelope: `{status: "pass|warn|fail|skip", issues: [{severity, confidence, file, line, message, suggestedFix}], summary}`.
- **D-PROJ-5**: Confidence values are `high` (auto-fixable), `medium` (fixable with confirmation), `none` (report-only, requires human judgment).
- **D-PROJ-6**: Template placeholders use `{{variable_name}}` syntax. Profile JSON provides the variable values. Variables not in the profile produce a generation error, not a silent empty string.
- **D-PROJ-7**: The GateGuard pattern blocks first file touch per session until the agent proves it investigated (lists importers, API surface, data schemas). Session state stored in a temp directory with 30-minute timeout.
- **D-PROJ-8**: Generated plugins target Claude Code as the primary consumer. Cursor rules and Codex mirrors are secondary targets generated from the same template.

---

## Removed / Deprecated Defaults

When a default is removed, move it here with a `**Reason:**` line. Do not delete — the historical record matters when reviewing old specs.

- *(empty)*

---

## Catalog Discipline

- The agent MUST cite the bullet ID (e.g., `D-STORE-1`) in `spec.md §Assumptions` whenever it applies a default from this catalog.
- The agent MUST NOT silently apply a default that is not in this catalog.
- When the catalog itself contains placeholders (`[Default …]` text), the agent MUST treat the placeholder as a `[NEEDS CLARIFICATION]` and flag the spec accordingly.
