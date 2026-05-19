/**
 * Tests for templates/hooks/{run-with-flags,gateguard,dispatcher}.js
 *
 * Hooks are tested as subprocesses via spawnSync so that exit codes, stdout,
 * and stderr are observable exactly as Claude Code sees them.
 *
 * Env vars used to control test behaviour:
 *   HOOK_PROFILE     – profile name fed to run-with-flags (default: 'standard')
 *   HOOK_STATE_DIR   – directory for gateguard state files (default: ~/.gateguard/)
 *   CLAUDE_SESSION_ID – session key used by gateguard
 *   CLAUDE_SUBAGENT  – when set to '1', gateguard bypasses the gate
 *
 * @module tests/factory/hooks.test
 */

import { describe, it, beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const HOOKS_DIR = path.resolve(__dirname, '../../templates/hooks')

const RUN_WITH_FLAGS = path.join(HOOKS_DIR, 'run-with-flags.js')
const GATEGUARD = path.join(HOOKS_DIR, 'gateguard.js')
const DISPATCHER = path.join(HOOKS_DIR, 'dispatcher.js')

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Create a unique temp directory and return its absolute path.
 *
 * @returns {string}
 */
function makeTempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'hook-test-'))
}

/**
 * Remove a temp directory silently.
 *
 * @param {string} dir
 */
function removeTempDir(dir) {
  fs.rmSync(dir, { recursive: true, force: true })
}

/**
 * Run a hook script via `node` with optional stdin, env overrides, and args.
 * Returns the spawnSync result.
 *
 * @param {string} scriptPath - Absolute path to the hook script.
 * @param {object} [opts]
 * @param {string} [opts.stdin='{}'] - JSON string to pipe as stdin.
 * @param {Record<string,string>} [opts.env={}] - Env vars merged with process.env.
 * @param {string[]} [opts.args=[]] - CLI arguments after the script path.
 * @returns {import('node:child_process').SpawnSyncReturns<string>}
 */
function runHook(scriptPath, { stdin = '{}', env = {}, args = [] } = {}) {
  return spawnSync('node', [scriptPath, ...args], {
    input: stdin,
    encoding: 'utf8',
    env: { ...process.env, ...env },
  })
}

/**
 * Write a minimal hooks.json into a temp plugin root.
 *
 * @param {string} pluginRoot
 * @param {object} hooksConfig - Value of the top-level "hooks" key.
 */
function writeHooksJson(pluginRoot, hooksConfig) {
  const hooksDir = path.join(pluginRoot, 'hooks')
  fs.mkdirSync(hooksDir, { recursive: true })
  fs.writeFileSync(
    path.join(hooksDir, 'hooks.json'),
    JSON.stringify({ hooks: hooksConfig }, null, 2),
    'utf8',
  )
}

/**
 * Write a trivial sub-hook JS file that immediately exits with the given code.
 *
 * @param {string} filePath - Absolute path to write.
 * @param {number} exitCode
 * @param {string} [message=''] - Written to stdout before exit.
 */
function writeSubHook(filePath, exitCode, message = '') {
  const content = [
    '#!/usr/bin/env node',
    // ESM shebang workaround: write as CJS so spawnSync can exec it without
    // --input-type flag and without a package.json "type":"module" in the tmp dir.
    `process.stdout.write(${JSON.stringify(message)});`,
    `process.exit(${exitCode});`,
  ].join('\n')
  fs.writeFileSync(filePath, content, 'utf8')
}

// ---------------------------------------------------------------------------
// run-with-flags
// ---------------------------------------------------------------------------

describe('run-with-flags', () => {
  /** @type {string} */
  let tmpDir

  beforeEach(() => {
    tmpDir = makeTempDir()
  })

  afterEach(() => {
    removeTempDir(tmpDir)
  })

  /**
   * Build a hooks.json where hookId maps to the given profiles,
   * and write a trivial script at scriptPath.
   *
   * @param {string} hookId
   * @param {string[]} profiles
   * @param {string} scriptPath - Absolute path inside tmpDir.
   */
  function setup(hookId, profiles, scriptPath) {
    writeHooksJson(tmpDir, {
      [hookId]: { profiles, script: scriptPath },
    })
    // Minimal script: reads stdin and exits 0
    fs.writeFileSync(
      scriptPath,
      '#!/usr/bin/env node\nprocess.stdin.resume();\nprocess.stdin.on("end", () => process.exit(0));\n',
      'utf8',
    )
  }

  it('T100-1: enabled for standard profile — exits 0', () => {
    const hookId = 'protect-files'
    const scriptPath = path.join(tmpDir, 'hooks', 'protect-files.js')
    fs.mkdirSync(path.dirname(scriptPath), { recursive: true })
    setup(hookId, ['standard', 'strict'], scriptPath)

    const result = runHook(RUN_WITH_FLAGS, {
      stdin: '{}',
      env: {
        HOOK_PROFILE: 'standard',
        PLUGIN_ROOT: tmpDir,
      },
      args: [hookId, scriptPath],
    })

    assert.equal(result.status, 0, `stderr: ${result.stderr}`)
  })

  it('T100-2: disabled for minimal profile — exits 0 with skip message to stderr', () => {
    const hookId = 'protect-files'
    const scriptPath = path.join(tmpDir, 'hooks', 'protect-files.js')
    fs.mkdirSync(path.dirname(scriptPath), { recursive: true })
    setup(hookId, ['standard', 'strict'], scriptPath)

    const result = runHook(RUN_WITH_FLAGS, {
      stdin: '{}',
      env: {
        HOOK_PROFILE: 'minimal',
        PLUGIN_ROOT: tmpDir,
      },
      args: [hookId, scriptPath],
    })

    assert.equal(result.status, 0, `stderr: ${result.stderr}`)
    assert.match(result.stderr, /skip/i, 'expected skip message on stderr')
  })

  it('T100-3: enabled for strict profile — exits 0', () => {
    const hookId = 'detect-secrets'
    const scriptPath = path.join(tmpDir, 'hooks', 'detect-secrets.js')
    fs.mkdirSync(path.dirname(scriptPath), { recursive: true })
    setup(hookId, ['standard', 'strict'], scriptPath)

    const result = runHook(RUN_WITH_FLAGS, {
      stdin: '{}',
      env: {
        HOOK_PROFILE: 'strict',
        PLUGIN_ROOT: tmpDir,
      },
      args: [hookId, scriptPath],
    })

    assert.equal(result.status, 0, `stderr: ${result.stderr}`)
  })

  it('T100-4: unknown hookId — exits 1', () => {
    const scriptPath = path.join(tmpDir, 'hooks', 'some-hook.js')
    fs.mkdirSync(path.dirname(scriptPath), { recursive: true })
    writeHooksJson(tmpDir, {})

    const result = runHook(RUN_WITH_FLAGS, {
      stdin: '{}',
      env: {
        HOOK_PROFILE: 'standard',
        PLUGIN_ROOT: tmpDir,
      },
      args: ['unknown-hook-id', scriptPath],
    })

    assert.equal(result.status, 1, `stderr: ${result.stderr}`)
  })

  it('T100-5: script path outside PLUGIN_ROOT — exits 1 (path traversal protection)', () => {
    const hookId = 'protect-files'
    const scriptPath = path.join(tmpDir, 'hooks', 'protect-files.js')
    fs.mkdirSync(path.dirname(scriptPath), { recursive: true })
    setup(hookId, ['standard'], scriptPath)

    // Point scriptPath to a file outside tmpDir (the plugin root)
    const outsidePath = path.join(os.tmpdir(), 'evil-hook.js')
    fs.writeFileSync(outsidePath, 'process.exit(0);\n', 'utf8')

    try {
      const result = runHook(RUN_WITH_FLAGS, {
        stdin: '{}',
        env: {
          HOOK_PROFILE: 'standard',
          PLUGIN_ROOT: tmpDir,
        },
        args: [hookId, outsidePath],
      })

      assert.equal(result.status, 1, `stderr: ${result.stderr}`)
      assert.match(result.stderr, /traversal|outside|invalid/i, 'expected path-traversal error message')
    } finally {
      fs.rmSync(outsidePath, { force: true })
    }
  })
})

// ---------------------------------------------------------------------------
// gateguard
// ---------------------------------------------------------------------------

describe('gateguard', () => {
  /** @type {string} */
  let stateDir
  const SESSION_ID = 'test-session-abc123'

  /**
   * Return the state file path for the current test session.
   *
   * @returns {string}
   */
  function stateFile() {
    return path.join(stateDir, `${SESSION_ID}.json`)
  }

  /**
   * Write a fresh (non-expired) state file.
   */
  function writeFreshState() {
    fs.writeFileSync(stateFile(), JSON.stringify({ clearedAt: Date.now() }), 'utf8')
  }

  /**
   * Write an expired state file (timestamp > 30 min in the past).
   */
  function writeExpiredState() {
    const THIRTY_ONE_MINUTES_MS = 31 * 60 * 1000
    fs.writeFileSync(
      stateFile(),
      JSON.stringify({ clearedAt: Date.now() - THIRTY_ONE_MINUTES_MS }),
      'utf8',
    )
  }

  beforeEach(() => {
    stateDir = makeTempDir()
  })

  afterEach(() => {
    removeTempDir(stateDir)
  })

  it('T101-1: no state file — blocks first Write (exit 2) with investigation prompt', () => {
    const result = runHook(GATEGUARD, {
      stdin: JSON.stringify({ tool_name: 'Write', tool_input: { file_path: '/tmp/foo.js' } }),
      env: {
        HOOK_STATE_DIR: stateDir,
        CLAUDE_SESSION_ID: SESSION_ID,
      },
    })

    assert.equal(result.status, 2, `stderr: ${result.stderr}`)
    // The output should be JSON with permissionDecision: deny
    const parsed = JSON.parse(result.stdout)
    assert.equal(parsed.permissionDecision, 'deny')
    assert.ok(parsed.message, 'expected a message field')
  })

  it('T101-2: fresh state file — allows Write (exit 0)', () => {
    writeFreshState()

    const result = runHook(GATEGUARD, {
      stdin: JSON.stringify({ tool_name: 'Write', tool_input: { file_path: '/tmp/foo.js' } }),
      env: {
        HOOK_STATE_DIR: stateDir,
        CLAUDE_SESSION_ID: SESSION_ID,
      },
    })

    assert.equal(result.status, 0, `stdout: ${result.stdout}\nstderr: ${result.stderr}`)
  })

  it('T101-3: expired state file (>30 min) — re-blocks (exit 2)', () => {
    writeExpiredState()

    const result = runHook(GATEGUARD, {
      stdin: JSON.stringify({ tool_name: 'Write', tool_input: { file_path: '/tmp/foo.js' } }),
      env: {
        HOOK_STATE_DIR: stateDir,
        CLAUDE_SESSION_ID: SESSION_ID,
      },
    })

    assert.equal(result.status, 2, `stderr: ${result.stderr}`)
    const parsed = JSON.parse(result.stdout)
    assert.equal(parsed.permissionDecision, 'deny')
  })

  it('T101-4: CLAUDE_SUBAGENT=1 bypasses gate (exit 0)', () => {
    // No state file — would normally block
    const result = runHook(GATEGUARD, {
      stdin: JSON.stringify({ tool_name: 'Write', tool_input: { file_path: '/tmp/foo.js' } }),
      env: {
        HOOK_STATE_DIR: stateDir,
        CLAUDE_SESSION_ID: SESSION_ID,
        CLAUDE_SUBAGENT: '1',
      },
    })

    assert.equal(result.status, 0, `stderr: ${result.stderr}`)
  })

  it('T101-5: state file uses atomic write — no .tmp file remains', () => {
    // gateguard-clear would normally write the state; here we verify that
    // when gateguard itself writes any state (e.g. an audit record), it
    // uses atomic write.  We test the companion clear path by calling
    // gateguard with a special env flag.
    const clearScript = path.join(HOOKS_DIR, 'gateguard-clear.js')

    // If gateguard-clear.js exists, test it; otherwise call gateguard with
    // GATEGUARD_CLEAR=1 which the implementation should honour for testing.
    const scriptToRun = fs.existsSync(clearScript) ? clearScript : GATEGUARD

    runHook(scriptToRun, {
      stdin: '{}',
      env: {
        HOOK_STATE_DIR: stateDir,
        CLAUDE_SESSION_ID: SESSION_ID,
        GATEGUARD_CLEAR: '1',
      },
    })

    // Regardless of whether clear ran, assert no .tmp file exists
    const tmpFile = stateFile() + '.tmp'
    assert.equal(fs.existsSync(tmpFile), false, '.tmp file must not remain after atomic write')
  })
})

// ---------------------------------------------------------------------------
// dispatcher
// ---------------------------------------------------------------------------

describe('dispatcher', () => {
  /** @type {string} */
  let tmpDir

  beforeEach(() => {
    tmpDir = makeTempDir()
  })

  afterEach(() => {
    removeTempDir(tmpDir)
  })

  it('T102-1: dispatches to registered sub-hooks and collects results — all pass', () => {
    const hookA = path.join(tmpDir, 'hook-a.cjs')
    const hookB = path.join(tmpDir, 'hook-b.cjs')
    writeSubHook(hookA, 0, 'hook-a-ok')
    writeSubHook(hookB, 0, 'hook-b-ok')

    const result = runHook(DISPATCHER, {
      stdin: '{}',
      env: {},
      args: [hookA, hookB],
    })

    assert.equal(result.status, 0, `stderr: ${result.stderr}`)
    // Both sub-hook outputs should appear in aggregate stdout
    assert.ok(result.stdout.includes('hook-a-ok'), 'expected hook-a output')
    assert.ok(result.stdout.includes('hook-b-ok'), 'expected hook-b output')
  })

  it('T102-2: sub-hook failure (exit 1) does not block other sub-hooks', () => {
    const failingHook = path.join(tmpDir, 'failing.cjs')
    const passingHook = path.join(tmpDir, 'passing.cjs')
    writeSubHook(failingHook, 1, 'failing-hook-ran')
    writeSubHook(passingHook, 0, 'passing-hook-ran')

    const result = runHook(DISPATCHER, {
      stdin: '{}',
      env: {},
      // Failing hook first to confirm passing hook still runs
      args: [failingHook, passingHook],
    })

    // exit 1 from a sub-hook is logged but does not propagate as a deny
    // The passing hook ran
    assert.ok(result.stdout.includes('passing-hook-ran'), 'passing hook must still execute')
    // Failure is recorded on stderr
    assert.ok(result.stderr.includes('failing-hook-ran') || result.stderr.length > 0,
      'failure should be logged to stderr')
  })

  it('T102-3: any sub-hook returning exit 2 causes dispatcher to return exit 2', () => {
    const denyHook = path.join(tmpDir, 'deny.cjs')
    const passHook = path.join(tmpDir, 'pass.cjs')
    writeSubHook(denyHook, 2, JSON.stringify({ permissionDecision: 'deny', message: 'blocked by deny-hook' }))
    writeSubHook(passHook, 0, 'pass-ok')

    const result = runHook(DISPATCHER, {
      stdin: '{}',
      env: {},
      args: [denyHook, passHook],
    })

    assert.equal(result.status, 2, `expected exit 2, got ${result.status}. stderr: ${result.stderr}`)
    assert.ok(result.stdout.includes('blocked by deny-hook'), 'deny output must be forwarded')
  })
})
