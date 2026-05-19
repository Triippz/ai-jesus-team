# Profile Guide — Field Reference

A profile is a JSON file that describes a project's tech stack, conventions, and review thresholds. The generator reads the profile to tailor every agent, hook, and knowledge file in the generated plugin. Profiles live in `profiles/` and are committed to version control alongside the templates.

One profile per project. The `name` field determines the output directory: `generated/<name>-superpowers/`.

---

## Required Fields

All six fields below must be present. The generator fails with an explicit error if any are missing.

| Field | Type | Description |
|---|---|---|
| `name` | string | Project name. Used to name the output directory. No spaces. |
| `stack.language` | string | Primary programming language (`rust`, `typescript`, `python`, `dart`, `go`, etc.). |
| `stack.framework` | string | Primary framework (`axum`, `hono`, `django`, `flutter`, etc.). Empty string if none. |
| `orm` | string \| null | ORM or database access library (`diesel`, `prisma`, `sqlalchemy`, etc.). `null` if none. |
| `test_framework` | string | Primary test framework (`cargo-nextest`, `deno-test`, `pytest`, `flutter-test`, etc.). |
| `concurrency_model` | string | Primary concurrency model (`tokio`, `deno-async`, `celery`, `goroutines`, `dart-isolates`, etc.). |
| `ci_platform` | string | CI/CD platform. One of: `gitlab`, `github`, `none`. |

---

## Optional Fields

Optional fields are omitted when not relevant. Agents and hooks use these values to produce more specific output. When omitted, agents fall back to generic language-level advice.

| Field | Type | Description |
|---|---|---|
| `review_thresholds` | object | Override per-language default thresholds. See the defaults table below. |
| `hook_profile` | string | Hook enforcement level: `minimal`, `standard`, or `strict`. Default: `standard`. |
| `additional_agents` | array of strings | Paths to additional agent `.md` files to include verbatim in the generated plugin. |
| `knowledge_overrides` | object | Map of knowledge filename to replacement content (string). Overrides a knowledge file in `templates/knowledge/`. |
| `deploy_target` | string | Deployment target (`deno-deploy`, `fly-io`, `ecs-fargate`, `play-store`, etc.). |
| `auth_model` | string | Authentication model (`supabase-auth`, `jwt-simplejwt`, `ucan`, etc.). |
| `serialization_format` | string | Primary wire format (`json`, `postcard`, `protobuf`, etc.). |
| `database` | string | Primary database (`postgresql`, `sqlite`, `supabase`, `sqlite-sqlcipher`, etc.). |
| `message_broker` | string | Message broker (`nats`, `redis`, `celery`, `iroh-gossip`, etc.). |
| `feature_flag_system` | string | Feature flag system (`unleash`, `none`, etc.). |
| `observability_stack` | string | Observability stack (`otel+grafana`, `sentry`, `otel+sentry`, etc.). |
| `commit_format` | string | Commit message format (`type(scope): description`, `type: [scope] description`, etc.). |

### `hook_profile` levels

| Level | Behavior |
|---|---|
| `minimal` | Core safety hooks only (protect secrets, block destructive git). |
| `standard` | Core hooks + file-size guard + commit format enforcement. |
| `strict` | All of `standard` + TDD guard (blocks implementation without tests) + magic literal detection. |

---

## `extensions` Object

The `extensions` object holds arbitrary key-value pairs for project-specific template customization. Any key in `extensions` is available in templates as `{{extensions.key_name}}`. The schema permits any types under `extensions` — strings, numbers, arrays, and objects are all valid.

Common uses:

- Library names that don't fit a standard field (`crdt_library`, `p2p_transport`, `actor_framework`)
- Workspace metadata (`workspace_members`, `file_limit`)
- Domain-specific flags (`ffi_bridge`, `pqc`, `spatial_index`)

```json
"extensions": {
  "crdt_library": "loro",
  "p2p_transport": "iroh-quic",
  "ffi_bridge": "flutter_rust_bridge",
  "actor_framework": "ractor",
  "workspace_members": 53,
  "file_limit": 600
}
```

> Unrecognized top-level fields (fields outside the declared required, optional, and `extensions` set) are rejected with a validation error. Put custom fields inside `extensions`, not at the top level.

---

## Per-Language Default Review Thresholds

When `review_thresholds` is omitted, the generator applies these defaults based on each language's standard tooling:

| Language | Function Length | Cyclomatic Complexity | Nesting Depth | Parameters |
|---|---|---|---|---|
| Rust | 50 lines (clippy) | 10 (cognitive_complexity) | 4 | 5 |
| Python | 20 lines (ruff/pylint) | 10 (McCabe C901) | 4 | 5 |
| Dart/Flutter | 30 lines (dart_code_linter) | 10 | 4 | 5 |
| Go | 50 lines (gocyclo) | 15 (accounts for error-handling verbosity) | 3 (early return idiom) | 5 |
| TypeScript/Deno | 25 lines (eslint max-lines-per-function) | 10 (eslint complexity) | 4 (eslint max-depth) | 4 |

For languages not in this table, the generator fails with an error asking for explicit thresholds in `review_thresholds`.

Override any threshold by adding `review_thresholds` to your profile:

```json
"review_thresholds": {
  "function_length": 40,
  "cyclomatic_complexity": 8,
  "nesting_depth": 3,
  "parameters": 4
}
```

Partial overrides are supported — only the fields you provide are overridden; the rest use the language default.

---

## Example Profiles

### `profiles/atlas.json` — Rust / Axum / SQLite

A systems-level tactical application with a strict hook profile, custom serialization, P2P transport, and many workspace members.

```json
{
  "name": "atlas",
  "stack": {
    "language": "rust",
    "framework": "axum"
  },
  "orm": "diesel",
  "test_framework": "cargo-nextest",
  "concurrency_model": "tokio",
  "ci_platform": "gitlab",
  "review_thresholds": {
    "function_length": 50,
    "cyclomatic_complexity": 10,
    "nesting_depth": 4,
    "parameters": 5
  },
  "hook_profile": "strict",
  "deploy_target": "fly-io",
  "auth_model": "ucan",
  "serialization_format": "postcard",
  "database": "sqlite-sqlcipher",
  "message_broker": "iroh-gossip",
  "observability_stack": "otel+sentry",
  "commit_format": "type: [scope] description",
  "extensions": {
    "crdt_library": "loro",
    "p2p_transport": "iroh-quic",
    "ffi_bridge": "flutter_rust_bridge",
    "actor_framework": "ractor",
    "crypto_identity": "ed25519-dalek",
    "pqc": "aws-lc-rs",
    "spatial_index": "rstar",
    "workspace_members": 53,
    "file_limit": 600
  }
}
```

The `strict` hook profile activates the TDD guard and magic literal detection. The `extensions` object gives templates access to P2P-specific library names. Review agents reference `tokio`, `ractor`, and `arc-swap` rather than generic concurrency advice.

---

### `profiles/nuv.json` — TypeScript / Hono / Deno

A SaaS product with Deno runtime, HTMX frontend, Supabase backend, and a standard hook profile.

```json
{
  "name": "nuv",
  "stack": {
    "language": "typescript",
    "framework": "hono"
  },
  "orm": null,
  "test_framework": "deno-test",
  "concurrency_model": "deno-async",
  "ci_platform": "github",
  "review_thresholds": {
    "function_length": 25,
    "cyclomatic_complexity": 10,
    "nesting_depth": 4,
    "parameters": 4
  },
  "hook_profile": "standard",
  "deploy_target": "deno-deploy",
  "auth_model": "supabase-auth",
  "serialization_format": "json",
  "database": "supabase",
  "observability_stack": "otel+sentry",
  "commit_format": "type(scope): description",
  "extensions": {
    "runtime": "deno",
    "ui_library": "htmx+alpinejs",
    "css_framework": "tailwind+daisyui",
    "validation": "valibot",
    "e2e_framework": "playwright",
    "payments": "lemonsqueezy",
    "hosting": "deno-deploy"
  }
}
```

`orm: null` is valid — the ORM field is required but can be explicitly null. The TypeScript defaults (25-line function limit, 10 complexity) match the eslint conventions used in this stack.

---

## Validating a Profile

Run the schema validator before generating:

```bash
node scripts/validate-schemas.js
```

This validates all JSON files in the repo against their declared schemas, including all profiles in `profiles/`. Any profile with a missing required field, an extra top-level field, or a type mismatch is reported with the field path and the specific error.

You can also trigger validation implicitly by running the generator with `--dry-run`:

```bash
node scripts/generate.js --profile profiles/my-project.json --dry-run
```

Profile validation runs before any template rendering. If validation fails, no output is produced.

---

## Creating a New Profile

**Step 1.** Copy the closest existing profile:

```bash
cp profiles/nuv.json profiles/my-project.json
```

**Step 2.** Set `name` to your project name (no spaces, lowercase-hyphenated):

```json
"name": "my-project"
```

**Step 3.** Set required fields for your stack:

```json
"stack": { "language": "go", "framework": "chi" },
"orm": "sqlc",
"test_framework": "go-test",
"concurrency_model": "goroutines",
"ci_platform": "github"
```

**Step 4.** Set `hook_profile`. Use `standard` unless you have a reason to deviate.

**Step 5.** Add optional fields for your stack's specifics. Each field you add makes review agents more specific:

```json
"deploy_target": "cloud-run",
"auth_model": "jwt",
"database": "postgresql",
"observability_stack": "otel+grafana"
```

**Step 6.** Add any custom library names under `extensions`:

```json
"extensions": {
  "http_client": "resty",
  "migration_tool": "goose"
}
```

**Step 7.** Validate:

```bash
node scripts/validate-schemas.js
```

**Step 8.** Generate:

```bash
node scripts/generate.js --profile profiles/my-project.json --dry-run
# Inspect the plan, then remove --dry-run to write
node scripts/generate.js --profile profiles/my-project.json
```

Go's default thresholds differ from other languages (50-line functions, complexity 15, nesting depth 3). If you want different values, add `review_thresholds` to override them.
