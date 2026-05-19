# troubleshooting

Covers the most common failure modes across generation, installation, drift detection, and hook execution.

---

## generation errors

### "Missing variable 'X' at line Y"

**Symptom:** Template rendering aborts with a message like `Missing variable 'stack.framework' at line 12`.

**Cause:** A Jinja2 template references a profile field that either (a) is not present in the profile JSON or (b) has a typo in the template or profile.

**Fix:**
1. Check the field name against `schemas/profile.schema.json` (optional fields are listed there).
2. Add the missing field to your profile JSON:
   ```json
   { "stack": { "language": "typescript", "framework": "express" } }
   ```
3. If the field is intentionally absent, wrap the template reference in a conditional:
   ```jinja
   {% if profile.deploy_target %}Deploy target: {{ profile.deploy_target }}{% endif %}
   ```

---

### "Profile validation failed"

**Symptom:** `generate.js` exits 1 with lines like `  stack: required property 'language' missing` or `  ci_platform: must be one of gitlab, github, none`.

**Cause:** The profile JSON is missing a required field or has a field with the wrong type or value.

**Fix:**
1. Compare your profile against the required fields in `schemas/profile.schema.json`.
2. The error output includes the JSON path of every failing field — fix each one.
3. Run with `--dry-run` after fixing to verify before writing files:
   ```bash
   node scripts/generate.js --profile my-profile.json --dry-run
   ```

---

### "plugin.json schema validation failed — no files written"

**Symptom:** Generation aborts before writing any files. Error mentions `plugin-manifest-validation`.

**Cause:** The rendered `plugin.json` content does not conform to `plugin-manifest.schema.json`. Most commonly the `name` field contains uppercase letters or underscores, or `version` is not a valid semver string.

**Fix:**
- `name` must match `^[a-z0-9-]+$` — use lowercase hyphenated names only.
- `version` must be `MAJOR.MINOR.PATCH` — no `v` prefix, no pre-release suffix.
- Check the template at `templates/plugin.json.j2` for the field being generated incorrectly.

---

### "Error resolving plan: ..."

**Symptom:** `generate.js` exits 2 before any files are written.

**Cause:** A template file is unreadable, a required template directory is missing, or an IO error occurred during plan resolution.

**Fix:**
1. Verify the templates directory exists: `ls templates/`
2. Check for a `--templates` override that points to a non-existent path.
3. Ensure the user running the script has read access to the templates directory.

---

### "ENOENT: no such file or directory"

**Symptom:** Any script exits with an ENOENT error referencing a path.

**Cause:** Usually one of:
- `--profile` path does not exist.
- `--output` or `--target` points to a non-existent parent directory.
- `--source` (for `repair.js`) points to a generated plugin that has not been created yet.

**Fix:**
```bash
# Check the path exists before running
ls /path/to/my-profile.json

# For repair.js, generate the plugin first
node scripts/generate.js --profile my-profile.json
node scripts/repair.js --target /my-project --source generated/my-service-superpowers
```

---

### "exit code 3 (conflicts)"

**Symptom:** `generate.js --update` exits 3. Output shows `[conflicted]` entries.

**Cause:** Both the template and the installed file on disk changed since the last generation. The factory cannot automatically resolve three-way conflicts.

**Fix:**
1. Run with `--json` to get the list of conflicted files:
   ```bash
   node scripts/generate.js --profile my-profile.json --update --json | jq '.conflicts'
   ```
2. For each conflicted file, manually merge the template's new content with your local changes.
3. Re-run `--update` after resolving. The conflict will not reappear unless both sides change again.

---

## doctor errors

### "No install-state found"

**Symptom:** `doctor.js` exits 2 with:
```
Error: could not read install-state manifest.
  Run the install command first to create .claude/install-state.json
```

**Cause:** `--target` points to a project directory that has never had the plugin generated into it, or `.claude/install-state.json` was deleted.

**Fix:**
```bash
# Generate the plugin first
node scripts/generate.js --profile my-profile.json --output /my-project

# Then run doctor
node scripts/doctor.js --target /my-project
```

---

### Doctor reports drift on a file you intentionally modified

**Symptom:** `doctor.js` reports `drifted` for a file you deliberately changed (e.g., `CLAUDE.md` with project-specific additions).

**Cause:** The file's content hash no longer matches the hash recorded in install-state. This is the intended behavior — drift detection is accurate.

**Fix (two options):**

1. **Accept the risk** — add the file path to an `ACCEPTED-RISKS` list in your project's documentation so the team knows the drift is intentional. Use `--quick` mode in CI to skip non-critical files.

2. **Switch the template strategy to `skip_if_exists`** — if the file is meant to be user-owned after initial creation, change its strategy in the template plan. `skip_if_exists` files are reported as `protected` (not `drifted`) by `doctor.js`.

---

### "Schema validation error" in doctor output

**Symptom:** `doctor.js --json` emits a warning:
```
Warning: conformance report failed schema validation:
  summary.okCount: must be >= 0
```

**Cause:** A code path produced a negative count or a null value in the report summary. This is a bug in the doctor script, not a user error.

**Fix:** Report the issue. As a workaround, use human-readable mode (omit `--json`) which does not validate the report against the schema.

---

## repair errors

### "source file not found"

**Symptom:** `repair.js` reports `[!] some/file.md — source file not found: /path/to/source/some/file.md`

**Cause:** The `--source` directory does not contain the file that install-state expects. This happens when the `--source` plugin was regenerated with a different profile that removed the file, or when `--source` points to the wrong directory.

**Fix:**
1. Verify `--source` points to the most recently generated plugin output.
2. If the file was legitimately removed from the template, regenerate and use `--update` mode instead of repair.

---

## hook errors

### "Hook blocked: investigation required"

**Symptom:** A `Write` or `Edit` tool use is denied. Claude Code shows a message asking the agent to:
1. List every module that imports the target file.
2. Describe the public API surface.
3. Identify data schemas the file owns or depends on.
4. Quote the exact user instruction that prompted the write.

**Cause:** GateGuard fired (strict profile). No valid state file exists at `~/.gateguard/<session-id>.json`, or the existing state file is older than 30 minutes.

**Fix:**
1. The agent should gather the evidence listed in the deny message.
2. After gathering evidence, clear the gate:
   ```bash
   GATEGUARD_CLEAR=1 node hooks/gateguard.js
   # or
   node hooks/gateguard-clear.js
   ```
3. Retry the write.

If you need to bypass GateGuard for a specific session (e.g., in CI):
```bash
export CLAUDE_SUBAGENT=1
```

---

### "BLOCKED: Cannot edit X"

**Symptom:** A `Write` or `Edit` on a specific file is denied with a message like `BLOCKED: Cannot edit .env`.

**Cause:** `protect-files.js` matched the target path against its protected-files list. This hook runs at the minimal profile level and cannot be bypassed by profile selection.

**Fix:**
- If the block is correct: do not modify the protected file through Claude Code. Edit it manually.
- If the block is incorrect: review the protected-files configuration in `hooks/protect-files.js` and remove or adjust the pattern for the file path.

---

### "run-with-flags: unknown hookId"

**Symptom:** A hook invocation fails immediately with exit 1 and `unknown hookId "my-hook"`.

**Cause:** The hook ID passed as the first argument to `run-with-flags.js` does not match any entry in `hooks/hooks.json`.

**Fix:**
1. Confirm the hook is registered in `hooks/hooks.json` with the exact same ID.
2. Check that `hooks.json` was regenerated after the last profile change — deep-merge does not add entries that were removed from the template.

---

### "run-with-flags: invalid script path — path traversal protection"

**Symptom:** A hook exits 1 with a message about `Path traversal protection rejected this request`.

**Cause:** The `scriptPath` argument resolves to a location outside `PLUGIN_ROOT`. This usually means `PLUGIN_ROOT` is set incorrectly, or a hook command uses a path with `..` that escapes the plugin directory.

**Fix:**
1. Verify `PLUGIN_ROOT` is set to the plugin root (the directory containing `hooks/hooks.json`).
2. Ensure all hook `command` values in `hooks.json` use `${PLUGIN_ROOT}` as the base.

---

## generation content issues

### Generation produces unexpected content

**Symptom:** A generated file has wrong language, wrong framework references, or placeholder text like `None` where a real value was expected.

**Cause:** A profile field has an unexpected value, or a field expected by a template is `null` when the template doesn't guard against it.

**Common checks:**
- `stack.language` — templates branch on this extensively. Verify spelling matches what the template expects (e.g., `typescript` not `TypeScript`).
- Nullable fields (`orm`, etc.) — if set to `null`, templates that use them without an `{% if %}` guard will render `None` (Jinja2's null representation).

**Fix:**
1. Run with `--dry-run --json` and inspect `operations[].contentLength` values. Short or zero lengths indicate empty template output.
2. Add the missing `{% if profile.orm %}...{% endif %}` guard to the template if the field is optional.

---

## test failures after template changes

**Symptom:** Test suite fails after modifying templates, with errors referencing generated plugin files.

**Cause:** Tests compare generated output against snapshots or expected fixtures. Template changes alter the output but fixtures are not updated.

**Fix:**
1. Regenerate the test fixtures:
   ```bash
   node scripts/generate.js --profile test/fixtures/standard-profile.json --output test/fixtures/expected-output
   ```
2. Review the diff to confirm the changes are intentional.
3. Commit the updated fixtures alongside the template change.
