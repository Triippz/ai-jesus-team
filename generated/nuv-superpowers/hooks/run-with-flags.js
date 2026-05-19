#!/usr/bin/env node
/**
 * run-with-flags.js — Profile-gated hook runner.
 *
 * Entry point for all plugin hooks. Reads `hooks.json` to determine whether
 * the requested hook should run under the current profile, validates the
 * script path against the plugin root to prevent path traversal, then either
 * calls the script in-process (if it exports `module.exports.run`) or
 * spawns it as a child process.
 *
 * Usage:
 *   node run-with-flags.js <hookId> <scriptPath>
 *
 * Environment variables:
 *   HOOK_PROFILE   – active profile name (default: 'standard')
 *   PLUGIN_ROOT    – absolute path to the plugin root directory
 *
 * Exit codes:
 *   0 – hook ran successfully (or was skipped for this profile)
 *   1 – configuration error (unknown hookId, path traversal attempt, etc.)
 *   2 – hook explicitly denied the tool use (forwarded from child)
 *
 * @module templates/hooks/run-with-flags
 */

import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'

// ---------------------------------------------------------------------------
// Bootstrap
// ---------------------------------------------------------------------------

const [hookId, scriptPath] = process.argv.slice(2)

if (!hookId || !scriptPath) {
  process.stderr.write('run-with-flags: usage: run-with-flags.js <hookId> <scriptPath>\n')
  process.exit(1)
}

const profile = process.env.HOOK_PROFILE ?? 'standard'
const pluginRoot = process.env.PLUGIN_ROOT ?? inferPluginRoot()

/**
 * Walk up from this script's directory to find a directory that contains a
 * `hooks/hooks.json` file. Falls back to `process.cwd()`.
 *
 * @returns {string}
 */
function inferPluginRoot() {
  const scriptDir = path.dirname(fileURLToPath(import.meta.url))
  let dir = scriptDir
  for (let i = 0; i < 5; i++) {
    if (fs.existsSync(path.join(dir, 'hooks', 'hooks.json'))) return dir
    const parent = path.dirname(dir)
    if (parent === dir) break
    dir = parent
  }
  return process.cwd()
}

// ---------------------------------------------------------------------------
// Load hooks.json
// ---------------------------------------------------------------------------

const hooksJsonPath = path.join(pluginRoot, 'hooks', 'hooks.json')

if (!fs.existsSync(hooksJsonPath)) {
  process.stderr.write(`run-with-flags: hooks.json not found at ${hooksJsonPath}\n`)
  process.exit(1)
}

/** @type {{ hooks: Record<string, { profiles: string[], script?: string }> }} */
let hooksConfig
try {
  hooksConfig = JSON.parse(fs.readFileSync(hooksJsonPath, 'utf8'))
} catch (err) {
  process.stderr.write(`run-with-flags: failed to parse hooks.json: ${err.message}\n`)
  process.exit(1)
}

// ---------------------------------------------------------------------------
// Validate hookId
// ---------------------------------------------------------------------------

const hookDef = hooksConfig?.hooks?.[hookId]
if (!hookDef) {
  process.stderr.write(`run-with-flags: unknown hookId "${hookId}"\n`)
  process.exit(1)
}

// ---------------------------------------------------------------------------
// Profile gate
// ---------------------------------------------------------------------------

const profiles = Array.isArray(hookDef.profiles) ? hookDef.profiles : []
if (!profiles.includes(profile)) {
  process.stderr.write(
    `run-with-flags: skip — hook "${hookId}" is not enabled for profile "${profile}" ` +
    `(enabled profiles: ${profiles.join(', ') || 'none'})\n`,
  )
  process.exit(0)
}

// ---------------------------------------------------------------------------
// Path traversal protection
// ---------------------------------------------------------------------------

/**
 * Resolve a path and verify it is contained within an allowed root.
 *
 * @param {string} targetPath
 * @param {string} allowedRoot
 * @returns {boolean}
 */
function isWithinRoot(targetPath, allowedRoot) {
  const resolvedTarget = path.resolve(targetPath)
  const resolvedRoot = path.resolve(allowedRoot)
  // Must start with root + separator (or equal root exactly)
  return resolvedTarget === resolvedRoot ||
    resolvedTarget.startsWith(resolvedRoot + path.sep)
}

if (!isWithinRoot(scriptPath, pluginRoot)) {
  process.stderr.write(
    `run-with-flags: invalid script path — "${scriptPath}" is outside PLUGIN_ROOT "${pluginRoot}". ` +
    `Path traversal protection rejected this request.\n`,
  )
  process.exit(1)
}

// ---------------------------------------------------------------------------
// Read stdin (hook input)
// ---------------------------------------------------------------------------

/**
 * Read all of stdin synchronously.
 *
 * @returns {string}
 */
function readStdin() {
  try {
    const buf = fs.readFileSync('/dev/stdin')
    return buf.toString('utf8')
  } catch {
    return ''
  }
}

const stdinData = readStdin()

// ---------------------------------------------------------------------------
// Execute the hook script
// ---------------------------------------------------------------------------

/**
 * Attempt to call the script in-process if it exports a `run` function.
 * This avoids a second Node.js startup cost for JS hooks.
 *
 * @param {string} resolvedPath - Absolute path to the script.
 * @returns {boolean} true if in-process execution was attempted.
 */
async function tryInProcess(resolvedPath) {
  // Only attempt for .js files in the same process
  if (!resolvedPath.endsWith('.js') && !resolvedPath.endsWith('.mjs')) return false

  try {
    const require = createRequire(import.meta.url)
    // Try CJS require first (most hooks are CJS-compatible)
    let mod
    try {
      mod = require(resolvedPath)
    } catch {
      // Fall through to ESM dynamic import
      mod = await import(resolvedPath)
    }

    if (typeof mod?.run === 'function') {
      const result = await mod.run({ stdin: stdinData, profile, pluginRoot })
      const exitCode = typeof result?.exitCode === 'number' ? result.exitCode : 0
      if (result?.stdout) process.stdout.write(result.stdout)
      if (result?.stderr) process.stderr.write(result.stderr)
      process.exit(exitCode)
      return true
    }
  } catch {
    // Script doesn't support in-process execution; fall through to spawnSync
  }
  return false
}

// Try in-process first; if it returns false (not supported), spawn
const inProcessAttempt = await tryInProcess(path.resolve(scriptPath))

if (!inProcessAttempt) {
  const child = spawnSync('node', [path.resolve(scriptPath)], {
    input: stdinData,
    encoding: 'utf8',
    stdio: ['pipe', 'pipe', 'pipe'],
  })

  if (child.stdout) process.stdout.write(child.stdout)
  if (child.stderr) process.stderr.write(child.stderr)

  process.exit(child.status ?? 1)
}
