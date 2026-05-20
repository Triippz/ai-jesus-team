#!/usr/bin/env node
/**
 * gateguard.js — Investigation-before-action gate.
 *
 * Blocks the first file-write tool use per session until a valid state file
 * exists that proves the agent has investigated the codebase. The state file
 * is written by `gateguard-clear.js` (or by supplying `GATEGUARD_CLEAR=1`
 * for testing).
 *
 * How it works in a live session:
 *   1. Agent attempts Write/Edit.
 *   2. This hook fires, finds no state file → exits 2 (deny) with a JSON
 *      message asking the agent to list importers, public API surface, data
 *      schemas, and quote the user instruction.
 *   3. Agent reads files and gathers evidence.
 *   4. A subsequent SessionStart or manual invocation of gateguard-clear.js
 *      writes the state file.
 *   5. Agent retries the Write → this hook finds a fresh state file → exits 0.
 *
 * Environment variables:
 *   HOOK_STATE_DIR    – directory for state files (default: ~/.gateguard/)
 *   CLAUDE_SESSION_ID – session key for the state file name
 *   CLAUDE_SUBAGENT   – when '1', bypasses gate entirely
 *   GATEGUARD_CLEAR   – when '1', writes a fresh state file and exits 0
 *                       (used by tests and gateguard-clear.js)
 *
 * Exit codes:
 *   0 – gate is clear, tool use is allowed
 *   2 – gate is active, tool use is denied
 *
 * State file format:
 *   { "clearedAt": <unix-ms timestamp> }
 *
 * @module templates/hooks/gateguard
 */

import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const GATE_TTL_MS = 30 * 60 * 1000 // 30 minutes

const stateDir = process.env.HOOK_STATE_DIR ?? path.join(os.homedir(), '.gateguard')
const sessionId = process.env.CLAUDE_SESSION_ID ?? 'default'
const isSubagent = process.env.CLAUDE_SUBAGENT === '1'
const isClearRequest = process.env.GATEGUARD_CLEAR === '1'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Return the absolute path to this session's state file.
 *
 * @returns {string}
 */
function stateFilePath() {
  return path.join(stateDir, `${sessionId}.json`)
}

/**
 * Atomically write the state file so no partial reads are possible.
 * Writes to a `.tmp` sibling first, then renames it into place.
 *
 * @param {object} data - Object to serialise as JSON.
 */
function writeStateAtomic(data) {
  fs.mkdirSync(stateDir, { recursive: true })
  const target = stateFilePath()
  const tmp = target + '.tmp'
  try {
    fs.writeFileSync(tmp, JSON.stringify(data), 'utf8')
    fs.renameSync(tmp, target)
  } catch (err) {
    // Clean up orphaned .tmp on failure
    try { fs.unlinkSync(tmp) } catch { /* ignore */ }
    throw err
  }
}

/**
 * Read the state file and return its parsed contents, or null if absent /
 * malformed.
 *
 * @returns {{ clearedAt: number } | null}
 */
function readState() {
  const filePath = stateFilePath()
  if (!fs.existsSync(filePath)) return null
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'))
  } catch {
    return null
  }
}

/**
 * Build the deny JSON payload that Claude Code reads from stdout.
 *
 * @param {string} filePath - The file path the agent wanted to write.
 * @returns {string} JSON string.
 */
function buildDenyPayload(filePath) {
  const message = [
    `Before writing "${filePath}", please investigate first:`,
    '',
    '1. List every module that imports this file (run: grep -r "<filename>" --include="*.js" --include="*.ts" -l).',
    '2. Describe the public API surface of the file (exported functions/classes/constants).',
    '3. Identify any data schemas or interfaces that the file owns or depends on.',
    '4. Quote the exact user instruction that prompted this write.',
    '',
    'Once you have gathered this evidence, call gateguard-clear.js (or set GATEGUARD_CLEAR=1) to open the gate, then retry the write.',
  ].join('\n')

  return JSON.stringify({ permissionDecision: 'deny', message })
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

// Support the clear operation (used by gateguard-clear.js and tests)
if (isClearRequest) {
  writeStateAtomic({ clearedAt: Date.now() })
  process.exit(0)
}

// Subagents bypass the gate — they operate under human oversight via the
// dispatching agent.
if (isSubagent) {
  process.exit(0)
}

// Read the tool input from stdin to extract the target file path
let toolInput = {}
try {
  const raw = fs.readFileSync('/dev/stdin', 'utf8')
  toolInput = JSON.parse(raw)
} catch { /* stdin may be empty or non-JSON in tests */ }

const filePath = toolInput?.tool_input?.file_path ?? '(unknown)'

// Check gate state
const state = readState()

if (state !== null) {
  const age = Date.now() - (state.clearedAt ?? 0)
  if (age < GATE_TTL_MS) {
    // Gate is clear and not yet expired
    process.exit(0)
  }
  // Expired — fall through to deny
}

// Gate is active: deny the tool use
process.stdout.write(buildDenyPayload(filePath))
process.exit(2)
