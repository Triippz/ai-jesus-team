---
name: orient
description: Quick codebase orientation — maps modules, callers, dependencies, and boundaries using the project's domain vocabulary
---

# Orient Skill

Go up a layer of abstraction. Give a map of the relevant area — modules, responsibilities, how they connect, who calls whom.

**Skill Type: Flexible** — Scope and depth depend on what the user asks about.

## Activation

User passes an area or topic as an argument, or asks about a specific module/feature.
If no argument given, orient around the top-level entry points of the project.

Confirm activation with a single line: `Orienting around: <area>.`

## Process

### 1. Read Project Vocabulary

Before mapping, check for:
- `CONTEXT.md` — domain glossary, bounded contexts, ubiquitous language
- `README.md` — top-level overview
- `CLAUDE.md` — project conventions and structure notes
- `docs/` — any architecture docs or ADRs

Use the project's own terms throughout the map. Do not invent generic names for things that have domain names.

### 2. Walk the Codebase

Use the Explore subagent or filesystem tools to:
- Locate modules/packages/directories relevant to the requested area
- Identify entry points (main, index, router, controller, handler, CLI entrypoint)
- Trace dependency direction: who imports whom, who calls whom
- Find seams and boundaries: where does one module hand off to another?
- Note external dependencies (third-party libs, services, APIs) at the boundary

Focus on the AREA asked about. Do not map the entire codebase unless the user asks for a full overview.

### 3. Present the Map

Output format: bullet-tree or table — never prose paragraphs.

#### Bullet-tree format (default)

```
<Area>
├── <Module A> — <one-line responsibility>
│   ├── calls: <Module B>, <External Service>
│   └── called by: <Entry Point>
├── <Module B> — <one-line responsibility>
│   ├── calls: <Module C>
│   └── called by: <Module A>
└── <Module C> — <one-line responsibility>
    └── called by: <Module B>
```

#### Table format (use for flat or wide structures)

| Module | Responsibility | Calls | Called By |
|---|---|---|---|
| ModuleA | ... | ModuleB | EntryPoint |

### 4. Highlight Key Facts

After the map, add a short section (bullets only) covering:

- **Entry points** — where execution or data flow begins
- **Seams** — boundaries between major areas (good places to test or swap implementations)
- **Hot paths** — the most-called routes through the area
- **External dependencies** — third-party or cross-service calls and where they happen

### 5. Offer to Drill Down

End with one line: `Drill into any module?` — do not elaborate.

## Rules

- Use domain vocabulary from the project, not generic CS terms
- Bullet-tree or table only — no prose paragraphs in the map
- Show dependency direction explicitly (calls / called by)
- Scope to the area asked — resist the urge to map everything
- If a module's purpose is unclear from structure, read one file to confirm before naming its responsibility
- Keep responsibilities to one line — if it takes more, the module does too much (note that, do not paper over it)
