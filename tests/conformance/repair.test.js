/**
 * Tests for scripts/repair.js — plugin conformance repair CLI.
 *
 * Uses Node.js built-in test runner (node:test + node:assert/strict).
 * All I/O is scoped to per-test temp directories cleaned up after each test.
 *
 * Test matrix:
 *  1.  Repair recreates a missing file (deleted agent) → status 'created'
 *  2.  Repair restores a drifted file (modified hook)  → status 'updated'
 *  3.  Repair does NOT touch a protected file (user-modified CLAUDE.md with
 *      skip_if_exists strategy) → status 'protected'
 *  4.  Repair with --dry-run shows what would be repaired but writes zero files
 *  5.  Repair twice (second run all skipped) — idempotency verification
 *  6.  Repair with --json produces valid JSON output
 *
 * @module tests/conformance/repair.test
 */

import { it } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import crypto from 'node:crypto'

import { main } from '../../scripts/repair.js'
import { writeInstallState } from '../../scripts/lib/install-state.js'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** @returns {string} Absolute path to a fresh temp directory. */
function makeTempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'repair-test-'))
}

/** @param {string} dirPath */
function removeTempDir(dirPath) {
  fs.rmSync(dirPath, { recursive: true, force: true })
}

/**
 * @param {string} base
 * @param {string} relPath
 * @param {string} content
 */
function writeFile(base, relPath, content) {
  const abs = path.join(base, relPath)
  fs.mkdirSync(path.dirname(abs), { recursive: true })
  fs.writeFileSync(abs, content, 'utf8')
}

/** @param {string} content @returns {string} */
function sha256(content) {
  return 'sha256:' + crypto.createHash('sha256').update(content, 'utf8').digest('hex')
}

/**
 * Build install-state operations from a file descriptor array.
 *
 * @param {Array<{dest: string, content: string, strategy?: string}>} files
 * @returns {Array<object>}
 */
function buildOperations(files) {
  return files.map(({ dest, content, strategy = 'overwrite' }) => ({
    kind: 'create',
    source: `templates/${dest}`,
    dest,
    strategy,
    contentHash: sha256(content),
  }))
}

/**
 * Write an install-state manifest that records the canonical content hashes.
 *
 * @param {string} targetDir
 * @param {Array<{dest: string, content: string, strategy?: string}>} files
 */
async function writeManifest(targetDir, files) {
  await writeInstallState(targetDir, {
    templateVersion: '1.0.0',
    profileHash: 'sha256:' + 'a'.repeat(64),
    operations: buildOperations(files),
  })
}

/**
 * Capture console.log output while running fn.
 *
 * @param {() => Promise<unknown>} fn
 * @returns {Promise<{output: string, returnValue: unknown}>}
 */
async function captureStdout(fn) {
  const lines = []
  const orig = console.log
  console.log = (...args) => lines.push(args.map(String).join(' '))
  let returnValue
  try { returnValue = await fn() } finally { console.log = orig }
  return { output: lines.join('\n'), returnValue }
}

/**
 * Capture console.error output while running fn.
 *
 * @param {() => Promise<unknown>} fn
 * @returns {Promise<{output: string, returnValue: unknown}>}
 */
async function captureStderr(fn) {
  const lines = []
  const orig = console.error
  console.error = (...args) => lines.push(args.map(String).join(' '))
  let returnValue
  try { returnValue = await fn() } finally { console.error = orig }
  return { output: lines.join('\n'), returnValue }
}

// ---------------------------------------------------------------------------
// Test 1: Repair recreates a missing file
// ---------------------------------------------------------------------------

it('missing file: repair recreates it with status created, exits 0', async () => {
  const targetDir = makeTempDir()
  const sourceDir = makeTempDir()
  try {
    const agentContent = '# Dev Agent\n\nHandles development tasks.'
    const pluginContent = '{"name":"test-plugin","version":"1.0.0"}'

    // Write manifest recording both files
    await writeManifest(targetDir, [
      { dest: '.claude/plugin.json',   content: pluginContent },
      { dest: '.claude/agents/dev.md', content: agentContent },
    ])

    // Target has plugin.json but agent is missing (simulates deletion)
    writeFile(targetDir, '.claude/plugin.json', pluginContent)

    // Source has both files (canonical source of truth)
    writeFile(sourceDir, '.claude/plugin.json', pluginContent)
    writeFile(sourceDir, '.claude/agents/dev.md', agentContent)

    const { output, returnValue: exitCode } = await captureStdout(() =>
      main(['--target', targetDir, '--source', sourceDir, '--json']),
    )

    assert.equal(exitCode, 0, `expected exit 0, got ${exitCode}`)

    const report = JSON.parse(output)
    const entry = report.files.find((f) => f.path === '.claude/agents/dev.md')
    assert.ok(entry, 'dev.md must appear in repair results')
    assert.equal(entry.status, 'created', 'missing file must be reported as created after repair')
    assert.equal(report.summary.createdCount, 1, 'createdCount must be 1')

    // Verify the file actually exists on disk now
    const restoredPath = path.join(targetDir, '.claude/agents/dev.md')
    assert.ok(fs.existsSync(restoredPath), 'dev.md must exist on disk after repair')
    assert.equal(fs.readFileSync(restoredPath, 'utf8'), agentContent, 'restored content must match source')
  } finally {
    removeTempDir(targetDir)
    removeTempDir(sourceDir)
  }
})

// ---------------------------------------------------------------------------
// Test 2: Repair restores a drifted file
// ---------------------------------------------------------------------------

it('drifted file: repair restores it with status updated, exits 0', async () => {
  const targetDir = makeTempDir()
  const sourceDir = makeTempDir()
  try {
    const canonicalContent = '#!/bin/sh\n# Canonical hook script\nexit 0\n'
    const driftedContent   = '#!/bin/sh\n# Someone modified this hook\nexit 1\n'
    const pluginContent    = '{"name":"test-plugin","version":"1.0.0"}'

    // Manifest records canonical hook content
    await writeManifest(targetDir, [
      { dest: '.claude/plugin.json', content: pluginContent },
      { dest: 'hooks/pre-tool.sh',   content: canonicalContent },
    ])

    // Target has the plugin.json (ok) but a drifted hook
    writeFile(targetDir, '.claude/plugin.json', pluginContent)
    writeFile(targetDir, 'hooks/pre-tool.sh',   driftedContent)

    // Source has the canonical hook
    writeFile(sourceDir, '.claude/plugin.json', pluginContent)
    writeFile(sourceDir, 'hooks/pre-tool.sh',   canonicalContent)

    const { output, returnValue: exitCode } = await captureStdout(() =>
      main(['--target', targetDir, '--source', sourceDir, '--json']),
    )

    assert.equal(exitCode, 0, `expected exit 0, got ${exitCode}`)

    const report = JSON.parse(output)
    const entry = report.files.find((f) => f.path === 'hooks/pre-tool.sh')
    assert.ok(entry, 'hooks/pre-tool.sh must appear in repair results')
    assert.equal(entry.status, 'updated', 'drifted file must be reported as updated after repair')
    assert.equal(report.summary.updatedCount, 1, 'updatedCount must be 1')

    // Verify the content was restored
    const restoredPath = path.join(targetDir, 'hooks/pre-tool.sh')
    assert.equal(fs.readFileSync(restoredPath, 'utf8'), canonicalContent, 'restored content must match source')
  } finally {
    removeTempDir(targetDir)
    removeTempDir(sourceDir)
  }
})

// ---------------------------------------------------------------------------
// Test 3: Repair does NOT touch a protected file (skip_if_exists)
// ---------------------------------------------------------------------------

it('protected file: skip_if_exists file with user content is left untouched, status protected', async () => {
  const targetDir = makeTempDir()
  const sourceDir = makeTempDir()
  try {
    const templateContent = '# Default CLAUDE.md from template'
    const userContent     = '# My custom project notes\n\nUser has added their own instructions.'

    // Manifest records the template content with skip_if_exists
    await writeInstallState(targetDir, {
      templateVersion: '1.0.0',
      profileHash: 'sha256:' + 'a'.repeat(64),
      operations: [{
        kind: 'create',
        source: 'templates/CLAUDE.md',
        dest: 'CLAUDE.md',
        strategy: 'skip_if_exists',
        contentHash: sha256(templateContent),
      }],
    })

    // Target has the user-modified version
    writeFile(targetDir, 'CLAUDE.md', userContent)

    // Source has the canonical template version
    writeFile(sourceDir, 'CLAUDE.md', templateContent)

    const { output, returnValue: exitCode } = await captureStdout(() =>
      main(['--target', targetDir, '--source', sourceDir, '--json']),
    )

    assert.equal(exitCode, 0, `expected exit 0 (no errors), got ${exitCode}`)

    const report = JSON.parse(output)
    const entry = report.files.find((f) => f.path === 'CLAUDE.md')
    assert.ok(entry, 'CLAUDE.md must appear in repair results')
    assert.equal(entry.status, 'protected', 'skip_if_exists file must be reported as protected')
    assert.equal(report.summary.protectedCount, 1, 'protectedCount must be 1')
    assert.equal(report.summary.updatedCount,   0, 'updatedCount must be 0 — must not overwrite')

    // Verify the file was NOT overwritten — user content must still be there
    const diskContent = fs.readFileSync(path.join(targetDir, 'CLAUDE.md'), 'utf8')
    assert.equal(diskContent, userContent, 'user content must be preserved — file must not be overwritten')
  } finally {
    removeTempDir(targetDir)
    removeTempDir(sourceDir)
  }
})

// ---------------------------------------------------------------------------
// Test 4: --dry-run shows what would be repaired but writes zero files
// ---------------------------------------------------------------------------

it('--dry-run: reports what would be repaired but writes no files', async () => {
  const targetDir = makeTempDir()
  const sourceDir = makeTempDir()
  try {
    const agentContent = '# Agent that was deleted'
    const hookContent  = '#!/bin/sh\n# canonical hook\n'
    const driftContent = '#!/bin/sh\n# this hook was modified\n'

    await writeManifest(targetDir, [
      { dest: '.claude/agents/worker.md', content: agentContent },
      { dest: 'hooks/run.sh',             content: hookContent },
    ])

    // worker.md is missing; hooks/run.sh has drifted
    writeFile(targetDir, 'hooks/run.sh', driftContent)

    // Source has canonical versions of both
    writeFile(sourceDir, '.claude/agents/worker.md', agentContent)
    writeFile(sourceDir, 'hooks/run.sh',             hookContent)

    const { output, returnValue: exitCode } = await captureStdout(() =>
      main(['--target', targetDir, '--source', sourceDir, '--dry-run', '--json']),
    )

    assert.equal(exitCode, 0, `expected exit 0 in dry-run, got ${exitCode}`)

    const report = JSON.parse(output)
    assert.equal(report.dryRun, true, 'report.dryRun must be true')

    const workerEntry = report.files.find((f) => f.path === '.claude/agents/worker.md')
    assert.ok(workerEntry, 'worker.md must appear in dry-run results')
    assert.equal(workerEntry.status, 'created', 'missing file must show created in dry-run')

    const hookEntry = report.files.find((f) => f.path === 'hooks/run.sh')
    assert.ok(hookEntry, 'hooks/run.sh must appear in dry-run results')
    assert.equal(hookEntry.status, 'updated', 'drifted file must show updated in dry-run')

    // No files should have been written to disk
    const agentPath = path.join(targetDir, '.claude/agents/worker.md')
    assert.ok(!fs.existsSync(agentPath), 'worker.md must NOT exist on disk after dry-run')

    const hookPath = path.join(targetDir, 'hooks/run.sh')
    const diskHookContent = fs.readFileSync(hookPath, 'utf8')
    assert.equal(diskHookContent, driftContent, 'hooks/run.sh must still contain drifted content after dry-run')
  } finally {
    removeTempDir(targetDir)
    removeTempDir(sourceDir)
  }
})

// ---------------------------------------------------------------------------
// Test 5: Idempotency — second repair run skips all files
// ---------------------------------------------------------------------------

it('idempotency: second repair run skips all files (nothing to repair)', async () => {
  const targetDir = makeTempDir()
  const sourceDir = makeTempDir()
  try {
    const agentContent  = '# Agent that was deleted'
    const pluginContent = '{"name":"test-plugin","version":"1.0.0"}'

    await writeManifest(targetDir, [
      { dest: '.claude/plugin.json',      content: pluginContent },
      { dest: '.claude/agents/worker.md', content: agentContent },
    ])

    // Start with plugin.json present and agent missing
    writeFile(targetDir, '.claude/plugin.json', pluginContent)

    // Source has both files
    writeFile(sourceDir, '.claude/plugin.json',      pluginContent)
    writeFile(sourceDir, '.claude/agents/worker.md', agentContent)

    // First repair — should create the missing agent
    const { output: output1, returnValue: exitCode1 } = await captureStdout(() =>
      main(['--target', targetDir, '--source', sourceDir, '--json']),
    )

    assert.equal(exitCode1, 0, `first repair: expected exit 0, got ${exitCode1}`)
    const report1 = JSON.parse(output1)
    assert.equal(report1.summary.createdCount, 1, 'first repair must create the missing agent')

    // Second repair — everything should now be ok (skipped)
    const { output: output2, returnValue: exitCode2 } = await captureStdout(() =>
      main(['--target', targetDir, '--source', sourceDir, '--json']),
    )

    assert.equal(exitCode2, 0, `second repair: expected exit 0, got ${exitCode2}`)
    const report2 = JSON.parse(output2)
    assert.equal(report2.summary.createdCount, 0, 'second repair must not create any files')
    assert.equal(report2.summary.updatedCount, 0, 'second repair must not update any files')
    assert.equal(report2.summary.errorCount,   0, 'second repair must have no errors')

    // All files must be skipped (already ok)
    const nonSkipped = report2.files.filter((f) => f.status !== 'skipped' && f.status !== 'protected')
    assert.equal(nonSkipped.length, 0, `all files must be skipped on second run; found: ${JSON.stringify(nonSkipped)}`)
  } finally {
    removeTempDir(targetDir)
    removeTempDir(sourceDir)
  }
})

// ---------------------------------------------------------------------------
// Test 6: --json produces valid JSON output
// ---------------------------------------------------------------------------

it('--json: output is valid JSON with expected shape', async () => {
  const targetDir = makeTempDir()
  const sourceDir = makeTempDir()
  try {
    const agentContent  = '# Agent file'
    const pluginContent = '{"name":"test","version":"1.0.0"}'

    await writeManifest(targetDir, [
      { dest: '.claude/plugin.json',      content: pluginContent },
      { dest: '.claude/agents/helper.md', content: agentContent },
    ])

    // helper.md is missing; plugin.json matches
    writeFile(targetDir, '.claude/plugin.json', pluginContent)

    writeFile(sourceDir, '.claude/plugin.json',      pluginContent)
    writeFile(sourceDir, '.claude/agents/helper.md', agentContent)

    const { output, returnValue: exitCode } = await captureStdout(() =>
      main(['--target', targetDir, '--source', sourceDir, '--json']),
    )

    assert.equal(exitCode, 0, `expected exit 0, got ${exitCode}`)

    let report
    assert.doesNotThrow(() => { report = JSON.parse(output) }, 'output must be valid JSON')

    // Check top-level shape
    assert.ok(typeof report.repairedAt === 'string', 'repairedAt must be a string')
    assert.ok(!isNaN(new Date(report.repairedAt).getTime()), 'repairedAt must be a valid ISO date')
    assert.equal(typeof report.dryRun, 'boolean', 'dryRun must be a boolean')
    assert.ok(typeof report.summary === 'object' && report.summary !== null, 'summary must be an object')
    assert.ok(Array.isArray(report.files), 'files must be an array')

    // Check summary fields
    const { summary } = report
    assert.ok(typeof summary.createdCount   === 'number', 'createdCount must be a number')
    assert.ok(typeof summary.updatedCount   === 'number', 'updatedCount must be a number')
    assert.ok(typeof summary.protectedCount === 'number', 'protectedCount must be a number')
    assert.ok(typeof summary.skippedCount   === 'number', 'skippedCount must be a number')
    assert.ok(typeof summary.errorCount     === 'number', 'errorCount must be a number')

    // Each file entry must have path and status
    for (const f of report.files) {
      assert.ok(typeof f.path   === 'string', `file entry must have a string path, got: ${JSON.stringify(f)}`)
      assert.ok(typeof f.status === 'string', `file entry must have a string status, got: ${JSON.stringify(f)}`)
    }

    // The missing helper.md must have been created
    const helperEntry = report.files.find((f) => f.path === '.claude/agents/helper.md')
    assert.ok(helperEntry, 'helper.md must appear in the JSON report')
    assert.equal(helperEntry.status, 'created', 'helper.md must show created status')

    // Summary counts must add up to total files
    const total = summary.createdCount + summary.updatedCount +
      summary.protectedCount + summary.skippedCount + summary.errorCount
    assert.equal(total, report.files.length,
      `sum of summary counts (${total}) must equal files.length (${report.files.length})`)
  } finally {
    removeTempDir(targetDir)
    removeTempDir(sourceDir)
  }
})
