/**
 * Tests for scripts/doctor.js — plugin conformance checker CLI.
 *
 * Uses Node.js built-in test runner (node:test + node:assert/strict).
 * All I/O is scoped to per-test temp directories cleaned up after each test.
 *
 * Test matrix:
 *  1.  Fresh install reports all files as 'ok', exit code 0
 *  2.  Modified file is reported as 'drifted' with expected vs actual hash
 *  3.  Deleted file is reported as 'missing'
 *  4.  User-modified skip_if_exists file is reported as 'protected' (not drifted)
 *  5.  --json produces valid JSON matching conformance-report.schema.json
 *  6.  Missing install-state.json exits with code 2 and helpful message
 *  7.  Completes in under 2 seconds for an 80-file plugin (performance)
 *  8.  --quick checks only critical files + first 3 agents alphabetically
 *  9.  Summary counts match total file count
 *
 * @module tests/conformance/doctor.test
 */

import { it } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import crypto from 'node:crypto'
import { readFileSync } from 'node:fs'

import Ajv from 'ajv'
import addFormats from 'ajv-formats'

import { main } from '../../scripts/doctor.js'
import { writeInstallState } from '../../scripts/lib/install-state.js'

// ---------------------------------------------------------------------------
// Schema validation setup (loaded once for the whole suite)
// ---------------------------------------------------------------------------

const conformanceSchemaPath = new URL(
  '../../schemas/conformance-report.schema.json',
  import.meta.url,
)
const conformanceSchema = JSON.parse(readFileSync(conformanceSchemaPath, 'utf8'))
// validateSchema: false mirrors how schema-validator.js avoids pulling in the
// draft-2020-12 meta-schema, which AJV 8 does not bundle by default.
const ajv = new Ajv({ strict: false, allErrors: true, validateSchema: false })
addFormats(ajv)
const validateConformanceReport = ajv.compile(conformanceSchema)

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** @returns {string} Absolute path to a fresh temp directory. */
function makeTempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'doctor-test-'))
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
 * Capture console.log output while running fn.
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

/**
 * Write plugin files to disk and record them in install-state.json.
 * @param {string} targetDir
 * @param {Array<{relPath: string, content: string, strategy?: string}>} files
 */
async function createInstalledPlugin(targetDir, files) {
  for (const { relPath, content } of files) {
    writeFile(targetDir, relPath, content)
  }
  await writeInstallState(targetDir, {
    templateVersion: '1.0.0',
    profileHash: 'sha256:' + 'a'.repeat(64),
    operations: buildOperations(
      files.map(({ relPath, content, strategy }) => ({ dest: relPath, content, strategy })),
    ),
  })
}

// ---------------------------------------------------------------------------
// Test 1: Fresh install — all files ok, exit code 0
// ---------------------------------------------------------------------------

it('fresh install: all files reported as ok, exits 0', async () => {
  const tmpDir = makeTempDir()
  try {
    const files = [
      { relPath: '.claude/plugin.json',   content: '{"name":"test-plugin","version":"1.0.0"}' },
      { relPath: 'CLAUDE.md',             content: '# Test Plugin', strategy: 'skip_if_exists' },
      { relPath: '.claude/agents/dev.md', content: '# Dev Agent' },
    ]
    await createInstalledPlugin(tmpDir, files)

    const { output, returnValue: exitCode } = await captureStdout(() =>
      main(['--target', tmpDir]),
    )

    assert.equal(exitCode, 0, `expected exit code 0 on fresh install, got ${exitCode}`)
    assert.ok(!output.includes('DRIFT DETECTED'), 'must not report drift on fresh install')
    assert.ok(output.includes('✓') || output.includes('ok'), 'must show ok status indicator')
  } finally {
    removeTempDir(tmpDir)
  }
})

// ---------------------------------------------------------------------------
// Test 2: Drifted file — detected with expected vs actual hash, exit code 1
// ---------------------------------------------------------------------------

it('drifted file: detected with expected and actual hashes, exits 1', async () => {
  const tmpDir = makeTempDir()
  try {
    const originalContent = '# Original dev agent content'
    const driftedContent  = '# User has modified this agent'

    await writeInstallState(tmpDir, {
      templateVersion: '1.0.0',
      profileHash: 'sha256:' + 'a'.repeat(64),
      operations: buildOperations([
        { dest: '.claude/plugin.json',   content: '{"name":"test","version":"1.0.0"}' },
        { dest: '.claude/agents/dev.md', content: originalContent },
      ]),
    })
    writeFile(tmpDir, '.claude/plugin.json', '{"name":"test","version":"1.0.0"}')
    writeFile(tmpDir, '.claude/agents/dev.md', driftedContent)

    const { output, returnValue: exitCode } = await captureStdout(() =>
      main(['--target', tmpDir, '--json']),
    )

    assert.equal(exitCode, 1, `expected exit code 1 for drifted file, got ${exitCode}`)

    const report = JSON.parse(output)
    const driftedEntry = report.files.find(
      (f) => f.path === '.claude/agents/dev.md' && f.status === 'drifted',
    )
    assert.ok(driftedEntry, 'dev.md must be reported as drifted')
    assert.equal(driftedEntry.expectedHash, sha256(originalContent), 'expectedHash must match original')
    assert.equal(driftedEntry.actualHash,   sha256(driftedContent),  'actualHash must match drifted content')
    assert.equal(report.summary.driftedCount, 1, 'driftedCount must be 1')
  } finally {
    removeTempDir(tmpDir)
  }
})

// ---------------------------------------------------------------------------
// Test 3: Missing file — reported as missing, exit code 1
// ---------------------------------------------------------------------------

it('missing file: detected as missing, exits 1', async () => {
  const tmpDir = makeTempDir()
  try {
    await writeInstallState(tmpDir, {
      templateVersion: '1.0.0',
      profileHash: 'sha256:' + 'a'.repeat(64),
      operations: buildOperations([
        { dest: '.claude/plugin.json',      content: '{"name":"test","version":"1.0.0"}' },
        { dest: '.claude/agents/dev.md',    content: '# Agent that will be deleted' },
      ]),
    })
    // Write only plugin.json — agent file intentionally omitted (deleted)
    writeFile(tmpDir, '.claude/plugin.json', '{"name":"test","version":"1.0.0"}')

    const { output, returnValue: exitCode } = await captureStdout(() =>
      main(['--target', tmpDir, '--json']),
    )

    assert.equal(exitCode, 1, `expected exit code 1 for missing file, got ${exitCode}`)

    const report = JSON.parse(output)
    const missingEntry = report.files.find(
      (f) => f.path === '.claude/agents/dev.md' && f.status === 'missing',
    )
    assert.ok(missingEntry, 'dev.md must be reported as missing')
    assert.equal(report.summary.missingCount, 1, 'missingCount must be 1')
  } finally {
    removeTempDir(tmpDir)
  }
})

// ---------------------------------------------------------------------------
// Test 4: Protected file — skip_if_exists with user content is 'protected', not 'drifted'
// ---------------------------------------------------------------------------

it('protected file: user-modified skip_if_exists file reported as protected, exits 0', async () => {
  const tmpDir = makeTempDir()
  try {
    const templateContent = '# Template default CLAUDE.md'
    const userContent     = '# User has customized this CLAUDE.md with project notes'

    await writeInstallState(tmpDir, {
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
    writeFile(tmpDir, 'CLAUDE.md', userContent)

    const { output, returnValue: exitCode } = await captureStdout(() =>
      main(['--target', tmpDir, '--json']),
    )

    assert.equal(exitCode, 0, 'protected files must not trigger exit code 1')

    const report = JSON.parse(output)
    const entry = report.files.find((f) => f.path === 'CLAUDE.md')
    assert.ok(entry, 'CLAUDE.md must appear in results')
    assert.equal(entry.status, 'protected', 'skip_if_exists file with user content must be "protected"')
    assert.equal(report.summary.protectedCount, 1, 'protectedCount must be 1')
    assert.equal(report.summary.driftedCount,   0, 'driftedCount must be 0 (not drifted)')
  } finally {
    removeTempDir(tmpDir)
  }
})

// ---------------------------------------------------------------------------
// Test 5: --json output validates against conformance-report.schema.json
// ---------------------------------------------------------------------------

it('--json: output is valid JSON conforming to conformance-report.schema.json', async () => {
  const tmpDir = makeTempDir()
  try {
    const files = [
      { relPath: '.claude/plugin.json',   content: '{"name":"test","version":"1.0.0"}' },
      { relPath: 'CLAUDE.md',             content: '# Plugin',                          strategy: 'skip_if_exists' },
      { relPath: '.claude/agents/dev.md', content: '# Dev Agent' },
    ]
    await createInstalledPlugin(tmpDir, files)

    const { output } = await captureStdout(() =>
      main(['--target', tmpDir, '--json']),
    )

    let report
    assert.doesNotThrow(() => { report = JSON.parse(output) }, 'output must be parseable JSON')

    const valid = validateConformanceReport(report)
    assert.equal(
      valid, true,
      `report must pass conformance-report.schema.json: ${JSON.stringify(validateConformanceReport.errors, null, 2)}`,
    )
    assert.equal(report.schema, 'conformance-report.v1', 'schema field must be "conformance-report.v1"')
    assert.ok(report.checkedAt, 'checkedAt must be present')
    assert.ok(Array.isArray(report.files), 'files must be an array')
    assert.equal(report.files.length, files.length, 'file count must match recorded operations')

    const ts = new Date(report.checkedAt)
    assert.equal(isNaN(ts.getTime()), false, 'checkedAt must be a valid ISO 8601 date-time')
  } finally {
    removeTempDir(tmpDir)
  }
})

// ---------------------------------------------------------------------------
// Test 6: Missing install-state.json — exits 2 with helpful message
// ---------------------------------------------------------------------------

it('missing install-state.json: exits 2 with helpful error message', async () => {
  const tmpDir = makeTempDir()
  try {
    // Empty target — no .claude/install-state.json
    const { output: stderrOutput, returnValue: exitCode } = await captureStderr(() =>
      main(['--target', tmpDir]),
    )

    assert.equal(exitCode, 2, `expected exit code 2 when manifest is missing, got ${exitCode}`)

    const lower = stderrOutput.toLowerCase()
    assert.ok(
      lower.includes('install-state') || lower.includes('install') || lower.includes('manifest'),
      `stderr must mention install-state/install/manifest; got: "${stderrOutput}"`,
    )
  } finally {
    removeTempDir(tmpDir)
  }
})

it('missing --target arg: exits 2', async () => {
  const { returnValue: exitCode } = await captureStderr(() => main([]))
  assert.equal(exitCode, 2, `expected exit code 2 when --target is missing, got ${exitCode}`)
})

// ---------------------------------------------------------------------------
// Test 7: Performance — 80-file plugin completes in under 2 seconds
// ---------------------------------------------------------------------------

it('performance: 80-file plugin completes in under 2 seconds', async () => {
  const tmpDir = makeTempDir()
  try {
    const files = []
    for (let i = 0; i < 20; i++) {
      files.push({ relPath: `.claude/agents/agent-${String(i).padStart(2, '0')}.md`,
                   content: `# Agent ${i}\n\nAgent number ${i}.` })
    }
    for (let i = 0; i < 20; i++) {
      files.push({ relPath: `.claude/skills/skill-${String(i).padStart(2, '0')}.md`,
                   content: `# Skill ${i}\n\nSkill number ${i}.` })
    }
    for (let i = 0; i < 20; i++) {
      files.push({ relPath: `.claude/commands/cmd-${String(i).padStart(2, '0')}.md`,
                   content: `# Command ${i}\n\nCommand number ${i}.` })
    }
    for (let i = 0; i < 20; i++) {
      files.push({ relPath: `.claude/knowledge/doc-${String(i).padStart(2, '0')}.md`,
                   content: `# Knowledge ${i}\n\nDocument number ${i}.` })
    }
    assert.equal(files.length, 80, 'fixture must have exactly 80 files')

    await createInstalledPlugin(tmpDir, files)

    const start = Date.now()
    await captureStdout(() => main(['--target', tmpDir]))
    const elapsed = Date.now() - start

    assert.ok(elapsed < 2000, `doctor must complete in under 2000 ms; took ${elapsed} ms`)
  } finally {
    removeTempDir(tmpDir)
  }
})

// ---------------------------------------------------------------------------
// Test 8a: --quick includes critical files and first 3 agents alphabetically
// ---------------------------------------------------------------------------

it('--quick: includes critical files and first 3 agents alphabetically', async () => {
  const tmpDir = makeTempDir()
  try {
    // Agent names chosen so alphabetical sort gives a clear first-3 / excluded split:
    // Sorted order: aardvark < badger < crane < dragon < eagle < fox
    // First 3: aardvark, badger, crane  |  Excluded: dragon, eagle, fox
    const files = [
      { relPath: '.claude/plugin.json',                content: '{"name":"test","version":"1.0.0"}' },
      { relPath: 'CLAUDE.md',                          content: '# Plugin', strategy: 'skip_if_exists' },
      { relPath: '.claude/agents/agent-aardvark.md',   content: '# Aardvark' },
      { relPath: '.claude/agents/agent-badger.md',     content: '# Badger' },
      { relPath: '.claude/agents/agent-crane.md',      content: '# Crane' },
      { relPath: '.claude/agents/agent-dragon.md',     content: '# Dragon' },
      { relPath: '.claude/agents/agent-eagle.md',      content: '# Eagle' },
      { relPath: '.claude/agents/agent-fox.md',        content: '# Fox' },
    ]
    await createInstalledPlugin(tmpDir, files)

    const { output } = await captureStdout(() =>
      main(['--target', tmpDir, '--json', '--quick']),
    )

    const report = JSON.parse(output)
    const checkedPaths = report.files.map((f) => f.path)

    assert.ok(checkedPaths.includes('.claude/plugin.json'), '--quick must include .claude/plugin.json')
    assert.ok(checkedPaths.includes('CLAUDE.md'),           '--quick must include CLAUDE.md')

    const agentPaths = checkedPaths.filter((p) => p.startsWith('.claude/agents/')).sort()
    assert.ok(agentPaths.length <= 3, `--quick must check at most 3 agents, checked ${agentPaths.length}`)

    assert.ok(agentPaths.includes('.claude/agents/agent-aardvark.md'), 'aardvark (1st alpha) must be included')
    assert.ok(agentPaths.includes('.claude/agents/agent-badger.md'),   'badger (2nd alpha) must be included')
    assert.ok(agentPaths.includes('.claude/agents/agent-crane.md'),    'crane (3rd alpha) must be included')
    assert.ok(!checkedPaths.includes('.claude/agents/agent-dragon.md'), 'dragon (4th) must be excluded')
    assert.ok(!checkedPaths.includes('.claude/agents/agent-eagle.md'),  'eagle (5th) must be excluded')
    assert.ok(!checkedPaths.includes('.claude/agents/agent-fox.md'),    'fox (6th) must be excluded')
  } finally {
    removeTempDir(tmpDir)
  }
})

// ---------------------------------------------------------------------------
// Test 8b: --quick agent selection is deterministic across runs
// ---------------------------------------------------------------------------

it('--quick: agent selection is deterministic (same result every run)', async () => {
  const tmpDir = makeTempDir()
  try {
    const files = [
      { relPath: '.claude/plugin.json',             content: '{"name":"test","version":"1.0.0"}' },
      { relPath: '.claude/agents/agent-charlie.md', content: '# Charlie' },
      { relPath: '.claude/agents/agent-alpha.md',   content: '# Alpha' },
      { relPath: '.claude/agents/agent-bravo.md',   content: '# Bravo' },
      { relPath: '.claude/agents/agent-delta.md',   content: '# Delta' },
    ]
    await createInstalledPlugin(tmpDir, files)

    // Run sequentially (not concurrently) to avoid console.log monkey-patch collision.
    const run1 = await captureStdout(() => main(['--target', tmpDir, '--json', '--quick']))
    const run2 = await captureStdout(() => main(['--target', tmpDir, '--json', '--quick']))

    const paths1 = JSON.parse(run1.output).files.map((f) => f.path).sort()
    const paths2 = JSON.parse(run2.output).files.map((f) => f.path).sort()
    assert.deepEqual(paths1, paths2, '--quick must return identical file paths across runs')

    const agents = paths1.filter((p) => p.startsWith('.claude/agents/')).sort()
    assert.deepEqual(agents, [
      '.claude/agents/agent-alpha.md',
      '.claude/agents/agent-bravo.md',
      '.claude/agents/agent-charlie.md',
    ], 'must select first 3 agents alphabetically: alpha, bravo, charlie')
  } finally {
    removeTempDir(tmpDir)
  }
})

// ---------------------------------------------------------------------------
// Test 9: Summary counts sum to total file count
// ---------------------------------------------------------------------------

it('summary counts: okCount + driftedCount + missingCount + protectedCount + errorCount equals total files', async () => {
  const tmpDir = makeTempDir()
  try {
    const okContent       = '# OK file — matches manifest'
    const driftedOriginal = '# Original before drift'
    const driftedActual   = '# Modified after installation'

    const operations = [
      ...buildOperations([
        { dest: '.claude/plugin.json',        content: okContent },
        { dest: '.claude/agents/dev.md',      content: driftedOriginal },
        { dest: '.claude/agents/ops.md',      content: '# Ops agent — untouched' },
        { dest: '.claude/agents/reviewer.md', content: '# Reviewer agent' },
      ]),
      {
        kind: 'create',
        source: 'templates/CLAUDE.md',
        dest: 'CLAUDE.md',
        strategy: 'skip_if_exists',
        contentHash: sha256('# Template CLAUDE.md'),
      },
    ]
    await writeInstallState(tmpDir, {
      templateVersion: '1.0.0',
      profileHash: 'sha256:' + 'a'.repeat(64),
      operations,
    })

    writeFile(tmpDir, '.claude/plugin.json',   okContent)
    writeFile(tmpDir, '.claude/agents/dev.md', driftedActual)
    writeFile(tmpDir, '.claude/agents/ops.md', '# Ops agent — untouched')
    writeFile(tmpDir, 'CLAUDE.md',             '# User customized CLAUDE.md')
    // reviewer.md intentionally omitted → missing

    const { output } = await captureStdout(() =>
      main(['--target', tmpDir, '--json']),
    )

    const report = JSON.parse(output)
    const { summary, files } = report

    const countSum =
      summary.okCount +
      summary.driftedCount +
      summary.missingCount +
      summary.protectedCount +
      summary.errorCount

    assert.equal(countSum, files.length,
      `sum of all status counts (${countSum}) must equal total files (${files.length})`,
    )
    assert.equal(summary.okCount,        2, 'okCount: plugin.json + ops.md')
    assert.equal(summary.driftedCount,   1, 'driftedCount: dev.md')
    assert.equal(summary.missingCount,   1, 'missingCount: reviewer.md')
    assert.equal(summary.protectedCount, 1, 'protectedCount: CLAUDE.md')
    assert.equal(files.length,           5, 'total files must be 5')
  } finally {
    removeTempDir(tmpDir)
  }
})
