/**
 * Atomic file write utilities with content-hash deduplication.
 *
 * Provides safe, idempotent file operations suitable for code generators and
 * scaffolding tools. All write operations go through a `.tmp` staging file and
 * are finalized with a rename so that readers never observe a partial write.
 *
 * @module scripts/lib/file-operations
 */

import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'

// ---------------------------------------------------------------------------
// STATUS enum
// ---------------------------------------------------------------------------

/**
 * Canonical status values returned by file operations.
 *
 * @readonly
 * @enum {string}
 */
export const STATUS = Object.freeze({
  CREATED: 'created',
  UPDATED: 'updated',
  SKIPPED: 'skipped',
  PROTECTED: 'protected',
  MERGED: 'merged',
  CONFLICTED: 'conflicted',
})

// ---------------------------------------------------------------------------
// Hashing
// ---------------------------------------------------------------------------

/**
 * Compute a SHA-256 hash of a string, prefixed with `sha256:`.
 *
 * @param {string} content - The string to hash.
 * @returns {string} Hash in the form `sha256:<64 hex chars>`.
 */
export function contentHash(content) {
  const hex = crypto.createHash('sha256').update(content).digest('hex')
  return `sha256:${hex}`
}

/**
 * Read a file from disk and return its content hash.
 *
 * @param {string} filePath - Absolute path to the file.
 * @returns {string} Hash in the form `sha256:<64 hex chars>`.
 */
export function fileContentHash(filePath) {
  const content = fs.readFileSync(filePath, 'utf8')
  return contentHash(content)
}

// ---------------------------------------------------------------------------
// Atomic write
// ---------------------------------------------------------------------------

/**
 * Write `content` to `filePath` atomically via a `.tmp` staging file.
 *
 * - If the file does not exist, it is created → `STATUS.CREATED`.
 * - If the file exists and the content hash matches → `STATUS.SKIPPED` (no I/O).
 * - If the file exists and the content differs → `STATUS.UPDATED`.
 *
 * Parent directories are created automatically.
 *
 * @param {string} filePath - Absolute destination path.
 * @param {string} content  - UTF-8 string to write.
 * @returns {Promise<{path: string, status: string}>}
 */
export async function writeFileAtomic(filePath, content) {
  const dir = path.dirname(filePath)
  fs.mkdirSync(dir, { recursive: true })

  const fileExists = fs.existsSync(filePath)

  if (fileExists) {
    const existingHash = fileContentHash(filePath)
    const newHash = contentHash(content)

    if (existingHash === newHash) {
      return { path: filePath, status: STATUS.SKIPPED }
    }
  }

  const tmpPath = `${filePath}.tmp`

  try {
    fs.writeFileSync(tmpPath, content, 'utf8')
    fs.renameSync(tmpPath, filePath)
  } catch (err) {
    // Best-effort cleanup of the staging file.
    try {
      fs.unlinkSync(tmpPath)
    } catch {
      // Ignore cleanup errors — the original error is more important.
    }
    throw err
  }

  return {
    path: filePath,
    status: fileExists ? STATUS.UPDATED : STATUS.CREATED,
  }
}

// ---------------------------------------------------------------------------
// Skip-if-exists write
// ---------------------------------------------------------------------------

/**
 * Write `content` to `filePath` only if the file does not already exist.
 *
 * - If the file does not exist → delegates to `writeFileAtomic` → `STATUS.CREATED`.
 * - If the file already exists → returns `STATUS.PROTECTED` without reading it.
 *
 * @param {string} filePath - Absolute destination path.
 * @param {string} content  - UTF-8 string to write.
 * @returns {Promise<{path: string, status: string}>}
 */
export async function writeFileIfNotExists(filePath, content) {
  if (fs.existsSync(filePath)) {
    return { path: filePath, status: STATUS.PROTECTED }
  }

  return writeFileAtomic(filePath, content)
}
