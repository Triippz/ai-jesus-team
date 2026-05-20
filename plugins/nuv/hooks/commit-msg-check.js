#!/usr/bin/env node
/**
 * commit-msg-check.js — Enforce commit message format and block AI attribution.
 *
 * Validates that git commit -m messages follow the type: description format
 * and do not contain AI tool references or Co-Authored-By AI lines.
 *
 * Input: JSON on stdin with shape { tool_input: { command: string } }
 *
 * Exit codes:
 *   0 – commit message is valid (or not a git commit command)
 *   2 – commit message violates rules (denied)
 *
 * @module templates/hooks/commit-msg-check
 */

import fs from 'node:fs'

let input = {}
try {
  const raw = fs.readFileSync('/dev/stdin', 'utf8')
  input = JSON.parse(raw)
} catch { /* stdin may be empty or non-JSON in tests */ }

const command = input?.tool_input?.command ?? ''

if (!command) {
  process.exit(0)
}

// Only check git commit commands with -m flag
if (!/git\s+commit.*-m/.test(command)) {
  process.exit(0)
}

// Extract commit message from -m "msg" or -m 'msg'
const msgMatch = command.match(/-m\s*["']([^"']*)["']/)
const commitMsg = msgMatch?.[1] ?? ''

if (!commitMsg) {
  process.exit(0)
}

const AI_TOOLS_RE = /\b(claude|anthropic|copilot|gpt|openai|cursor|gemini)\b/i
const CO_AUTHORED_AI_RE = /co-authored-by.*\b(claude|anthropic|copilot|gpt|openai|cursor|gemini)\b/i
const AI_EMAIL_RE = /noreply@anthropic\.com/i
const ALLOWED_TYPES = 'feat|fix|docs|refactor|test|perf|build|ci|chore'
const FORMAT_RE = new RegExp(`^(${ALLOWED_TYPES})(\\(.+\\))?\\s*:\\s*.+`)

// Check for AI attribution in message
if (AI_TOOLS_RE.test(commitMsg)) {
  process.stderr.write('BLOCKED: Commit messages must not contain AI tool references. Remove all AI references.\n')
  process.exit(2)
}

// Check for Co-Authored-By AI lines in full command
if (CO_AUTHORED_AI_RE.test(command)) {
  process.stderr.write('BLOCKED: Commit must not contain Co-Authored-By AI attribution. Remove the Co-Authored-By line.\n')
  process.exit(2)
}

// Check for AI email addresses
if (AI_EMAIL_RE.test(command)) {
  process.stderr.write('BLOCKED: Commit must not contain AI email addresses.\n')
  process.exit(2)
}

// Check format
if (!FORMAT_RE.test(commitMsg)) {
  process.stderr.write(
    `BLOCKED: Commit message must follow format 'type: [scope] description'. ` +
    `Allowed types: ${ALLOWED_TYPES.replace(/\|/g, ', ')}. ` +
    `Example: 'feat: add user authentication'\n`,
  )
  process.exit(2)
}

process.exit(0)
