# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Purpose

Domain-specific plugin bundles. Each subdirectory is a self-contained Claude Code plugin with its own agents, hooks, and optionally skills and commands.

## Plugins

| Plugin | Directory | Description |
|--------|-----------|-------------|
| nuv-superpowers | nuv/ | NUVCard SaaS — Deno, Hono, HTMX, TypeScript |

## Plugin Structure

Each plugin follows the same layout:
```
plugins/<name>/
├── .claude-plugin/plugin.json   # Plugin metadata
├── agents/                       # Domain-specific agents
├── skills/                       # Domain-specific skills (optional)
├── commands/                     # Domain-specific commands (optional)
└── hooks/
    ├── hooks.json                # Hook configuration
    └── *.sh                      # Hook scripts
```

## Adding a New Plugin

1. Create the directory structure above
2. Add plugin.json with name, description, version, author
3. Register in `.claude-plugin/marketplace.json` at repo root
4. Create a profile in `profiles/` that includes the new plugin
