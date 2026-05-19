# schema reference

All schemas live in `/schemas/`. The factory validates inputs and outputs against them using `scripts/lib/schema-validator.js`. `additionalProperties: false` is enforced on most schemas — unknown fields are rejected unless explicitly noted.

---

## 1. `profile.schema.json`

**Purpose:** Defines a project's tech stack, conventions, and enforcement settings. This is the primary input to `generate.js`. Every template rendering uses values from the profile.

### required fields

| field | type | constraints | description |
|---|---|---|---|
| `name` | string | minLength: 1 | Project name; used for the output directory (`generated/<name>-superpowers/`) |
| `stack` | object | see below | Tech stack declaration |
| `stack.language` | string | minLength: 1 | Primary programming language (e.g., `typescript`, `python`, `rust`) |
| `stack.framework` | string | — | Primary framework; use empty string if none |
| `orm` | string \| null | — | ORM or database access library; `null` if none |
| `test_framework` | string | minLength: 1 | Primary test runner (e.g., `vitest`, `pytest`, `cargo-test`) |
| `concurrency_model` | string | minLength: 1 | Async model (e.g., `tokio`, `deno-async`, `celery`, `goroutines`) |
| `ci_platform` | string | enum: `gitlab`, `github`, `none` | CI/CD platform |

### optional fields

| field | type | description |
|---|---|---|
| `hook_profile` | enum: `minimal`, `standard`, `strict` | Enforcement level. Default: `standard` |
| `review_thresholds` | object | Override per-language code review limits |
| `review_thresholds.function_length` | integer ≥ 1 | Max lines per function |
| `review_thresholds.cyclomatic_complexity` | integer ≥ 1 | Max cyclomatic complexity |
| `review_thresholds.nesting_depth` | integer ≥ 1 | Max nesting depth |
| `review_thresholds.parameters` | integer ≥ 1 | Max parameters per function |
| `additional_agents` | string[] | Extra agent file paths to include verbatim |
| `knowledge_overrides` | object (string→string) | Map of knowledge file names to replacement content |
| `deploy_target` | string | e.g., `deno-deploy`, `ecs-fargate`, `play-store` |
| `auth_model` | string | e.g., `supabase-auth`, `jwt-simplejwt`, `ucan` |
| `serialization_format` | string | e.g., `json`, `postcard`, `protobuf` |
| `database` | string | e.g., `postgresql`, `sqlite`, `supabase` |
| `message_broker` | string | e.g., `nats`, `redis`, `celery` |
| `feature_flag_system` | string | e.g., `unleash`, `none` |
| `observability_stack` | string | e.g., `otel+grafana`, `sentry`, `otel+sentry` |
| `commit_format` | string | e.g., `type(scope): desc` |
| `extensions` | object (any) | Arbitrary key-value pairs for template-specific use |

### minimal example

```json
{
  "name": "my-service",
  "stack": { "language": "typescript", "framework": "express" },
  "orm": "prisma",
  "test_framework": "vitest",
  "concurrency_model": "deno-async",
  "ci_platform": "github"
}
```

### common validation errors

| error | cause | fix |
|---|---|---|
| `name: must be a string` | Field missing or wrong type | Add `"name": "my-project"` |
| `ci_platform: must be one of gitlab, github, none` | Typo or unsupported value | Use one of the three enum values |
| `stack: required property 'language' missing` | `stack` object present but incomplete | Add `stack.language` |
| `Additional property 'tier' is not allowed` | Using old profile format | Replace `tier` with `hook_profile` |

---

## 2. `install-state.schema.json`

**Purpose:** Records every file written during generation. Enables drift detection (`doctor.js`) and conflict detection (`generate.js --update`). Written to `.claude/install-state.json` in the output directory.

### required fields

| field | type | constraints | description |
|---|---|---|---|
| `schema` | string | const: `install-state.v1` | Version sentinel |
| `generatedAt` | string | ISO 8601 date-time | Timestamp of generation; excluded from determinism hash |
| `templateVersion` | string | semver pattern | Version of the template package used |
| `profileHash` | string | `sha256:[64 hex chars]` | SHA-256 of the profile JSON at generation time |
| `operations` | array | see below | One entry per file written |

**Each operation entry:**

| field | type | constraints | description |
|---|---|---|---|
| `kind` | string | enum: `create`, `merge` | Whether the file was created or merged |
| `source` | string | — | Relative path to the source template file |
| `dest` | string | — | Relative path to the output file |
| `strategy` | string | enum: `overwrite`, `skip_if_exists`, `deep_merge` | Write strategy used |
| `contentHash` | string | `sha256:[64 hex chars]` | SHA-256 of the content written to disk |

### minimal example

```json
{
  "schema": "install-state.v1",
  "generatedAt": "2026-05-19T12:00:00.000Z",
  "templateVersion": "1.2.0",
  "profileHash": "sha256:a3f1...c9d2",
  "operations": [
    {
      "kind": "create",
      "source": "plugin.json.j2",
      "dest": "plugin.json",
      "strategy": "overwrite",
      "contentHash": "sha256:b8e2...f4a1"
    }
  ]
}
```

### common validation errors

| error | cause | fix |
|---|---|---|
| `schema: must be equal to constant` | Wrong or missing version sentinel | Set `"schema": "install-state.v1"` |
| `profileHash: must match pattern` | Hash not prefixed with `sha256:` | Use the output of `contentHash()` from `lib/file-operations.js` |
| `strategy: must be one of overwrite, skip_if_exists, deep_merge` | Invalid strategy string | Use one of the three enum values |

---

## 3. `review-output.schema.json`

**Purpose:** Uniform JSON envelope produced by every specialist review agent. The orchestrator reads these envelopes to aggregate results. Enforcing a single schema means agents are interchangeable.

### required fields

| field | type | constraints | description |
|---|---|---|---|
| `status` | string | enum: `pass`, `warn`, `fail`, `skip` | Overall result for this agent's review |
| `issues` | array | see below | Zero or more issues found |
| `summary` | string | minLength: 1 | Human-readable summary of findings |

**Each issue entry:**

| field | type | constraints | description |
|---|---|---|---|
| `severity` | string | enum: `error`, `warning`, `suggestion` | Impact level |
| `confidence` | string | enum: `high`, `medium`, `none` | How certain the agent is |
| `file` | string | no leading `/` | Repo-relative POSIX path |
| `line` | integer | ≥ 1 | 1-indexed line number |
| `message` | string | minLength: 1 | Description of the issue |
| `suggestedFix` | string | — | Concrete fix; empty string if none |

### minimal example

```json
{
  "status": "warn",
  "issues": [
    {
      "severity": "warning",
      "confidence": "high",
      "file": "src/auth/token.ts",
      "line": 42,
      "message": "JWT secret read from environment without fallback guard",
      "suggestedFix": "Add a startup check that throws if JWT_SECRET is undefined"
    }
  ],
  "summary": "One warning: missing JWT_SECRET guard in token.ts"
}
```

### common validation errors

| error | cause | fix |
|---|---|---|
| `file: must match pattern ^[^/]` | File path starts with `/` | Strip the leading slash |
| `line: must be >= 1` | Line number is 0 or negative | Use 1-indexed line numbers |
| `status: must be one of pass, warn, fail, skip` | Agent returned a custom status | Map to the four allowed values |
| `issues: must be array` | Agent returned `null` | Return `[]` when there are no issues |

---

## 4. `hooks-registry.schema.json`

**Purpose:** Schema for `hooks.json` — the runtime registry read by `run-with-flags.js`. Every hook entry has a stable ID that enables surgical enable/disable via `DISABLED_HOOKS`.

### required fields

| field | type | constraints | description |
|---|---|---|---|
| `hooks` | array | see below | One entry per registered hook |

**Each hook entry:**

| field | type | constraints | description |
|---|---|---|---|
| `id` | string | `^[a-z0-9-]+$` | Stable identifier; lowercase alphanumeric and hyphens only |
| `event` | string | enum (see below) | Lifecycle event that triggers the hook |
| `matcher` | string | — | Tool name pattern; supports `\|` alternation |
| `command` | string | minLength: 1 | Shell command; may use `${PLUGIN_ROOT}` |
| `profiles` | string[] | optional; items enum: `minimal`, `standard`, `strict` | Which profiles activate this hook |

**Valid `event` values:** `SessionStart`, `PreToolUse`, `PostToolUse`, `PreCompact`, `Stop`, `SessionEnd`

### minimal example

```json
{
  "hooks": [
    {
      "id": "protect-files",
      "event": "PreToolUse",
      "matcher": "Edit|Write",
      "command": "${PLUGIN_ROOT}/hooks/protect-files.js protect-files",
      "profiles": ["minimal", "standard", "strict"]
    }
  ]
}
```

### common validation errors

| error | cause | fix |
|---|---|---|
| `id: must match pattern ^[a-z0-9-]+$` | Uppercase or special characters in ID | Use lowercase-hyphenated identifiers |
| `event: must be one of ...` | Typo in event name | Check the six valid event names |
| `hooks: must be array` | Object format instead of array | Wrap entries in an array |

---

## 5. `plugin-manifest.schema.json`

**Purpose:** Schema for `plugin.json` — the Claude Code plugin metadata file. `additionalProperties` is intentionally `true` for forward compatibility as the Claude Code plugin system evolves.

### required fields

| field | type | constraints | description |
|---|---|---|---|
| `name` | string | `^[a-z0-9-]+$`, minLength: 1 | Plugin identifier; lowercase alphanumeric and hyphens |
| `version` | string | semver pattern | Plugin version |

### optional fields

| field | type | description |
|---|---|---|
| `description` | string | Human-readable description |
| `author` | string | Author name or org |
| `license` | string | SPDX license identifier |
| `keywords` | string[] | Discovery tags |
| `dependencies` | object | Plugin dependencies |
| `hooks` | array | Hook registrations (structure defined by hooks-registry) |
| `agents` | string[] | Paths to agent markdown files |
| `skills` | string[] | Paths to skill markdown files |
| `commands` | string[] | Paths to command markdown files |
| `mcpServers` | object | MCP server configurations |
| `settings` | object | Plugin-level settings |

### minimal example

```json
{
  "name": "my-service-superpowers",
  "version": "1.0.0"
}
```

### common validation errors

| error | cause | fix |
|---|---|---|
| `name: must match pattern ^[a-z0-9-]+$` | Uppercase letters or underscores | Use `my-plugin-name`, not `MyPlugin` or `my_plugin` |
| `version: must match pattern` | Non-semver string | Use `MAJOR.MINOR.PATCH` format |

---

## 6. `conformance-report.schema.json`

**Purpose:** Output schema for `doctor.js`. Reports drift status for every file recorded in the install-state manifest. Used by CI pipelines and the `--json` flag to detect configuration drift.

### required fields

| field | type | constraints | description |
|---|---|---|---|
| `schema` | string | const: `conformance-report.v1` | Version sentinel |
| `checkedAt` | string | ISO 8601 date-time | When the check ran |
| `summary` | object | see below | Aggregate counts |
| `files` | array | see below | Per-file status |

**Summary object:**

| field | type | constraints |
|---|---|---|
| `okCount` | integer | ≥ 0 |
| `driftedCount` | integer | ≥ 0 |
| `missingCount` | integer | ≥ 0 |
| `protectedCount` | integer | ≥ 0 |
| `errorCount` | integer | ≥ 0 |

**Each file entry:**

| field | type | constraints | description |
|---|---|---|---|
| `path` | string | — | Relative path within the target project |
| `status` | string | enum: `ok`, `drifted`, `missing`, `protected`, `error` | Current state |
| `expectedHash` | string | optional; `sha256:[64 hex]` | Hash from install-state |
| `actualHash` | string \| null | optional; `sha256:[64 hex]` or null | Hash of on-disk content; `null` when file is missing |

### minimal example

```json
{
  "schema": "conformance-report.v1",
  "checkedAt": "2026-05-19T12:00:00.000Z",
  "summary": {
    "okCount": 12,
    "driftedCount": 1,
    "missingCount": 0,
    "protectedCount": 2,
    "errorCount": 0
  },
  "files": [
    {
      "path": "hooks/hooks.json",
      "status": "drifted",
      "expectedHash": "sha256:a1b2...c3d4",
      "actualHash": "sha256:e5f6...a7b8"
    }
  ]
}
```

### file status meanings

| status | meaning |
|---|---|
| `ok` | File on disk matches the install-state hash |
| `drifted` | File exists but hash differs from install-state |
| `missing` | File was recorded in install-state but not found on disk |
| `protected` | File has `skip_if_exists` strategy and exists — intentionally not tracked |
| `error` | File could not be read (permissions, symlink, etc.) |

---

## 7. `orchestrator-aggregation.schema.json`

**Purpose:** Output schema for the orchestrator after dispatching all review agents. Synthesizes individual `review-output.schema.json` envelopes into a single health score and priority list.

### required fields

| field | type | constraints | description |
|---|---|---|---|
| `healthScore` | string | enum: `HEALTHY`, `NEEDS_ATTENTION`, `CRITICAL` | Overall codebase health |
| `agentResults` | array | see below | Per-agent summary |
| `summary` | string | minLength: 1 | Top 3 priorities across all agent findings |

**Health score rules (from `review-rubric.md`):**

| score | condition |
|---|---|
| `HEALTHY` | 0 `fail` results AND ≤ 2 `warn` results |
| `NEEDS_ATTENTION` | 1–2 `fail` results OR 3+ `warn` results |
| `CRITICAL` | 3+ `fail` results OR any `security-review` agent returns `fail` |

**Each agent result entry:**

| field | type | constraints | description |
|---|---|---|---|
| `agent` | string | — | Agent filename without extension |
| `status` | string | enum: `pass`, `warn`, `fail`, `skip` | Agent's reported status |
| `issueCount` | integer | ≥ 0 | Total issues found by this agent |

### minimal example

```json
{
  "healthScore": "NEEDS_ATTENTION",
  "agentResults": [
    { "agent": "security-review", "status": "pass", "issueCount": 0 },
    { "agent": "code-quality", "status": "warn", "issueCount": 3 },
    { "agent": "test-coverage", "status": "fail", "issueCount": 1 }
  ],
  "summary": "1. test-coverage: no coverage for auth module. 2. code-quality: 3 functions exceed complexity threshold. 3. Consider adding integration tests for the payment flow."
}
```

### common validation errors

| error | cause | fix |
|---|---|---|
| `healthScore: must be one of HEALTHY, NEEDS_ATTENTION, CRITICAL` | Lowercase or non-standard value | Use the exact uppercase enum values |
| `summary: must have at least 1 character` | Empty string or missing field | Provide a non-empty summary even when all agents pass |
| `issueCount: must be >= 0` | Negative number | Use 0 for agents that found no issues |
