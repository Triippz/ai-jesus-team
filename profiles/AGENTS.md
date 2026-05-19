# AGENTS.md

This file provides guidance to AI coding agents when working with code in this repository.

## Purpose

Installation profiles that declare which plugins and cursor rules to install for a target project.

## Profiles

| Profile | File | Plugins | Cursor Rules |
|---------|------|---------|--------------|
| nuv | nuv.json | core-superpowers, nuv-superpowers | shared |

## Schema

Profile files follow the schema defined in `profile-schema.json`:
- `name` — profile identifier
- `description` — human-readable description
- `plugins` — array of plugin names (always includes core-superpowers)
- `cursor_rules` — array of cursor-rules subdirectory names
- `target_repo` — optional target path for backward compatibility with custom profiles. If omitted, `--target` flag or interactive prompt is required.

## Adding a New Profile

1. Create `profiles/<name>.json` following the schema
2. Ensure the referenced plugins exist in `plugins/` or at repo root
3. Ensure the referenced cursor_rules directories exist in `cursor-rules/`
4. Test: `./install.sh --profile <name> --dry-run`
