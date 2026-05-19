/**
 * Tests for scripts/lib/install-state.js
 *
 * Covers writeInstallState, readInstallState, and compareInstallState using
 * isolated temp directories for every test.
 *
 * @module tests/conformance/install-state.test
 */

import { describe, it, beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import crypto from 'node:crypto'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'

import Ajv from 'ajv'
import addFormats from 'ajv-formats'

import {
  writeInstallState,
  readInstallState,
  compareInstallState,
} from '../../scripts/lib/install-state.js'

// ---------------------------------------------------------------------------
// Schema setup (loaded once for the whole suite)
// ---------------------------------------------------------------------------

const schemaPath = new URL('../../schemas/install-state.schema.json', import.meta.url)
const schema = JSON.parse(readFileSync(schemaPath, 'utf8'))

const ajv = new Ajv({ strict: true })
addFormats(ajv)
const validateSchema = ajv.compile(schema)

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Create a unique temp directory for an individual test.
 *
 * @returns {string} Absolute path of the created temp directory.
 */
function makeTempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'install-state-test-'))
}

/**
 * Recursively remove a directory, silently ignoring missing paths.
 *
 * @param {string} dirPath - Absolute path to remove.
 */
function removeTempDir(dirPath) {
  fs.rmSync(dirPath, { recursive: true, force: true })
}

/**
 * Compute a sha256: prefixed hex hash of a string.
 *
 * @param {string} content
 * @returns {string}
 */
function sha256(content) {
  return 'sha256:' + crypto.createHash('sha256').update(content, 'utf8').digest('hex')
}

/**
 * Build a minimal valid operations array for use in tests.
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
 * Shared fixture values used across multiple tests.
 */
const FIXTURE = {
  templateVersion: '1.2.3',
  profileHash: 'sha256:' + 'a'.repeat(64),
}

// ---------------------------------------------------------------------------
// writeInstallState
// ---------------------------------------------------------------------------

describe('writeInstallState', () => {
  /** @type {string} */
  let tmpDir

  beforeEach(() => {
    tmpDir = makeTempDir()
  })

  afterEach(() => {
    removeTempDir(tmpDir)
  })

  it('creates .claude/install-state.json in the target directory', async () => {
    const operations = buildOperations([{ dest: 'CLAUDE.md', content: '# Hello' }])

    await writeInstallState(tmpDir, {
      templateVersion: FIXTURE.templateVersion,
      profileHash: FIXTURE.profileHash,
      operations,
    })

    const expectedPath = path.join(tmpDir, '.claude', 'install-state.json')
    assert.equal(fs.existsSync(expectedPath), true, '.claude/install-state.json must be created')
  })

  it('written manifest validates against install-state.schema.json', async () => {
    const operations = buildOperations([
      { dest: 'CLAUDE.md', content: '# Hello' },
      { dest: '.claude/settings.json', content: '{}', strategy: 'skip_if_exists' },
    ])

    await writeInstallState(tmpDir, {
      templateVersion: FIXTURE.templateVersion,
      profileHash: FIXTURE.profileHash,
      operations,
    })

    const manifestPath = path.join(tmpDir, '.claude', 'install-state.json')
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'))

    const valid = validateSchema(manifest)
    assert.equal(
      valid,
      true,
      `Schema validation failed: ${JSON.stringify(validateSchema.errors, null, 2)}`,
    )
  })

  it('includes generatedAt as an ISO 8601 timestamp', async () => {
    const before = new Date()

    await writeInstallState(tmpDir, {
      templateVersion: FIXTURE.templateVersion,
      profileHash: FIXTURE.profileHash,
      operations: [],
    })

    const after = new Date()
    const manifestPath = path.join(tmpDir, '.claude', 'install-state.json')
    const { generatedAt } = JSON.parse(fs.readFileSync(manifestPath, 'utf8'))

    // Must parse as a valid date
    const ts = new Date(generatedAt)
    assert.equal(isNaN(ts.getTime()), false, 'generatedAt must be a valid date string')

    // Must fall within the wall-clock window of this test
    assert.equal(ts >= before, true, 'generatedAt must not be before test start')
    assert.equal(ts <= after, true, 'generatedAt must not be after test end')

    // Must match ISO 8601 date-time pattern
    assert.match(generatedAt, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)
  })

  it('records profileHash and templateVersion in the manifest', async () => {
    await writeInstallState(tmpDir, {
      templateVersion: '3.0.1',
      profileHash: 'sha256:' + 'b'.repeat(64),
      operations: [],
    })

    const manifestPath = path.join(tmpDir, '.claude', 'install-state.json')
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'))

    assert.equal(manifest.templateVersion, '3.0.1')
    assert.equal(manifest.profileHash, 'sha256:' + 'b'.repeat(64))
  })

  it('returns the written manifest object', async () => {
    const operations = buildOperations([{ dest: 'agents/dev.md', content: '# Dev' }])

    const result = await writeInstallState(tmpDir, {
      templateVersion: FIXTURE.templateVersion,
      profileHash: FIXTURE.profileHash,
      operations,
    })

    assert.equal(typeof result, 'object', 'writeInstallState must return the manifest object')
    assert.equal(result.schema, 'install-state.v1')
    assert.equal(result.templateVersion, FIXTURE.templateVersion)
    assert.equal(result.profileHash, FIXTURE.profileHash)
    assert.deepEqual(result.operations, operations)
  })
})

// ---------------------------------------------------------------------------
// readInstallState
// ---------------------------------------------------------------------------

describe('readInstallState', () => {
  /** @type {string} */
  let tmpDir

  beforeEach(() => {
    tmpDir = makeTempDir()
  })

  afterEach(() => {
    removeTempDir(tmpDir)
  })

  it('reads back what writeInstallState wrote (roundtrip)', async () => {
    const operations = buildOperations([
      { dest: 'CLAUDE.md', content: '# Plugin' },
      { dest: '.claude/settings.json', content: '{"hooks":{}}', strategy: 'deep_merge' },
    ])

    const written = await writeInstallState(tmpDir, {
      templateVersion: '2.1.0',
      profileHash: 'sha256:' + 'c'.repeat(64),
      operations,
    })

    const read = await readInstallState(tmpDir)

    assert.equal(read.schema, written.schema)
    assert.equal(read.templateVersion, written.templateVersion)
    assert.equal(read.profileHash, written.profileHash)
    assert.deepEqual(read.operations, written.operations)
  })

  it('throws when .claude/install-state.json is missing', async () => {
    await assert.rejects(
      () => readInstallState(tmpDir),
      (err) => {
        // Must throw — accept any error type but it must be an Error instance
        assert.equal(err instanceof Error, true)
        return true
      },
      'readInstallState must throw when the manifest file does not exist',
    )
  })

  it('throws when manifest has an invalid schema version', async () => {
    // Write a manifest with a wrong schema field directly
    const claudeDir = path.join(tmpDir, '.claude')
    fs.mkdirSync(claudeDir, { recursive: true })

    const badManifest = {
      schema: 'install-state.v99',
      generatedAt: new Date().toISOString(),
      templateVersion: '1.0.0',
      profileHash: 'sha256:' + 'd'.repeat(64),
      operations: [],
    }
    fs.writeFileSync(
      path.join(claudeDir, 'install-state.json'),
      JSON.stringify(badManifest, null, 2),
      'utf8',
    )

    await assert.rejects(
      () => readInstallState(tmpDir),
      (err) => {
        assert.equal(err instanceof Error, true)
        return true
      },
      'readInstallState must throw when schema version is not "install-state.v1"',
    )
  })
})

// ---------------------------------------------------------------------------
// compareInstallState
// ---------------------------------------------------------------------------

describe('compareInstallState', () => {
  /** @type {string} */
  let tmpDir

  beforeEach(() => {
    tmpDir = makeTempDir()
  })

  afterEach(() => {
    removeTempDir(tmpDir)
  })

  /**
   * Write actual files into tmpDir to simulate installed plugin state.
   *
   * @param {Array<{relPath: string, content: string}>} files
   */
  function writeInstalledFiles(files) {
    for (const { relPath, content } of files) {
      const abs = path.join(tmpDir, relPath)
      fs.mkdirSync(path.dirname(abs), { recursive: true })
      fs.writeFileSync(abs, content, 'utf8')
    }
  }

  it('reports "ok" for files whose content hash matches the manifest', async () => {
    const content = '# My Plugin'
    writeInstalledFiles([{ relPath: 'CLAUDE.md', content }])

    await writeInstallState(tmpDir, {
      templateVersion: FIXTURE.templateVersion,
      profileHash: FIXTURE.profileHash,
      operations: buildOperations([{ dest: 'CLAUDE.md', content }]),
    })

    const { files } = await compareInstallState(tmpDir)
    const entry = files.find((f) => f.path === 'CLAUDE.md')

    assert.ok(entry, 'CLAUDE.md must appear in comparison results')
    assert.equal(entry.status, 'ok')
  })

  it('reports "drifted" for files whose content differs from the recorded hash', async () => {
    const originalContent = '# Original'
    const driftedContent = '# Tampered'

    // Manifest records the original hash, but the file on disk has different content
    await writeInstallState(tmpDir, {
      templateVersion: FIXTURE.templateVersion,
      profileHash: FIXTURE.profileHash,
      operations: buildOperations([{ dest: 'CLAUDE.md', content: originalContent }]),
    })

    writeInstalledFiles([{ relPath: 'CLAUDE.md', content: driftedContent }])

    const { files } = await compareInstallState(tmpDir)
    const entry = files.find((f) => f.path === 'CLAUDE.md')

    assert.ok(entry, 'CLAUDE.md must appear in comparison results')
    assert.equal(entry.status, 'drifted')
    assert.equal(entry.expectedHash, sha256(originalContent))
    assert.equal(entry.actualHash, sha256(driftedContent))
  })

  it('reports "missing" for files recorded in the manifest but absent from disk', async () => {
    // Write manifest but do NOT create the file on disk
    await writeInstallState(tmpDir, {
      templateVersion: FIXTURE.templateVersion,
      profileHash: FIXTURE.profileHash,
      operations: buildOperations([{ dest: 'agents/dev.md', content: '# Dev agent' }]),
    })

    const { files } = await compareInstallState(tmpDir)
    const entry = files.find((f) => f.path === 'agents/dev.md')

    assert.ok(entry, 'agents/dev.md must appear in comparison results')
    assert.equal(entry.status, 'missing')
  })

  it('reports "protected" for skip_if_exists files that exist on disk regardless of content', async () => {
    const originalContent = '# User customized this'
    const manifestContent = '# Template default'

    // The file exists with user-modified content; manifest recorded a different hash
    writeInstalledFiles([{ relPath: '.claude/settings.json', content: originalContent }])

    await writeInstallState(tmpDir, {
      templateVersion: FIXTURE.templateVersion,
      profileHash: FIXTURE.profileHash,
      operations: [
        {
          kind: 'create',
          source: 'templates/.claude/settings.json',
          dest: '.claude/settings.json',
          strategy: 'skip_if_exists',
          contentHash: sha256(manifestContent),
        },
      ],
    })

    const { files } = await compareInstallState(tmpDir)
    const entry = files.find((f) => f.path === '.claude/settings.json')

    assert.ok(entry, '.claude/settings.json must appear in comparison results')
    assert.equal(
      entry.status,
      'protected',
      'skip_if_exists files must be reported as "protected" regardless of content match',
    )
  })

  it('reports "protected" for skip_if_exists files even when content matches the manifest hash', async () => {
    const content = '# Exact template default'

    writeInstalledFiles([{ relPath: '.claude/settings.json', content }])

    await writeInstallState(tmpDir, {
      templateVersion: FIXTURE.templateVersion,
      profileHash: FIXTURE.profileHash,
      operations: [
        {
          kind: 'create',
          source: 'templates/.claude/settings.json',
          dest: '.claude/settings.json',
          strategy: 'skip_if_exists',
          contentHash: sha256(content),
        },
      ],
    })

    const { files } = await compareInstallState(tmpDir)
    const entry = files.find((f) => f.path === '.claude/settings.json')

    assert.ok(entry, '.claude/settings.json must appear in comparison results')
    assert.equal(entry.status, 'protected')
  })

  it('summary counts are correct across mixed statuses', async () => {
    const okContent = '# OK file'
    const driftedOriginal = '# Original drifted'
    const driftedActual = '# Actually different'
    const protectedContent = '# User protected'

    // ok file — matches manifest and strategy is overwrite
    writeInstalledFiles([
      { relPath: 'CLAUDE.md', content: okContent },
      // drifted file — on disk with different content
      { relPath: 'agents/dev.md', content: driftedActual },
      // protected file — skip_if_exists and exists
      { relPath: '.claude/settings.json', content: protectedContent },
      // missing file not written to disk at all (agents/reviewer.md)
    ])

    await writeInstallState(tmpDir, {
      templateVersion: FIXTURE.templateVersion,
      profileHash: FIXTURE.profileHash,
      operations: [
        ...buildOperations([{ dest: 'CLAUDE.md', content: okContent }]),
        ...buildOperations([{ dest: 'agents/dev.md', content: driftedOriginal }]),
        ...buildOperations([{ dest: 'agents/reviewer.md', content: '# Reviewer' }]),
        {
          kind: 'create',
          source: 'templates/.claude/settings.json',
          dest: '.claude/settings.json',
          strategy: 'skip_if_exists',
          contentHash: sha256('# Template default'),
        },
      ],
    })

    const { summary, files } = await compareInstallState(tmpDir)

    // Verify individual statuses first to make summary failures diagnosable
    const byPath = Object.fromEntries(files.map((f) => [f.path, f.status]))
    assert.equal(byPath['CLAUDE.md'], 'ok', 'CLAUDE.md should be ok')
    assert.equal(byPath['agents/dev.md'], 'drifted', 'agents/dev.md should be drifted')
    assert.equal(byPath['agents/reviewer.md'], 'missing', 'agents/reviewer.md should be missing')
    assert.equal(byPath['.claude/settings.json'], 'protected', 'settings.json should be protected')

    assert.equal(summary.okCount, 1, 'okCount')
    assert.equal(summary.driftedCount, 1, 'driftedCount')
    assert.equal(summary.missingCount, 1, 'missingCount')
    assert.equal(summary.protectedCount, 1, 'protectedCount')

    // errorCount must be present in summary (zero in the happy path)
    assert.equal(typeof summary.errorCount, 'number', 'summary must include errorCount')
    assert.equal(summary.errorCount, 0, 'errorCount should be 0 when no errors occur')
  })
})
