# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Purpose

Utility scripts used by the installer and for manual operations.

## Scripts

| Script | Purpose |
|--------|---------|
| sync-cursor-rules.sh | Sync cursor rule sets from this repo to a target repo's .cursor/rules/ |

## sync-cursor-rules.sh

Usage: `scripts/sync-cursor-rules.sh <target_repo> <rule_dir1> [rule_dir2] ...`

- Backs up existing `.cursor/rules/` in target repo with timestamp
- Copies `.mdc` files from each specified cursor-rules subdirectory
- Skips files that are already identical (idempotent)
- Reports sync counts
