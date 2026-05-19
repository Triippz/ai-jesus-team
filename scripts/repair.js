/**
 * Repair — plugin conformance repair CLI.
 *
 * Reads the install-state manifest for a target directory, detects drifted or
 * missing files via compareInstallState, and restores them by copying the
 * canonical content from a source directory (the generated plugin output).
 *
 * Files recorded with `skip_if_exists` strategy are never overwritten — they
 * are reported as `protected` regardless of whether they drifted.
 *
 * Usage:
 *   node scripts/repair.js --target <dir> --source <dir> [--dry-run] [--json]
 *
 * Exit codes:
 *   0  all files repaired (or nothing needed repairing)
 *   1  one or more files could not be repaired (source file missing, I/O error)
 *   2  missing or invalid install-state.json, missing required args, or other fatal error
 *
 * @module scripts/repair
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { readInstallState, compareInstallState, writeInstallState } from './lib/install-state.js'
import { writeFileAtomic, contentHash, STATUS } from './lib/file-operations.js'

// ---------------------------------------------------------------------------
// Paths
// ---------------------------------------------------------------------------

const __filename = fileURLToPath(import.meta.url)

// ---------------------------------------------------------------------------
// Help text
// ---------------------------------------------------------------------------

const HELP = `
Usage: node scripts/repair.js --target <dir> --source <dir> [--dry-run] [--json]

Options:
  --target <dir>  Path to target project with installed plugin (required)
  --source <dir>  Path to generated plugin (source of truth) (required)
  --dry-run       Show what would be repaired without writing files
  --json          Machine-readable JSON output
  --help          Show this help message
`.trim()

// ---------------------------------------------------------------------------
// CLI argument parser
// ---------------------------------------------------------------------------

/**
 * @typedef {Object} CliArgs
 * @property {string|null} target  - Absolute path of the project root to repair
 * @property {string|null} source  - Absolute path of the generated plugin (source of truth)
 * @property {boolean}     dryRun  - Print what would be repaired without writing files
 * @property {boolean}     json    - Emit JSON output instead of human-readable
 * @property {boolean}     help    - Print help and exit
 */

/**
 * Parse process.argv manually — no third-party arg parser.
 *
 * @param {string[]} argv - Typically process.argv.slice(2)
 * @returns {CliArgs}
 */
function parseArgs(argv) {
  const args = {
    target: null,
    source: null,
    dryRun: false,
    json: false,
    help: false,
  }

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    if (arg === '--target' && argv[i + 1]) {
      args.target = argv[++i]
    } else if (arg === '--source' && argv[i + 1]) {
      args.source = argv[++i]
    } else if (arg === '--dry-run') {
      args.dryRun = true
    } else if (arg === '--json') {
      args.json = true
    } else if (arg === '--help') {
      args.help = true
    }
  }

  return args
}

// ---------------------------------------------------------------------------
// Output helpers
// ---------------------------------------------------------------------------

/**
 * Print to stdout when not in JSON mode.
 *
 * @param {boolean} jsonMode
 * @param {...unknown} parts
 */
function log(jsonMode, ...parts) {
  if (!jsonMode) {
    console.log(...parts)
  }
}

/**
 * Print to stderr unconditionally.
 *
 * @param {...unknown} parts
 */
function err(...parts) {
  console.error(...parts)
}

// ---------------------------------------------------------------------------
// Repair result types
// ---------------------------------------------------------------------------

/**
 * @typedef {'created'|'updated'|'protected'|'skipped'|'error'} RepairStatus
 *
 * @typedef {Object} RepairEntry
 * @property {string}       path     - Relative path of the file.
 * @property {RepairStatus} status   - Result of the repair attempt.
 * @property {string}       [reason] - Human-readable reason (for error/protected/skipped).
 */

// ---------------------------------------------------------------------------
// Human-readable renderer
// ---------------------------------------------------------------------------

/**
 * @type {Record<string, string>}
 */
const STATUS_ICONS = {
  created:   '+',
  updated:   '~',
  protected: 'P',
  skipped:   '-',
  error:     '!',
}

/**
 * Print a human-readable repair report to stdout.
 *
 * @param {object} report
 */
function printHumanReport(report) {
  const { summary, files, dryRun } = report

  console.log(`\nRepair report — ${report.repairedAt}`)
  if (dryRun) {
    console.log('Mode: dry-run (no files written)')
  }
  console.log(`Files examined: ${files.length}\n`)

  for (const f of files) {
    const icon = STATUS_ICONS[f.status] ?? '?'
    let line = `  [${icon}] ${f.path}`
    if (f.reason) {
      line += ` — ${f.reason}`
    }
    console.log(line)
  }

  console.log('\n--- Summary ---')
  console.log(`  created:   ${summary.createdCount}`)
  console.log(`  updated:   ${summary.updatedCount}`)
  console.log(`  protected: ${summary.protectedCount}`)
  console.log(`  skipped:   ${summary.skippedCount}`)
  if (summary.errorCount > 0) {
    console.log(`  error:     ${summary.errorCount}`)
  }

  if (dryRun) {
    console.log('\nStatus: DRY RUN — no changes made')
  } else if (summary.errorCount > 0) {
    console.log('\nStatus: REPAIR INCOMPLETE')
  } else if (summary.createdCount + summary.updatedCount === 0) {
    console.log('\nStatus: OK — nothing to repair')
  } else {
    console.log('\nStatus: REPAIRED')
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

/**
 * Main entry point. Returns exit code.
 *
 * @param {string[]} argv - process.argv.slice(2)
 * @returns {Promise<number>} exit code
 */
export async function main(argv) {
  const args = parseArgs(argv)
  const jsonMode = args.json

  // ------------------------------------------------------------------
  // 0. --help
  // ------------------------------------------------------------------
  if (args.help) {
    console.log(HELP)
    return 0
  }

  // ------------------------------------------------------------------
  // 1. Validate required arguments
  // ------------------------------------------------------------------
  if (!args.target || !args.source) {
    err('Error: --target <dir> and --source <dir> are both required')
    err('Usage: node scripts/repair.js --target <dir> --source <dir> [--dry-run] [--json]')
    return 2
  }

  const targetDir = path.resolve(args.target)
  const sourceDir = path.resolve(args.source)

  // ------------------------------------------------------------------
  // 2. Verify directories exist
  // ------------------------------------------------------------------
  if (!fs.existsSync(targetDir)) {
    err(`Error: target directory not found: ${targetDir}`)
    return 2
  }

  if (!fs.existsSync(sourceDir)) {
    err(`Error: source directory not found: ${sourceDir}`)
    return 2
  }

  // ------------------------------------------------------------------
  // 3. Read install-state manifest (exit 2 on failure)
  // ------------------------------------------------------------------
  let manifest
  try {
    manifest = await readInstallState(targetDir)
  } catch (e) {
    err('Error: could not read install-state manifest.')
    err(`  ${e.message}`)
    err('  Run the install/generate command first to create .claude/install-state.json')
    return 2
  }

  // ------------------------------------------------------------------
  // 4. Compare filesystem against manifest to find drift/missing
  // ------------------------------------------------------------------
  let compareResult
  try {
    compareResult = await compareInstallState(targetDir)
  } catch (e) {
    err(`Error: comparison failed — ${e.message}`)
    return 2
  }

  const { files: compareFiles } = compareResult

  // Build a quick lookup from dest path → operation for strategy access
  /** @type {Map<string, object>} */
  const opByDest = new Map(manifest.operations.map((op) => [op.dest, op]))

  // ------------------------------------------------------------------
  // 5. Process each file — repair drifted/missing, protect skip_if_exists
  // ------------------------------------------------------------------

  /** @type {RepairEntry[]} */
  const repairEntries = []

  /** @type {Array<{op: object, content: string}>} */
  const repairedOps = []

  for (const fileEntry of compareFiles) {
    const op = opByDest.get(fileEntry.path)

    // Already ok — skip
    if (fileEntry.status === 'ok') {
      repairEntries.push({ path: fileEntry.path, status: 'skipped', reason: 'already ok' })
      continue
    }

    // Protected — skip_if_exists and file exists — never overwrite
    if (fileEntry.status === 'protected') {
      repairEntries.push({ path: fileEntry.path, status: 'protected', reason: 'skip_if_exists strategy' })
      continue
    }

    // For drifted or missing files, check strategy first
    if (op && op.strategy === 'skip_if_exists') {
      // File is missing with skip_if_exists — this is an unusual state.
      // We restore it (the user deleted it; it's not present to protect).
      // Fall through to repair logic below.
    }

    // Try to read content from source directory
    const sourcePath = path.join(sourceDir, fileEntry.path)

    if (!fs.existsSync(sourcePath)) {
      repairEntries.push({
        path: fileEntry.path,
        status: 'error',
        reason: `source file not found: ${sourcePath}`,
      })
      continue
    }

    let sourceContent
    try {
      sourceContent = fs.readFileSync(sourcePath, 'utf8')
    } catch (readErr) {
      repairEntries.push({
        path: fileEntry.path,
        status: 'error',
        reason: `could not read source file: ${readErr.message}`,
      })
      continue
    }

    if (args.dryRun) {
      // Dry-run: record what would happen, but do not write
      const wouldStatus = fileEntry.status === 'missing' ? 'created' : 'updated'
      repairEntries.push({ path: fileEntry.path, status: wouldStatus, reason: 'dry-run' })
      continue
    }

    // Write the file
    const destPath = path.join(targetDir, fileEntry.path)
    let writeResult
    try {
      writeResult = await writeFileAtomic(destPath, sourceContent)
    } catch (writeErr) {
      repairEntries.push({
        path: fileEntry.path,
        status: 'error',
        reason: `write failed: ${writeErr.message}`,
      })
      continue
    }

    const repairStatus = writeResult.status === STATUS.CREATED ? 'created'
      : writeResult.status === STATUS.UPDATED ? 'updated'
      : 'skipped'

    repairEntries.push({ path: fileEntry.path, status: repairStatus })

    // Track repaired op for manifest update
    if (repairStatus === 'created' || repairStatus === 'updated') {
      repairedOps.push({ op, content: sourceContent })
    }
  }

  // ------------------------------------------------------------------
  // 6. Update install-state for repaired files (only when not dry-run)
  // ------------------------------------------------------------------
  if (!args.dryRun && repairedOps.length > 0) {
    // Build updated operations array: replace contentHash for repaired files
    const repairedDestSet = new Set(repairedOps.map(({ op }) => op.dest))
    const repairedContentByDest = new Map(
      repairedOps.map(({ op, content }) => [op.dest, contentHash(content)]),
    )

    const updatedOperations = manifest.operations.map((op) => {
      if (repairedDestSet.has(op.dest)) {
        return { ...op, contentHash: repairedContentByDest.get(op.dest) }
      }
      return op
    })

    try {
      await writeInstallState(targetDir, {
        templateVersion: manifest.templateVersion,
        profileHash: manifest.profileHash,
        operations: updatedOperations,
      })
    } catch (manifestErr) {
      // Non-fatal — warn but continue
      err(`Warning: could not update install-state manifest: ${manifestErr.message}`)
    }
  }

  // ------------------------------------------------------------------
  // 7. Build summary
  // ------------------------------------------------------------------
  const summary = {
    createdCount:   repairEntries.filter((e) => e.status === 'created').length,
    updatedCount:   repairEntries.filter((e) => e.status === 'updated').length,
    protectedCount: repairEntries.filter((e) => e.status === 'protected').length,
    skippedCount:   repairEntries.filter((e) => e.status === 'skipped').length,
    errorCount:     repairEntries.filter((e) => e.status === 'error').length,
  }

  const report = {
    repairedAt: new Date().toISOString(),
    dryRun: args.dryRun,
    summary,
    files: repairEntries,
  }

  // ------------------------------------------------------------------
  // 8. Output
  // ------------------------------------------------------------------
  if (jsonMode) {
    console.log(JSON.stringify(report, null, 2))
  } else {
    printHumanReport(report)
  }

  // ------------------------------------------------------------------
  // 9. Exit code
  // ------------------------------------------------------------------
  return summary.errorCount > 0 ? 1 : 0
}

// ---------------------------------------------------------------------------
// Entrypoint — only runs when executed directly
// ---------------------------------------------------------------------------

const isMain =
  process.argv[1] &&
  path.resolve(process.argv[1]) === path.resolve(__filename)

if (isMain) {
  main(process.argv.slice(2)).then((code) => {
    process.exit(code)
  })
}
