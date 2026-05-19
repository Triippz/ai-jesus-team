# Plugin Template Factory — Getting Started

This guide walks a first-time user through generating a tailored Claude Code plugin, installing it into a project, verifying it, and keeping it up to date.

---

## Prerequisites

- **Node.js 20+** — `node --version` to check
- **npm** — comes with Node.js
- This repository cloned locally

---

## 1. Install Dependencies

From the repo root:

```bash
npm install
```

No global installs required. All tooling runs via `node scripts/`.

---

## 2. Create a Profile

A profile is a JSON file that describes your project's tech stack. Profiles live in `profiles/`. Copy an existing one as a starting point:

```bash
cp profiles/nuv.json profiles/my-project.json
```

Edit the required fields to match your project. See [profile-guide.md](./profile-guide.md) for the full field reference and per-language defaults.

**Minimum viable profile:**

```json
{
  "name": "my-project",
  "stack": {
    "language": "typescript",
    "framework": "express"
  },
  "orm": "prisma",
  "test_framework": "vitest",
  "concurrency_model": "node-async",
  "ci_platform": "github"
}
```

Validate the profile before generating:

```bash
node scripts/validate-schemas.js
```

If validation passes, you will see no errors and exit code 0.

---

## 3. Generate the Plugin

```bash
node scripts/generate.js --profile profiles/my-project.json
```

This reads your profile, renders all template files, and writes the plugin to `generated/my-project-superpowers/`.

**Preview without writing:**

```bash
node scripts/generate.js --profile profiles/my-project.json --dry-run
```

**Machine-readable output:**

```bash
node scripts/generate.js --profile profiles/my-project.json --json
```

**Custom output directory:**

```bash
node scripts/generate.js --profile profiles/my-project.json --output /tmp/my-plugin
```

A successful run prints each file written and a summary like:

```
Results:
  [created] CLAUDE.md
  [created] AGENTS.md
  [created] plugin.json
  [created] agents/review/complexity-review.md
  ...

Summary:
  created: 21

Output: generated/my-project-superpowers
```

---

## 4. Inspect the Output

The generated plugin is a self-contained directory:

```
generated/my-project-superpowers/
├── CLAUDE.md                   # Project instructions for Claude Code
├── AGENTS.md                   # Codex agent declarations
├── plugin.json                 # Claude Code plugin manifest
├── agents/
│   ├── review/                 # 10 specialist review agents, stack-tailored
│   └── team/
│       └── orchestrator.md     # Dispatches agents, aggregates results
├── hooks/                      # Safety hooks + gateguard
├── knowledge/                  # OWASP reference, review rubric, templates
└── prompts/                    # 4 plan review personas
```

Open any agent file to confirm it references your language and framework. For example, `agents/review/concurrency-review.md` should mention your declared `concurrency_model`.

---

## 5. Install into a Project

Point the installer at the generated plugin and your project repo:

```bash
node scripts/install-plugin.js \
  --plugin generated/my-project-superpowers \
  --target /path/to/my-project
```

**Preview first:**

```bash
node scripts/install-plugin.js \
  --plugin generated/my-project-superpowers \
  --target /path/to/my-project \
  --dry-run
```

**What the installer does:**

| File | Destination | Strategy |
|---|---|---|
| `CLAUDE.md` | `<target>/CLAUDE.md` | `skip_if_exists` — never overwrites existing |
| `AGENTS.md` | `<target>/AGENTS.md` | `skip_if_exists` — never overwrites existing |
| `plugin.json` | `<target>/.claude/plugin.json` | `overwrite` |
| `hooks/hooks.json` | `<target>/.claude/settings.json` | `deep_merge` — adds hooks without removing existing |
| Everything else | `<target>/.claude/<path>` | `overwrite` |

After installation, `.claude/install-state.json` is written to the target, recording every file and its hash. This enables drift detection.

> If the project already has a `CLAUDE.md`, it will not be touched. The install reports it as `protected`.

---

## 6. Verify the Installation

Run the doctor to confirm every installed file matches the expected state:

```bash
node scripts/doctor.js --target /path/to/my-project
```

Expected output for a fresh install:

```
Conformance report — 2026-05-19T...
Files checked: 21

  ✓ .claude/plugin.json
  ✓ .claude/agents/review/complexity-review.md
  ...
  ⊙ CLAUDE.md

--- Summary ---
  ok:        20
  protected: 1

Status: OK
```

`ok` means the file matches its recorded hash. `protected` means the file uses `skip_if_exists` and exists on disk — this is the expected state for `CLAUDE.md` and `AGENTS.md`.

**Quick mode** (checks only critical files + first 3 agents):

```bash
node scripts/doctor.js --target /path/to/my-project --quick
```

---

## 7. Use the Plugin

Open Claude Code in the project directory. The plugin loads automatically via `plugin.json`. Available capabilities:

- **`/review`** — dispatches all 10 specialist review agents against changed files, aggregates output into a health report
- **Plan review personas** — accessible via the prompts directory, provide adversarial plan review from acceptance, design, UX, and strategic perspectives
- **Gateguard hook** — blocks the first file write per session until the agent has read relevant codebase context (files, APIs, or tests), preventing assumption-based edits
- **Hook profile** — enforcement level set by `hook_profile` in your profile (`minimal`, `standard`, `strict`)

Review agents produce structured JSON output:

```json
{
  "status": "warn",
  "issues": [
    {
      "severity": "medium",
      "confidence": "high",
      "file": "src/handler.ts",
      "line": 42,
      "message": "Function exceeds 25-line threshold (32 lines)",
      "suggestedFix": "Extract database call into a separate function"
    }
  ],
  "summary": "1 warning found"
}
```

---

## 8. Update Workflow

When you change a template file (improve an agent, add a knowledge file, update a hook), propagate the changes to an existing generated plugin without losing user modifications:

```bash
# 1. Edit templates/agents/review/complexity-review.md.j2
# 2. Run generator in update mode
node scripts/generate.js --profile profiles/my-project.json --update

# 3. Re-install into the project
node scripts/install-plugin.js \
  --plugin generated/my-project-superpowers \
  --target /path/to/my-project

# 4. Verify
node scripts/doctor.js --target /path/to/my-project
```

**Update mode behavior:**

| File state | Outcome |
|---|---|
| Template unchanged | `skipped` — file not rewritten |
| Template changed, file on disk unchanged | `updated` — new template applied |
| Template changed, file on disk also changed | `conflicted` — neither version written, resolve manually |
| File in old state but not new template | `orphaned` — flagged for manual cleanup |

Exit code 3 when conflicts exist. Resolve them manually, then re-run with `--update`.

---

## 9. Repair Drifted Files

If the doctor reports `drifted` or `missing` files (someone edited or deleted a managed file), restore them:

```bash
node scripts/repair.js \
  --target /path/to/my-project \
  --source generated/my-project-superpowers
```

Preview first:

```bash
node scripts/repair.js \
  --target /path/to/my-project \
  --source generated/my-project-superpowers \
  --dry-run
```

`skip_if_exists` files (`CLAUDE.md`, `AGENTS.md`) are never overwritten by repair — they are reported as `protected`.

---

## Troubleshooting Common Issues

**Profile validation error: missing required field**

```
Profile validation failed:
  /: must have required property 'orm'
```

Add the missing field to your profile. See [profile-guide.md](./profile-guide.md) for required fields.

**Profile validation error: unknown language — thresholds required**

The generator does not have default review thresholds for your language. Add explicit thresholds to your profile:

```json
"review_thresholds": {
  "function_length": 30,
  "cyclomatic_complexity": 10,
  "nesting_depth": 4,
  "parameters": 5
}
```

**Template syntax error**

```
Error resolving plan: Syntax error: unclosed '{{' at line 14 in agents/review/complexity-review.md.j2
```

Open the named template file at the named line and close the placeholder. No output files were written.

**Doctor reports: no install-state found**

```
Error: could not read install-state manifest.
  Run the install command first to create .claude/install-state.json
```

Run `install-plugin.js` to create the manifest before running the doctor.

**Install-plugin reports: plugin.json not found**

The `--plugin` path must point to the generated plugin directory containing `plugin.json` at its root. Verify the path and that generation completed successfully.

**Conflict during --update**

```
[conflict] agents/review/complexity-review.md
```

The template changed and so did the file on disk. Open the file in your editor, review the diff against the new template content, merge manually, then re-run `--update`. The conflict is not automatically resolved.

For additional troubleshooting, see [docs/how-it-works.md](../how-it-works.md).
