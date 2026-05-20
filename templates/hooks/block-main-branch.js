#!/usr/bin/env node
/**
 * block-main-branch.js — Block commits/pushes to main/master.
 *
 * Denies git commit and git push operations that target the main or master
 * branch unless explicitly overridden via ALLOW_MAIN_BRANCH_COMMIT=1.
 *
 * Input: JSON on stdin with shape { tool_input: { command: string }, cwd: string }
 *
 * Exit codes:
 *   0 – command is allowed
 *   2 – command targets main/master (denied)
 *
 * @module templates/hooks/block-main-branch
 */

import fs from 'node:fs'
import { execFileSync } from 'node:child_process'

let input = {}
try {
  const raw = fs.readFileSync('/dev/stdin', 'utf8')
  input = JSON.parse(raw)
} catch { /* stdin may be empty or non-JSON in tests */ }

const command = input?.tool_input?.command ?? ''
const cwd = input?.cwd ?? process.cwd()

if (!command) {
  process.exit(0)
}

// Only inspect git commit/push commands
if (!/(?:^|[;&|]|\s)git\s+(commit|push)\b/.test(command)) {
  process.exit(0)
}

// User-approved bypass
if (process.env.ALLOW_MAIN_BRANCH_COMMIT === '1') {
  process.exit(0)
}

function block(reason) {
  process.stderr.write([
    `BLOCKED: ${reason}`,
    'Main/master commits and pushes require explicit user permission.',
    'Options:',
    '  1. Create a feature branch: git checkout -b feat/<topic>',
    '  2. After confirming with the user, re-run with ALLOW_MAIN_BRANCH_COMMIT=1 prefixed.',
  ].join('\n') + '\n')
  process.exit(2)
}

// Explicit push to main/master by name
if (/git\s+push\s+\S+\s+(HEAD:)?(main|master)(\b|:)/.test(command)) {
  block('pushing to main/master.')
}

// Current-branch check
try {
  const branch = execFileSync('git', ['symbolic-ref', '--short', 'HEAD'], {
    cwd,
    encoding: 'utf8',
    stdio: ['pipe', 'pipe', 'pipe'],
  }).trim()

  if (branch === 'main' || branch === 'master') {
    if (/git\s+commit\b/.test(command)) {
      block(`committing directly to ${branch}.`)
    }
    if (/git\s+push\b/.test(command)) {
      block(`pushing from ${branch}.`)
    }
  }
} catch {
  // Not in a git repo or detached HEAD — allow
}

process.exit(0)
