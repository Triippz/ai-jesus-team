# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Purpose

Centralized Cursor IDE rule sets. The installer syncs these to target repos based on profile configuration.

## Rule Sets

| Directory | Scope | Rules |
|-----------|-------|-------|
| shared/ | All repos | Git workflow, code quality, AI interaction, security |
| shared-flutter/ | Flutter repos | Architecture, state management, testing, Dart conventions |

Additional rule sets are added per project as needed.

## Profile Mapping

| Profile | Rule Sets Synced |
|---------|-----------------|
| nuv | shared |

## File Format

Cursor rules use `.mdc` format with YAML frontmatter:
```yaml
---
description: What this rule enforces
globs: optional file patterns
alwaysApply: true
---
```

## Syncing

Rules are synced to target repos by `scripts/sync-cursor-rules.sh`. The installer calls this automatically. Existing rules are backed up with timestamps before syncing.
