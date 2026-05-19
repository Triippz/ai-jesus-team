/**
 * Doctor — plugin conformance checker CLI.
 *
 * Reads the install-state manifest for a target directory and compares each
 * recorded file against the filesystem, producing a conformance report.
 *
 * Usage:
 *   node scripts/doctor.js --target <dir> [--quick] [--json]
 *
 * Exit codes:
 *   0  all files are ok or protected
 *   1  one or more files are drifted or missing
 *   2  missing or invalid install-state.json, or other fatal error
 *
 * @module scripts/doctor
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { compareInstallState } from './lib/install-state.js'
import { createValidator } from './lib/schema-validator.js'

// ---------------------------------------------------------------------------
// Paths
// ---------------------------------------------------------------------------

const __filename = fileURLToPath(import.meta.url)
const SCHEMAS_DIR = fileURLToPath(new URL('../schemas', import.meta.url))

// ---------------------------------------------------------------------------
// Critical files for --quick mode (Article VI: deterministic, never random)
// ---------------------------------------------------------------------------

/** Files always checked in --quick mode, in priority order. */
const CRITICAL_FILES = new Set([
  'plugin.json',
  '.claude/plugin.json',
  'CLAUDE.md',
  'hooks/hooks.json',
  '.claude/settings.json',
])

// ---------------------------------------------------------------------------
// Help text
// ---------------------------------------------------------------------------

const HELP = `
Usage: node scripts/doctor.js --target <dir> [--quick] [--json]

Options:
  --target <dir>  Path to target project with installed plugin (required)
  --quick         Check only critical files (plugin.json, CLAUDE.md, hooks, first 3 agents)
  --json          Machine-readable JSON output
  --help          Show this help message
`.trim()

// ---------------------------------------------------------------------------
// CLI argument parser
// ---------------------------------------------------------------------------

/**
 * @typedef {Object} CliArgs
 * @property {string|null} target - Absolute path of the project root to check
 * @property {boolean}     quick  - Only check critical files + first 3 agents
 * @property {boolean}     json   - Emit JSON output instead of human-readable
 * @property {boolean}     help   - Print help and exit
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
    quick: false,
    json: false,
    help: false,
  }

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    if (arg === '--target' && argv[i + 1]) {
      args.target = argv[++i]
    } else if (arg === '--quick') {
      args.quick = true
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
// Quick-mode filter
// ---------------------------------------------------------------------------

/**
 * Determine whether a file path is an agent file.
 *
 * Agent files live under `agents/` (or `.claude/agents/`) and end with `.md`.
 *
 * @param {string} filePath - Relative path from the install-state manifest.
 * @returns {boolean}
 */
function isAgentFile(filePath) {
  const normalized = filePath.replace(/\\/g, '/')
  return (
    (normalized.startsWith('agents/') || normalized.startsWith('.claude/agents/')) &&
    normalized.endsWith('.md')
  )
}

/**
 * Filter the list of files to only the ones that --quick mode should check:
 *   1. Files whose path matches a known critical-file pattern.
 *   2. The first 3 agent files, sorted alphabetically by path (deterministic).
 *
 * @param {import('./lib/install-state.js').FileEntry[]} files
 * @returns {import('./lib/install-state.js').FileEntry[]}
 */
function filterQuickFiles(files) {
  const criticalEntries = files.filter((f) => CRITICAL_FILES.has(f.path))

  const agentEntries = files
    .filter((f) => isAgentFile(f.path))
    .sort((a, b) => a.path.localeCompare(b.path))
    .slice(0, 3)

  // Deduplicate by path (a critical file could theoretically also be an agent)
  const seen = new Set()
  const result = []
  for (const entry of [...criticalEntries, ...agentEntries]) {
    if (!seen.has(entry.path)) {
      seen.add(entry.path)
      result.push(entry)
    }
  }

  return result
}

/**
 * Recompute summary counts from a filtered file list.
 *
 * @param {import('./lib/install-state.js').FileEntry[]} files
 * @returns {import('./lib/install-state.js').CompareSummary}
 */
function recomputeSummary(files) {
  const summary = {
    okCount: 0,
    driftedCount: 0,
    missingCount: 0,
    protectedCount: 0,
    errorCount: 0,
  }
  for (const f of files) {
    switch (f.status) {
      case 'ok':        summary.okCount++;        break
      case 'drifted':   summary.driftedCount++;   break
      case 'missing':   summary.missingCount++;   break
      case 'protected': summary.protectedCount++; break
      case 'error':     summary.errorCount++;     break
    }
  }
  return summary
}

// ---------------------------------------------------------------------------
// Human-readable renderer
// ---------------------------------------------------------------------------

/**
 * Status icons and labels for human-readable output.
 *
 * @type {Record<string, {icon: string, label: string}>}
 */
const STATUS_DISPLAY = {
  ok:        { icon: '✓', label: 'ok' },
  drifted:   { icon: '✗', label: 'drifted' },
  missing:   { icon: '⊘', label: 'missing' },
  protected: { icon: '⊙', label: 'protected' },
  error:     { icon: '!', label: 'error' },
}

/**
 * Print a human-readable conformance report to stdout.
 *
 * @param {object} report - The conformance report object.
 * @param {boolean} quickMode - Whether --quick mode was used.
 */
function printHumanReport(report, quickMode) {
  const { summary, files } = report
  const total = files.length

  console.log(`\nConformance report — ${report.checkedAt}`)
  if (quickMode) {
    console.log('Mode: quick (critical files only)')
  }
  console.log(`Files checked: ${total}\n`)

  for (const f of files) {
    const display = STATUS_DISPLAY[f.status] ?? { icon: '?', label: f.status }
    let line = `  ${display.icon} ${f.path}`
    if (f.status === 'drifted' && f.expectedHash && f.actualHash) {
      line += `\n      expected: ${f.expectedHash}`
      line += `\n      actual:   ${f.actualHash}`
    }
    console.log(line)
  }

  console.log('\n--- Summary ---')
  console.log(`  ok:        ${summary.okCount}`)
  console.log(`  drifted:   ${summary.driftedCount}`)
  console.log(`  missing:   ${summary.missingCount}`)
  console.log(`  protected: ${summary.protectedCount}`)
  if (summary.errorCount > 0) {
    console.log(`  error:     ${summary.errorCount}`)
  }

  const hasIssues = summary.driftedCount > 0 || summary.missingCount > 0 || summary.errorCount > 0
  console.log(hasIssues ? '\nStatus: DRIFT DETECTED' : '\nStatus: OK')
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
  if (!args.target) {
    err('Error: --target <dir> is required')
    err('Usage: node scripts/doctor.js --target <dir> [--quick] [--json]')
    return 2
  }

  const targetDir = path.resolve(args.target)

  // ------------------------------------------------------------------
  // 2. Verify target directory exists
  // ------------------------------------------------------------------
  if (!fs.existsSync(targetDir)) {
    err(`Error: target directory not found: ${targetDir}`)
    return 2
  }

  // ------------------------------------------------------------------
  // 3. Read install-state manifest and compare filesystem against it.
  //    A single try/catch covers both missing-manifest and comparison
  //    failures, avoiding the double readInstallState call that the
  //    previous two-step pattern required.
  // ------------------------------------------------------------------
  let compareResult
  try {
    compareResult = await compareInstallState(targetDir)
  } catch (e) {
    err(`Error: could not read install-state manifest.`)
    err(`  ${e.message}`)
    err(`  Run the install command first to create .claude/install-state.json`)
    return 2
  }

  let { summary, files } = compareResult

  // ------------------------------------------------------------------
  // 4. Apply --quick filter AFTER comparison (so hashes are already computed)
  // ------------------------------------------------------------------
  if (args.quick) {
    files = filterQuickFiles(files)
    summary = recomputeSummary(files)
  }

  // ------------------------------------------------------------------
  // 5. Build the conformance report
  // ------------------------------------------------------------------

  /**
   * @type {import('../schemas/conformance-report.schema.json')}
   */
  const report = {
    schema: 'conformance-report.v1',
    checkedAt: new Date().toISOString(),
    summary,
    files: files.map((f) => {
      /** @type {object} */
      const entry = { path: f.path, status: f.status }
      if (f.expectedHash !== undefined) {
        entry.expectedHash = f.expectedHash
      }
      if (f.actualHash !== undefined && f.actualHash !== null) {
        entry.actualHash = f.actualHash
      }
      return entry
    }),
  }

  // ------------------------------------------------------------------
  // 6. Output
  // ------------------------------------------------------------------
  if (jsonMode) {
    // Validate report against the conformance-report schema before emitting
    try {
      const validator = createValidator(SCHEMAS_DIR)
      const result = validator.validate('conformance-report.schema.json', report)
      if (!result.valid) {
        const details = (result.errors ?? []).map((e) => `  ${e.path}: ${e.message}`).join('\n')
        err(`Warning: conformance report failed schema validation:\n${details}`)
      }
    } catch (validationErr) {
      err(`Warning: could not validate conformance report — ${validationErr.message}`)
    }

    console.log(JSON.stringify(report, null, 2))
  } else {
    printHumanReport(report, args.quick)
  }

  // ------------------------------------------------------------------
  // 7. Exit code
  // ------------------------------------------------------------------
  const hasIssues = summary.driftedCount > 0 || summary.missingCount > 0 || summary.errorCount > 0
  return hasIssues ? 1 : 0
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
