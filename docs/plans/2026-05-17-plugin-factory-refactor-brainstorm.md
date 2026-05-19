# plugin factory refactor — brainstorm

**Date:** 2026-05-17
**Status:** Investigation complete, ready for /spec
**Target repo:** ~/Development/dev-ai-utilities (Mark's private org plugin marketplace)
**Reference repos:** community open-source Claude Code plugins (two repos audited)

---

## problem statement

Mark maintains multiple projects across vastly different tech stacks (Deno/Hono, Rust/Flutter/P2P, and others). Each project installs `core-superpowers` (generic workflow) plus a project-specific plugin from `dev-ai-utilities`. The current setup works but has three problems:

1. **Generic agents give weaker advice than tailored ones.** A concurrency-review agent that knows about tokio/ractor patterns is more useful than one that says "watch for race conditions."
2. **The review pipeline is shallow.** dev-ai-utilities has 4 generalist reviewers. An open-source community plugin studied during investigation has 19 specialists with structured JSON output, confidence-gated auto-fix, and health scoring. The specialist model is measurably better.
3. **No conformance enforcement.** Nothing prevents drift — if someone deletes CLAUDE.md or modifies a hook, there's no detection or repair mechanism.

---

## investigation summary

### repos audited

**dev-ai-utilities** (~/Development/dev-ai-utilities/) — Mark's personal plugin marketplace
- 1 plugin: core-superpowers (plus project-specific plugins to be generated)
- 11 core agents, 18 skills, 14 commands, 12 hooks
- Profiles for each project, cursor rules, codex mirrors, 159 bats tests
- Missing: project-specific plugins, specialist review agents, conformance system

**Community plugin A** — Open-source specialist review plugin
- 30 agents (11 team + 19 review), 33 skills, 29 commands, 10 hooks
- Structured JSON output for all review agents with confidence-gated auto-fix
- 4 plan review personas dispatched in parallel
- Quality gate pipeline with Iron Law verification
- Eval system (315 fixtures, pass@k scoring)
- Progressive context loading protocol with token budgets

**Community plugin B** — Open-source scaffold/conformance reference
- Plan/apply two-phase scaffold pattern (resolveInstallPlan → applyInstallPlan)
- Install-state tracking (schema-versioned) with doctor/repair
- GateGuard: blocks first file touch until investigation facts are presented
- Hook runner with profile gating (minimal/standard/strict)
- Deep-merge JSON for idempotent config updates
- AJV schema validation in CI for agents, hooks, skills
- Content pattern tests for required safety sections
- Export surface sync tests (deepStrictEqual manifest vs filesystem)
- Multi-target install (claude, cursor, codex, gemini, etc.)

### projects audited

| Project | Path | Stack | Current plugins |
|---|---|---|---|
| Nuv | ~/PersonalDevelopment/nuvcard/ | Deno 2.x, Hono 4.x, HTMX, Alpine.js, Supabase, Tailwind/DaisyUI, Valibot, Playwright, OTel | None (CLAUDE.md only) |

### external research

| Source | Key pattern | Relevance |
|---|---|---|
| Copier (copier.readthedocs.io) | Three-way merge for template updates, `_skip_if_exists`, `.copier-answers.yml` as state file | Template update propagation without clobbering user modifications |
| Backstage (backstage.io) | `source-template` annotation for drift tracking, scaffolder pre-wires everything at generation time | Conformance tracking across generated projects |
| Terraform | Desired-state model, plan before apply, state file as source of truth | Idempotent scaffolding with drift detection |
| Ansible | Module-level `changed`/`ok` reporting, idempotent modules | Every operation reports its effect (created/updated/skipped/protected) |
| Praetorian blog | Manifest-as-PCB for session resumption, 8-layer enforcement stack | Deterministic agent orchestration surviving session crashes |
| arxiv:2603.06394 | Schema-gated execution boundaries, validate full output before writing | Structural validation at execution boundary, not just tool-call level |

---

## architecture decision

**Core template → generated self-contained plugins.**

Each project gets ONE plugin containing everything — workflow, review agents, skills, hooks, knowledge — all tailored to that project's stack. The plugins are generated from a core template using project profiles.

### why not core + overlay composition

- Two plugins per project adds installation friction and composition bugs
- Generic agents in core give weaker advice than tailored agents
- Array replacement in settings.json means plugin B can clobber plugin A's hooks
- Larger teams need single-plugin install for zero-friction onboarding

### why templates over manual authoring

- 5 projects means maintaining ~60 files per plugin × 5 = ~300 files
- Template changes propagate to all projects via regeneration
- Profiles capture project-specific values; template captures shared structure
- Copier-style three-way merge preserves user modifications during updates

### plugin inventory (post-refactor)

| Plugin | Stack tailoring | Source template + profile |
|---|---|---|
| nuv-superpowers | Deno, Hono, HTMX, Supabase, Playwright, a11y | core template + profiles/nuv.json |
| aok-be-superpowers | Python, Django, DRF, Celery, Redis, OpenSearch | core template + profiles/aok-be.json |
| aok-fe-superpowers | Flutter, custom BLoC, Drift, aok_sync, Widgetbook | core template + profiles/aok-fe.json |
| atlas-superpowers | Rust, iroh, CRDTs, SQLCipher, Diesel, FRB Flutter, ractor | core template + profiles/atlas.json |
| atlas-storage-superpowers | Go, REST, OpenAPI, Postgres, buf/protobuf | core template + profiles/atlas-storage.json |
| atlas-infra-superpowers | Terraform, AWS, Azure (already exists, keep as-is) | Not templated — domain-specific enough to stay manual |

---

## what to absorb

### from community plugin A (specialist review patterns)

**Review agents (port 10 into core template):**

| Agent | Tier | Template placeholders |
|---|---|---|
| complexity-review | haiku | Thresholds per language (Rust: fn <50 lines, Python: fn <20 lines) |
| naming-review | haiku | Naming conventions per stack (snake_case vs camelCase) |
| concurrency-review | sonnet | Concurrency primitives per stack (tokio/ractor, Celery/Channels, Deno async) |
| domain-review | opus | ORM markers per stack (Diesel, Django ORM, none) |
| test-review | sonnet | Test framework per stack (cargo-nextest, pytest, Deno.test, flutter test) |
| structure-review | sonnet | Expected directory layout per stack |
| spec-compliance-review | sonnet | Generic (no stack variation) |
| performance-review | haiku | Performance patterns per stack |
| doc-review | sonnet | Generic (no stack variation) |
| progress-guardian | haiku | Generic (no stack variation) |

**Plan review personas (port all 4):**
- Acceptance Test Critic — criteria verifiability, BDD scenarios, TDD traceability
- Design & Architecture Critic — dependency direction, God objects, abstraction quality
- UX Critic — self-skips for non-UI plans, checks user journey and error recovery
- Strategic Critic — problem-solution fit, scope, risk, opportunity cost

**Knowledge files (port 4):**
- review-rubric.md — health scoring (HEALTHY/NEEDS ATTENTION/CRITICAL)
- review-template.md — standardized output format with pre-flight gates
- owasp-detection.md — tool-detectable vs judgment-only classification
- accepted-risks-schema.md — suppression rules with expiry enforcement

**Skills (port 4):**
- design-it-twice — spawn 3+ agents with divergent constraints
- context-loading-protocol — token budgets, progressive disclosure
- ci-debugging — 5-step systematic CI diagnosis
- legacy-code — 5-step safe change algorithm

**Patterns (adopt 5):**
- Uniform JSON envelope for all review agents
- Confidence-gated auto-fix (high=auto, medium=confirm, none=report)
- Hard numeric thresholds eliminating judgment calls
- "3 warnings = needs-revision" escalation rule
- First-gate + second-gate staging (spec-compliance before quality)

### from community plugin B (scaffold/conformance patterns)

**Scaffold system (adopt core pattern):**
- Plan/apply two-phase separation (read-only plan → idempotent apply)
- Install-state tracking (schema recording every generated file)
- Doctor/repair commands (detect drift → auto-fix)
- Deep-merge for JSON configs (never clobber user modifications)
- `_skip_if_exists` for user-modifiable files (CLAUDE.md, AGENTS.md)
- `${PLUGIN_ROOT}` placeholder replacement for portable hook commands
- `--dry-run` and `--json` flags on all commands

**Deterministic enforcement (adopt 5 patterns):**
- GateGuard — block first file touch until investigation facts are presented
- Tool restriction as phase gating — planning agents get Read/Grep/Glob only
- Profile-gated hooks — minimal/standard/strict, each hook declares membership
- Dispatcher pattern — one hook entry fans out to many sub-hooks
- Session-start hook for context injection

**CI validation (adopt 4 patterns):**
- AJV schema validation for agents, hooks, skills
- Content pattern tests for required safety sections
- Export surface sync tests (manifest must match filesystem)
- Agent frontmatter validation against hard-coded model allowlist

**Testing (adopt patterns):**
- Hand-rolled test(name, fn) with process.exit — no framework
- spawnSync subprocess testing for hooks with injected env vars
- State directory injection for deterministic state testing

---

## deterministic agent model

Three layers compose to make agent behavior reproducible:

### layer 1: structural enforcement (can't go wrong)

| Mechanism | Source | Effect |
|---|---|---|
| Tool restrictions on agent roles | scaffold pattern | Planner physically cannot write files |
| GateGuard fact-forcing | scaffold pattern | First file touch requires proving investigation happened |
| Profile-gated hooks | scaffold pattern | Hooks fire based on env var profile, not runtime decisions |
| Named inter-agent file contracts | scaffold pattern | Agents communicate via specific file paths, not negotiation |
| `permissionDecision: deny` | scaffold pattern | Platform-level deny, not model-level refusal |

### layer 2: schema enforcement (wrong output is caught)

| Mechanism | Source | Effect |
|---|---|---|
| Uniform JSON envelope | ADT | All review agents produce identical schema |
| AJV validation in CI | scaffold pattern | Malformed agents fail before deployment |
| Schema-versioned output | scaffold pattern | Consumers pin to `schema_version` field |
| Export surface sync tests | scaffold pattern | Manifest divergence from filesystem caught in CI |
| unified-finding-v1.json | ADT | rule_id regex, POSIX paths, 1-indexed lines enforced |

### layer 3: behavioral enforcement (wrong process is caught)

| Mechanism | Source | Effect |
|---|---|---|
| Confidence-gated auto-fix | ADT | high=auto, medium=confirm, none=report-only |
| Skip conditions as predicates | ADT | Exact JSON return for inapplicable agents |
| Ignore lists | ADT | Agents cannot step on each other's scope |
| Hard numeric thresholds | ADT | Complexity <10, nesting <4, parameters <5 |
| "3 warnings = needs-revision" | ADT | Prevents death-by-papercuts |
| Convergence detection in fix loop | ADT | Same issues persist = exit loop |
| Hash-based gate files | ADT | `.review-passed` = sha256 of staged file list |
| Iron Law verification | ADT | No claims without fresh evidence |
| Pass^3 stability | scaffold pattern | Tests must pass 3 consecutive times |

---

## conformance system

### generation (template → plugin)

1. Read project profile (profiles/atlas.json)
2. Resolve install plan — side-effect-free, returns list of operations
3. Apply plan — idempotent, respects `_skip_if_exists` and `deep_merge`
4. Write install-state manifest — records every file, source, strategy
5. Validate — run AJV schemas, content pattern tests, export surface sync

### installation (plugin → project repo)

1. Copy/link generated plugin into project's `.claude/` or install via `claude plugin install`
2. Scaffold required repo structure (CLAUDE.md, AGENTS.md, directories)
3. Merge hooks into project settings.json (deep merge, never clobber)
4. Write conformance state to project

### drift detection (continuous)

| When | What | How |
|---|---|---|
| Session start | Quick health check | Hook checks 5-6 critical files exist and match |
| On demand | Full audit | `/audit` compares every file against install-state |
| CI pipeline | Conformance gate | `doctor --json` with `summary.errorCount > 0` = fail |

### repair (on drift)

1. Read install-state manifest
2. Compare against current filesystem
3. Regenerate only drifted files from template + profile
4. Respect `skip_if_exists` for user-modified files
5. Report: created / updated / skipped / protected / conflicted

### idempotency guarantees

| Operation | Guarantee |
|---|---|
| Generate with same profile + template | Produces identical output |
| Generate on already-generated plugin | All files report `skipped` |
| Install on already-installed project | Deep-merge adds new keys, preserves existing |
| Repair on clean project | All files report `skipped` |
| Doctor on clean project | All files report `ok` |

---

## repo structure (post-refactor)

```
dev-ai-utilities/
├── templates/                        # Core template (Jinja-style placeholders)
│   ├── agents/
│   │   ├── team/                     # 12 team agents
│   │   │   ├── orchestrator.md.j2
│   │   │   ├── software-engineer.md.j2
│   │   │   └── ...
│   │   └── review/                   # 10 specialist review agents
│   │       ├── complexity-review.md.j2
│   │       ├── naming-review.md.j2
│   │       ├── concurrency-review.md.j2
│   │       └── ...
│   ├── skills/                       # All skills with {{stack}} placeholders
│   ├── hooks/                        # All hooks
│   ├── knowledge/                    # Knowledge files + JSON schemas
│   ├── prompts/                      # Plan review personas + subagent templates
│   ├── commands/                     # Slash commands
│   ├── CLAUDE.md.j2                  # Template CLAUDE.md
│   └── plugin.json.j2               # Template manifest
├── profiles/                         # Project profile definitions
│   ├── schema.json                   # Profile JSON schema
│   ├── nuv.json
│   ├── aok-be.json
│   ├── aok-fe.json
│   ├── atlas.json
│   └── atlas-storage.json
├── generated/                        # Output: self-contained plugins
│   ├── nuv-superpowers/
│   ├── aok-be-superpowers/
│   ├── aok-fe-superpowers/
│   ├── atlas-superpowers/
│   └── atlas-storage-superpowers/
├── plugins/
│   └── atlas-infra-superpowers/      # Stays manual (domain-specific)
├── scripts/
│   ├── generate.js                   # Template → plugin generator
│   ├── doctor.js                     # Conformance checker
│   ├── repair.js                     # Auto-fix drifted files
│   ├── install.sh                    # Project installer (exists, enhance)
│   └── lib/                          # Shared utilities
│       ├── install-state.js          # State read/write/validate
│       ├── deep-merge.js             # JSON deep merge
│       ├── template-engine.js        # Jinja-style rendering
│       └── schema-validator.js       # AJV validation
├── schemas/                          # JSON schemas for validation
│   ├── profile.schema.json
│   ├── install-state.schema.json
│   ├── hooks.schema.json
│   ├── agent-frontmatter.schema.json
│   └── review-output.schema.json
├── hooks/                            # Core hook scripts (exist, enhance)
│   ├── run-with-flags.js             # Profile-gated hook runner
│   ├── gateguard.js                  # Investigation-before-action gate
│   ├── dispatcher.js                 # Single entry → fan-out to sub-hooks
│   └── ...
├── cursor-rules/                     # Exists, keep
├── tests/                            # Exists (159 bats), expand
│   ├── core_hooks/
│   ├── plugin_hooks/
│   ├── install/
│   ├── schemas/                      # NEW: schema validation tests
│   ├── templates/                    # NEW: template rendering tests
│   └── conformance/                  # NEW: doctor/repair tests
├── catalog/                          # Exists, keep
└── Makefile                          # Exists, enhance with generate/doctor/repair targets
```

---

## first steps

1. **Write the profile schema** — define what a profile.json contains (stack, language, orm, test_framework, concurrency_model, review_thresholds, etc.)
2. **Port the 10 review agents** (specialist review patterns from community plugin research) into templates/ with placeholders for stack-specific values
3. **Build the generator** — template engine that reads profile + templates and produces a self-contained plugin
4. **Build the doctor** — conformance checker that compares install-state against filesystem
5. **Port GateGuard** (investigation-before-action gate from scaffold pattern research) with light modifications
6. **Port the profile-gated hook runner** (from scaffold pattern research)
7. **Create the nuv profile** — nuv.json
8. **Generate plugins** and test them against their respective projects
9. **Add CI validation** — AJV schemas, content pattern tests, export surface sync
10. **Add bats tests** for new scripts (generator, doctor, repair)

---

## open questions

1. Should atlas-infra-superpowers also be templated, or is it different enough to stay manual?
2. Should we use Copier directly as the template engine, or build a lightweight one in JS (hand-rolled, like the scaffold pattern research showed)?
3. Should project-specific shared domain knowledge be incorporated as a template mixin, a separate knowledge directory, or baked into each profile?
4. What's the migration path for existing plugins? Generate fresh and diff, or adopt-in-place?
5. Should the eval system (315-fixture, pass@k scoring) observed in community plugin research be ported for testing agent quality?

---

## references

- [Copier docs — configuring templates](https://copier.readthedocs.io/en/stable/configuring/)
- [Copier docs — updating projects](https://copier.readthedocs.io/en/stable/updating/)
- [Backstage — writing templates](https://backstage.io/docs/features/software-templates/writing-templates/)
- [Backstage — descriptor format](https://backstage.io/docs/features/software-catalog/descriptor-format/)
- [Claude Code — plugins reference](https://code.claude.com/docs/en/plugins-reference)
- [SchemaStore — plugin manifest schema](https://www.schemastore.org/claude-code-plugin-manifest.json)
- [Praetorian — deterministic AI orchestration](https://www.praetorian.com/blog/deterministic-ai-orchestration-a-platform-architecture-for-autonomous-development/)
- [Schema-gated agentic workflows (arxiv:2603.06394)](https://arxiv.org/html/2603.06394v1)
- [LangGraph checkpoint-replay pattern](https://dev.to/sreeni5018/debugging-non-deterministic-llm-agents-implementing-checkpoint-based-state-replay-with-langgraph-5171)
- Community plugin B local clone (scaffold/conformance patterns)
- Community plugin A local clone (specialist review patterns)
- Dave Farley, *Modern Software Engineering* — Farley Score for test quality
