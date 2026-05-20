#!/usr/bin/env node
/**
 * dispatcher.js — Fan-out hook runner.
 *
 * Single entry point that receives a list of sub-hook script paths as CLI
 * arguments, runs each one with the same stdin, collects results, and returns
 * an aggregate exit code.
 *
 * Aggregation rules:
 *   - Any sub-hook that exits 2 (deny) → dispatcher exits 2 immediately
 *     after all hooks have run, forwarding that hook's stdout.
 *   - Sub-hooks that exit 1 (error/warning) are logged to stderr but do NOT
 *     block remaining sub-hooks.
 *   - All sub-hooks exit 0 → dispatcher exits 0.
 *
 * Usage:
 *   node dispatcher.js <subHook1> [subHook2] ...
 *
 * Environment variables:
 *   Passed through unchanged to each sub-hook.
 *
 * Exit codes:
 *   0 – all sub-hooks passed
 *   2 – at least one sub-hook denied the tool use
 *
 * @module templates/hooks/dispatcher
 */

import { spawnSync } from 'node:child_process'
import fs from 'node:fs'

// ---------------------------------------------------------------------------
// Bootstrap
// ---------------------------------------------------------------------------

const subHooks = process.argv.slice(2)

if (subHooks.length === 0) {
  process.stderr.write('dispatcher: no sub-hook paths provided\n')
  process.exit(0)
}

// ---------------------------------------------------------------------------
// Read stdin once; it will be piped to every sub-hook
// ---------------------------------------------------------------------------

/**
 * Read all of stdin as a buffer.
 *
 * @returns {Buffer}
 */
function readStdinBuffer() {
  try {
    return fs.readFileSync('/dev/stdin')
  } catch {
    return Buffer.alloc(0)
  }
}

const stdinBuffer = readStdinBuffer()

// ---------------------------------------------------------------------------
// Run sub-hooks
// ---------------------------------------------------------------------------

/**
 * @typedef {object} SubHookResult
 * @property {string} scriptPath
 * @property {number} exitCode
 * @property {string} stdout
 * @property {string} stderr
 */

/** @type {SubHookResult[]} */
const results = []

for (const scriptPath of subHooks) {
  const child = spawnSync('node', [scriptPath], {
    input: stdinBuffer,
    encoding: 'utf8',
    stdio: ['pipe', 'pipe', 'pipe'],
    env: process.env,
  })

  const exitCode = child.status ?? 1
  const stdout = child.stdout ?? ''
  const stderr = child.stderr ?? ''

  results.push({ scriptPath, exitCode, stdout, stderr })

  if (exitCode === 1) {
    // Non-fatal error: log and continue
    process.stderr.write(
      `dispatcher: sub-hook "${scriptPath}" exited 1 (non-fatal)\n` +
      (stdout ? `  stdout: ${stdout}\n` : '') +
      (stderr ? `  stderr: ${stderr}\n` : ''),
    )
  }
}

// ---------------------------------------------------------------------------
// Aggregate and emit
// ---------------------------------------------------------------------------

// Find the first deny result
const denyResult = results.find(r => r.exitCode === 2)

if (denyResult) {
  // Forward the denying hook's stdout so Claude Code sees the deny payload
  if (denyResult.stdout) process.stdout.write(denyResult.stdout)
  if (denyResult.stderr) process.stderr.write(denyResult.stderr)
  process.exit(2)
}

// All hooks passed (exit 0) or had non-fatal errors (exit 1 — already logged)
// Emit all passing stdout
for (const r of results) {
  if (r.exitCode === 0 && r.stdout) process.stdout.write(r.stdout)
}

process.exit(0)
