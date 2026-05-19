/**
 * Install-state manifest — write, read, and drift-compare.
 *
 * Persists a record of every file written during plugin installation to
 * `.claude/install-state.json`. Provides three operations:
 *
 *  - `writeInstallState` — create or overwrite the manifest
 *  - `readInstallState`  — load and validate the manifest
 *  - `compareInstallState` — compare each recorded operation against the filesystem
 *
 * @module scripts/lib/install-state
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { fileContentHash, writeFileAtomic } from './file-operations.js'
import { createValidator } from './schema-validator.js'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MANIFEST_RELATIVE = path.join('.claude', 'install-state.json')
const SCHEMA_ID = 'install-state.schema.json'
const SCHEMA_DIR = fileURLToPath(new URL('../../schemas', import.meta.url))

// ---------------------------------------------------------------------------
// Lazy validator (instantiated once per process)
// ---------------------------------------------------------------------------

/** @type {import('./schema-validator.js').Validator | null} */
let _validator = null

/**
 * Return a cached schema validator instance.
 *
 * @returns {import('./schema-validator.js').Validator}
 */
function getValidator() {
  if (!_validator) {
    _validator = createValidator(SCHEMA_DIR)
  }
  return _validator
}

// ---------------------------------------------------------------------------
// writeInstallState
// ---------------------------------------------------------------------------

/**
 * @typedef {Object} Operation
 * @property {'create'|'merge'} kind        - The type of file operation.
 * @property {string}           source      - Relative path to the source template file.
 * @property {string}           dest        - Relative destination path in the target project.
 * @property {'overwrite'|'skip_if_exists'|'deep_merge'} strategy - Merge strategy used.
 * @property {string}           contentHash - `sha256:<hex>` hash of the written content.
 */

/**
 * @typedef {Object} InstallManifest
 * @property {'install-state.v1'} schema          - Schema identifier.
 * @property {string}             generatedAt     - ISO 8601 timestamp.
 * @property {string}             templateVersion - Semver of the template used.
 * @property {string}             profileHash     - `sha256:<hex>` hash of the profile.
 * @property {Operation[]}        operations      - Recorded file operations.
 */

/**
 * Write the install-state manifest to `<targetDir>/.claude/install-state.json`.
 *
 * The `.claude/` directory is created when absent. Writes are performed
 * atomically via `writeFileAtomic` so readers never observe a partial file.
 *
 * @param {string}   targetDir              - Absolute path of the project root.
 * @param {object}   opts
 * @param {string}   opts.templateVersion   - Semver of the template (e.g. `"1.2.3"`).
 * @param {string}   opts.profileHash       - `sha256:<hex>` hash of the profile content.
 * @param {Operation[]} opts.operations     - Array of file operations to record.
 * @returns {Promise<InstallManifest>} The manifest object that was written.
 */
export async function writeInstallState(targetDir, { templateVersion, profileHash, operations }) {
  const manifestPath = path.join(targetDir, MANIFEST_RELATIVE)

  // Idempotency check: if an existing manifest matches on all meaningful fields
  // (everything except generatedAt), skip the write and return the existing
  // manifest. This prevents the manifest file from getting a new hash on every
  // run when nothing substantive changed.
  if (fs.existsSync(manifestPath)) {
    try {
      const existing = JSON.parse(fs.readFileSync(manifestPath, 'utf8'))
      if (
        existing.schema === 'install-state.v1' &&
        existing.templateVersion === templateVersion &&
        existing.profileHash === profileHash &&
        JSON.stringify(existing.operations) === JSON.stringify(operations)
      ) {
        return existing
      }
    } catch {
      // Unreadable or invalid JSON — fall through to write a fresh manifest
    }
  }

  /** @type {InstallManifest} */
  const manifest = {
    schema: 'install-state.v1',
    generatedAt: new Date().toISOString(),
    templateVersion,
    profileHash,
    operations,
  }

  await writeFileAtomic(manifestPath, JSON.stringify(manifest, null, 2))

  return manifest
}

// ---------------------------------------------------------------------------
// readInstallState
// ---------------------------------------------------------------------------

/**
 * Read and validate the install-state manifest from `<targetDir>/.claude/install-state.json`.
 *
 * @param {string} targetDir - Absolute path of the project root.
 * @returns {Promise<InstallManifest>} The parsed and validated manifest.
 * @throws {Error} When the file is missing, contains invalid JSON, or fails schema validation.
 */
export async function readInstallState(targetDir) {
  const manifestPath = path.join(targetDir, MANIFEST_RELATIVE)

  if (!fs.existsSync(manifestPath)) {
    throw new Error(
      `Install-state manifest not found: ${manifestPath}. ` +
        'Run writeInstallState first to create it.',
    )
  }

  let raw
  try {
    raw = fs.readFileSync(manifestPath, 'utf8')
  } catch (err) {
    throw new Error(`Failed to read install-state manifest at ${manifestPath}: ${err.message}`)
  }

  let manifest
  try {
    manifest = JSON.parse(raw)
  } catch (err) {
    throw new Error(
      `Install-state manifest at ${manifestPath} contains invalid JSON: ${err.message}`,
    )
  }

  const validator = getValidator()
  const result = validator.validate(SCHEMA_ID, manifest)

  if (!result.valid) {
    const details = (result.errors ?? []).map((e) => `  ${e.path}: ${e.message}`).join('\n')
    throw new Error(
      `Install-state manifest failed schema validation:\n${details || '  (no details)'}`,
    )
  }

  return manifest
}

// ---------------------------------------------------------------------------
// compareInstallState
// ---------------------------------------------------------------------------

/**
 * @typedef {'ok'|'drifted'|'missing'|'protected'|'error'} FileStatus
 */

/**
 * @typedef {Object} FileEntry
 * @property {string}          path         - Relative path of the file (from `dest`).
 * @property {FileStatus}      status       - Comparison result.
 * @property {string}          expectedHash - Hash recorded in the manifest.
 * @property {string|undefined} actualHash  - Actual hash on disk (`undefined` when missing/error).
 */

/**
 * @typedef {Object} CompareSummary
 * @property {number} okCount        - Files whose content matches the manifest.
 * @property {number} driftedCount   - Files whose content differs from the manifest.
 * @property {number} missingCount   - Files recorded in the manifest but absent on disk.
 * @property {number} protectedCount - Files with `skip_if_exists` strategy that exist on disk.
 * @property {number} errorCount     - Files that could not be compared due to I/O errors.
 */

/**
 * @typedef {Object} CompareResult
 * @property {CompareSummary} summary - Aggregate counts by status.
 * @property {FileEntry[]}    files   - Per-file comparison results.
 */

/**
 * Read the install-state manifest and compare each operation against the filesystem.
 *
 * Status rules (evaluated in order):
 *  1. Strategy is `skip_if_exists` **and** file exists → `'protected'` (content ignored).
 *  2. File does not exist → `'missing'`.
 *  3. File exists and content hash matches → `'ok'`.
 *  4. File exists and content hash differs → `'drifted'`.
 *
 * @param {string} targetDir - Absolute path of the project root.
 * @returns {Promise<CompareResult>}
 * @throws {Error} When `readInstallState` fails (missing or invalid manifest).
 */
export async function compareInstallState(targetDir) {
  const manifest = await readInstallState(targetDir)

  /** @type {FileEntry[]} */
  const files = []

  const summary = {
    okCount: 0,
    driftedCount: 0,
    missingCount: 0,
    protectedCount: 0,
    errorCount: 0,
  }

  for (const op of manifest.operations) {
    const absolutePath = path.join(targetDir, op.dest)
    const exists = fs.existsSync(absolutePath)

    /** @type {FileEntry} */
    const entry = {
      path: op.dest,
      expectedHash: op.contentHash,
      actualHash: undefined,
      status: /** @type {FileStatus} */ ('ok'),
    }

    // Rule 1: skip_if_exists + file present → protected (content is irrelevant)
    if (op.strategy === 'skip_if_exists' && exists) {
      entry.status = 'protected'
      summary.protectedCount++
      files.push(entry)
      continue
    }

    // Rule 2: file is absent → missing
    if (!exists) {
      entry.status = 'missing'
      summary.missingCount++
      files.push(entry)
      continue
    }

    // Rules 3 & 4: file exists — compare hashes
    try {
      const actualHash = await fileContentHash(absolutePath)
      entry.actualHash = actualHash

      if (actualHash === op.contentHash) {
        entry.status = 'ok'
        summary.okCount++
      } else {
        entry.status = 'drifted'
        summary.driftedCount++
      }
    } catch (err) {
      entry.status = 'error'
      summary.errorCount++
    }

    files.push(entry)
  }

  return { summary, files }
}
