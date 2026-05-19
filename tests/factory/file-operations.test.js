/**
 * Tests for scripts/lib/file-operations.js
 *
 * Covers atomic writes, skip-if-exists semantics, content hashing,
 * and parent directory creation.
 *
 * @module tests/factory/file-operations.test
 */

import { describe, it, beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'

import {
  writeFileAtomic,
  writeFileIfNotExists,
  contentHash,
  fileContentHash,
  STATUS,
} from '../../scripts/lib/file-operations.js'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Create a unique temp directory for an individual test and return its path.
 *
 * @returns {string} Absolute path of the created temp directory.
 */
function makeTempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'file-ops-test-'))
}

/**
 * Recursively remove a directory, silently ignoring missing paths.
 *
 * @param {string} dirPath - Absolute path to remove.
 */
function removeTempDir(dirPath) {
  fs.rmSync(dirPath, { recursive: true, force: true })
}

// ---------------------------------------------------------------------------
// STATUS enum
// ---------------------------------------------------------------------------

describe('STATUS enum', () => {
  it('exports expected status constants', () => {
    assert.equal(STATUS.CREATED, 'created')
    assert.equal(STATUS.UPDATED, 'updated')
    assert.equal(STATUS.SKIPPED, 'skipped')
    assert.equal(STATUS.PROTECTED, 'protected')
    assert.equal(STATUS.MERGED, 'merged')
    assert.equal(STATUS.CONFLICTED, 'conflicted')
  })
})

// ---------------------------------------------------------------------------
// writeFileAtomic
// ---------------------------------------------------------------------------

describe('writeFileAtomic', () => {
  /** @type {string} */
  let tmpDir

  beforeEach(() => {
    tmpDir = makeTempDir()
  })

  afterEach(() => {
    removeTempDir(tmpDir)
  })

  it('creates a new file and returns status "created"', async () => {
    const filePath = path.join(tmpDir, 'new-file.txt')
    const result = await writeFileAtomic(filePath, 'hello world')

    assert.equal(result.status, STATUS.CREATED)
    assert.equal(result.path, filePath)
    assert.equal(fs.readFileSync(filePath, 'utf8'), 'hello world')
  })

  it('overwrites an existing file with different content and returns status "updated"', async () => {
    const filePath = path.join(tmpDir, 'existing.txt')
    fs.writeFileSync(filePath, 'original content', 'utf8')

    const result = await writeFileAtomic(filePath, 'new content')

    assert.equal(result.status, STATUS.UPDATED)
    assert.equal(result.path, filePath)
    assert.equal(fs.readFileSync(filePath, 'utf8'), 'new content')
  })

  it('skips write when content is identical to existing file and returns status "skipped"', async () => {
    const filePath = path.join(tmpDir, 'same.txt')
    const content = 'unchanged content'
    fs.writeFileSync(filePath, content, 'utf8')

    const mtimeBefore = fs.statSync(filePath).mtimeMs

    const result = await writeFileAtomic(filePath, content)

    assert.equal(result.status, STATUS.SKIPPED)
    assert.equal(result.path, filePath)

    // File should not have been touched; mtime must remain the same.
    const mtimeAfter = fs.statSync(filePath).mtimeMs
    assert.equal(mtimeAfter, mtimeBefore, 'mtime should be unchanged for a skipped write')
  })

  it('leaves no .tmp file after a successful atomic write', async () => {
    const filePath = path.join(tmpDir, 'atomic.txt')
    await writeFileAtomic(filePath, 'data')

    const tmpFile = filePath + '.tmp'
    assert.equal(
      fs.existsSync(tmpFile),
      false,
      'temporary .tmp file should be cleaned up after write',
    )
  })

  it('creates parent directories when they do not exist', async () => {
    const filePath = path.join(tmpDir, 'deep', 'nested', 'dir', 'file.txt')
    const result = await writeFileAtomic(filePath, 'nested content')

    assert.equal(result.status, STATUS.CREATED)
    assert.equal(fs.existsSync(filePath), true)
    assert.equal(fs.readFileSync(filePath, 'utf8'), 'nested content')
  })
})

// ---------------------------------------------------------------------------
// writeFileIfNotExists
// ---------------------------------------------------------------------------

describe('writeFileIfNotExists', () => {
  /** @type {string} */
  let tmpDir

  beforeEach(() => {
    tmpDir = makeTempDir()
  })

  afterEach(() => {
    removeTempDir(tmpDir)
  })

  it('creates a file when it does not exist and returns status "created"', async () => {
    const filePath = path.join(tmpDir, 'brand-new.txt')
    const result = await writeFileIfNotExists(filePath, 'initial content')

    assert.equal(result.status, STATUS.CREATED)
    assert.equal(result.path, filePath)
    assert.equal(fs.readFileSync(filePath, 'utf8'), 'initial content')
  })

  it('returns status "protected" and preserves original content when file already exists', async () => {
    const filePath = path.join(tmpDir, 'protected.txt')
    const originalContent = 'do not overwrite me'
    fs.writeFileSync(filePath, originalContent, 'utf8')

    const result = await writeFileIfNotExists(filePath, 'attempted overwrite')

    assert.equal(result.status, STATUS.PROTECTED)
    assert.equal(result.path, filePath)
    assert.equal(
      fs.readFileSync(filePath, 'utf8'),
      originalContent,
      'existing file content must remain unchanged',
    )
  })
})

// ---------------------------------------------------------------------------
// contentHash
// ---------------------------------------------------------------------------

describe('contentHash', () => {
  it('returns a consistent sha256 hash for the same input', () => {
    const hash1 = contentHash('hello')
    const hash2 = contentHash('hello')
    assert.equal(hash1, hash2)
  })

  it('returns different hashes for different inputs', () => {
    const hash1 = contentHash('hello')
    const hash2 = contentHash('world')
    assert.notEqual(hash1, hash2)
  })

  it('output matches the pattern sha256:<64 hex chars>', () => {
    const hash = contentHash('test content')
    assert.match(hash, /^sha256:[0-9a-f]{64}$/)
  })
})

// ---------------------------------------------------------------------------
// fileContentHash
// ---------------------------------------------------------------------------

describe('fileContentHash', () => {
  /** @type {string} */
  let tmpDir

  beforeEach(() => {
    tmpDir = makeTempDir()
  })

  afterEach(() => {
    removeTempDir(tmpDir)
  })

  it('returns the same hash as contentHash for identical content', async () => {
    const content = 'hash me please'
    const filePath = path.join(tmpDir, 'hashable.txt')
    fs.writeFileSync(filePath, content, 'utf8')

    const fromFile = await fileContentHash(filePath)
    const fromString = contentHash(content)

    assert.equal(fromFile, fromString)
  })
})
