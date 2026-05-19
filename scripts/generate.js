/**
 * Plugin template factory — CLI entry point.
 *
 * Usage:
 *   node scripts/generate.js --profile <path> [--output <dir>] [--templates <dir>] [--update] [--dry-run] [--json]
 *
 * Exit codes:
 *   0  success
 *   1  validation error (bad profile, schema failure)
 *   2  template/IO error
 *   3  update completed but conflicts were detected
 *
 * @module scripts/generate
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { resolveGeneratePlan } from './lib/plan-resolver.js';
import {
  writeFileAtomic,
  writeFileIfNotExists,
  contentHash,
  fileContentHash,
  STATUS,
} from './lib/file-operations.js';
import { deepMerge } from './lib/deep-merge.js';
import { readInstallState, writeInstallState } from './lib/install-state.js';
import { createValidator } from './lib/schema-validator.js';

// ---------------------------------------------------------------------------
// Paths
// ---------------------------------------------------------------------------

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const TEMPLATES_DIR = fileURLToPath(new URL('../templates', import.meta.url));
const SCHEMAS_DIR = fileURLToPath(new URL('../schemas', import.meta.url));

/**
 * Template version — read from package.json at the project root.
 * @returns {string}
 */
function readTemplateVersion() {
  try {
    const pkgPath = fileURLToPath(new URL('../package.json', import.meta.url));
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
    return pkg.version ?? '0.0.0';
  } catch {
    return '0.0.0';
  }
}

// ---------------------------------------------------------------------------
// Help text
// ---------------------------------------------------------------------------

const HELP = `
Usage: node scripts/generate.js --profile <path> [--output <dir>] [--update] [--dry-run] [--json]

Options:
  --profile <path>  Path to project profile JSON (required)
  --output <dir>    Output directory (default: generated/<name>-superpowers/)
  --update          Update mode: propagate template changes to existing plugin
  --dry-run         Show what would be generated without writing files
  --json            Machine-readable JSON output
  --help            Show this help message
`.trim();

// ---------------------------------------------------------------------------
// CLI argument parser
// ---------------------------------------------------------------------------

/**
 * @typedef {Object} CliArgs
 * @property {string|null}  profile    - Path to profile JSON
 * @property {string|null}  output     - Output directory override
 * @property {string|null}  templates  - Templates directory override (for testing)
 * @property {boolean}      update     - Run in update mode (diff against install-state)
 * @property {boolean}      dryRun     - Print plan without writing files
 * @property {boolean}      json       - Emit JSON output
 * @property {boolean}      help       - Print help and exit
 */

/**
 * Parse process.argv manually — no third-party arg parser.
 *
 * @param {string[]} argv - Typically process.argv.slice(2)
 * @returns {CliArgs}
 */
function parseArgs(argv) {
  const args = {
    profile: null,
    output: null,
    templates: null,
    update: false,
    dryRun: false,
    json: false,
    help: false,
  };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--profile' && argv[i + 1]) {
      args.profile = argv[++i];
    } else if (arg === '--output' && argv[i + 1]) {
      args.output = argv[++i];
    } else if (arg === '--templates' && argv[i + 1]) {
      args.templates = argv[++i];
    } else if (arg === '--update') {
      args.update = true;
    } else if (arg === '--dry-run') {
      args.dryRun = true;
    } else if (arg === '--json') {
      args.json = true;
    } else if (arg === '--help') {
      args.help = true;
    }
  }

  return args;
}

// ---------------------------------------------------------------------------
// Output helpers
// ---------------------------------------------------------------------------

/**
 * Print a message to stdout, conditionally suppressed when JSON mode is active
 * (except for the final JSON payload itself).
 *
 * @param {boolean} jsonMode
 * @param {...unknown} parts
 */
function log(jsonMode, ...parts) {
  if (!jsonMode) {
    console.log(...parts);
  }
}

/**
 * Print to stderr unconditionally.
 *
 * @param {...unknown} parts
 */
function err(...parts) {
  console.error(...parts);
}

// ---------------------------------------------------------------------------
// Result record
// ---------------------------------------------------------------------------

/**
 * @typedef {'created'|'updated'|'skipped'|'protected'|'merged'|'conflicted'|'orphaned'} OpStatus
 *
 * @typedef {Object} OperationResult
 * @property {string}   dest     - Relative destination path
 * @property {string}   strategy - Write strategy used
 * @property {OpStatus} status   - Outcome of the write
 * @property {string}   hash     - sha256 hash of final content written
 * @property {'create'|'merge'} kind - manifest operation kind
 */

// ---------------------------------------------------------------------------
// Core generator
// ---------------------------------------------------------------------------

/**
 * Execute a single plan operation and return a result record.
 *
 * @param {import('./lib/plan-resolver.js').Operation} op
 * @param {string} outputDir - Absolute output directory path
 * @returns {Promise<OperationResult>}
 */
async function executeOperation(op, outputDir) {
  const destAbsolute = path.join(outputDir, op.dest);

  switch (op.strategy) {
    case 'skip_if_exists': {
      const result = await writeFileIfNotExists(destAbsolute, op.templateContent);
      return {
        dest: op.dest,
        strategy: op.strategy,
        status: /** @type {OpStatus} */ (result.status),
        hash: contentHash(op.templateContent),
        kind: 'create',
      };
    }

    case 'deep_merge': {
      let finalContent = op.templateContent;

      if (fs.existsSync(destAbsolute)) {
        let existingData;
        let incomingData;

        try {
          existingData = JSON.parse(fs.readFileSync(destAbsolute, 'utf8'));
          incomingData = JSON.parse(op.templateContent);
        } catch (parseErr) {
          // If either side is not valid JSON, fall back to atomic overwrite
          const writeResult = await writeFileAtomic(destAbsolute, op.templateContent);
          return {
            dest: op.dest,
            strategy: op.strategy,
            status: /** @type {OpStatus} */ (writeResult.status),
            hash: contentHash(op.templateContent),
            kind: 'merge',
          };
        }

        const { result: merged } = deepMerge(existingData, incomingData);
        finalContent = JSON.stringify(merged, null, 2);
        const writeResult = await writeFileAtomic(destAbsolute, finalContent);
        return {
          dest: op.dest,
          strategy: op.strategy,
          status: writeResult.status === STATUS.SKIPPED
            ? STATUS.SKIPPED
            : STATUS.MERGED,
          hash: contentHash(finalContent),
          kind: 'merge',
        };
      }

      // File does not exist — normalize through JSON round-trip so the initial
      // write has the same format as subsequent deep_merge writes, ensuring
      // idempotency on the second run.
      try {
        const parsed = JSON.parse(finalContent);
        finalContent = JSON.stringify(parsed, null, 2);
      } catch {
        // Not valid JSON — write as-is (unusual for deep_merge targets, but safe)
      }
      const writeResult = await writeFileAtomic(destAbsolute, finalContent);
      return {
        dest: op.dest,
        strategy: op.strategy,
        status: /** @type {OpStatus} */ (writeResult.status),
        hash: contentHash(finalContent),
        kind: 'merge',
      };
    }

    case 'overwrite':
    default: {
      const result = await writeFileAtomic(destAbsolute, op.templateContent);
      return {
        dest: op.dest,
        strategy: op.strategy,
        status: /** @type {OpStatus} */ (result.status),
        hash: contentHash(op.templateContent),
        kind: 'create',
      };
    }
  }
}

// ---------------------------------------------------------------------------
// Validate generated plugin.json content against plugin-manifest schema
// ---------------------------------------------------------------------------

/**
 * Validate that plugin.json content conforms to plugin-manifest.schema.json.
 *
 * @param {string} content - JSON string
 * @returns {{ valid: boolean, errors: Array<{path: string, message: string}> }}
 */
function validatePluginManifest(content) {
  try {
    const data = JSON.parse(content);
    const validator = createValidator(SCHEMAS_DIR);
    return validator.validate('plugin-manifest.schema.json', data);
  } catch (parseErr) {
    return {
      valid: false,
      errors: [{ path: '/', message: `Invalid JSON: ${parseErr.message}` }],
    };
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
  const args = parseArgs(argv);
  const jsonMode = args.json;

  // ------------------------------------------------------------------
  // 0. --help
  // ------------------------------------------------------------------
  if (args.help) {
    console.log(HELP);
    return 0;
  }

  // ------------------------------------------------------------------
  // 1. Validate required arguments
  // ------------------------------------------------------------------
  if (!args.profile) {
    err('Error: --profile <path> is required');
    err('Usage: node scripts/generate.js --profile <path> [--output <dir>] [--update] [--dry-run] [--json]');
    return 1;
  }

  const profilePath = path.resolve(args.profile);

  if (!fs.existsSync(profilePath)) {
    err(`Error: profile not found: ${profilePath}`);
    return 1;
  }

  // ------------------------------------------------------------------
  // 2. Read profile to determine output dir default
  // ------------------------------------------------------------------
  let profileName;
  try {
    const raw = fs.readFileSync(profilePath, 'utf8');
    const parsed = JSON.parse(raw);
    profileName = parsed.name ?? 'plugin';
  } catch {
    // Will surface as a validation error in resolveGeneratePlan
    profileName = 'plugin';
  }

  const outputDir = args.output
    ? path.resolve(args.output)
    : path.resolve(`generated/${profileName}-superpowers`);

  const templatesDir = args.templates
    ? path.resolve(args.templates)
    : TEMPLATES_DIR;

  // ------------------------------------------------------------------
  // 3. Resolve the generation plan (validates profile)
  // ------------------------------------------------------------------
  log(jsonMode, `Resolving plan for profile: ${profilePath}`);
  log(jsonMode, `Output directory: ${outputDir}`);

  let planResult;
  try {
    planResult = await resolveGeneratePlan(profilePath, templatesDir, outputDir);
  } catch (e) {
    err(`Error resolving plan: ${e.message}`);
    return 2;
  }

  if (planResult.errors.length > 0) {
    const errorLines = planResult.errors.map((e) => `  ${e.path}: ${e.message}`).join('\n');
    if (jsonMode) {
      console.log(JSON.stringify({ success: false, errors: planResult.errors }, null, 2));
    } else {
      err('Profile validation failed:');
      err(errorLines);
    }
    return 1;
  }

  const { operations } = planResult;

  // ------------------------------------------------------------------
  // 4. Validate plugin.json content before any writes (FR-006)
  // ------------------------------------------------------------------
  const pluginJsonOp = operations.find((op) => op.dest === 'plugin.json');
  if (pluginJsonOp) {
    const manifestValidation = validatePluginManifest(pluginJsonOp.templateContent);
    if (!manifestValidation.valid) {
      const errorLines = (manifestValidation.errors ?? [])
        .map((e) => `  ${e.path}: ${e.message}`)
        .join('\n');
      if (jsonMode) {
        console.log(
          JSON.stringify(
            { success: false, errors: manifestValidation.errors, stage: 'plugin-manifest-validation' },
            null,
            2,
          ),
        );
      } else {
        err('plugin.json schema validation failed — no files written:');
        err(errorLines);
      }
      return 1;
    }
  }

  // ------------------------------------------------------------------
  // 5. Dry-run — print plan and exit without writing
  // ------------------------------------------------------------------
  if (args.dryRun) {
    const plan = {
      dryRun: true,
      outputDir,
      operationCount: operations.length,
      operations: operations.map((op) => ({
        dest: op.dest,
        strategy: op.strategy,
        contentLength: op.templateContent.length,
      })),
    };

    if (jsonMode) {
      console.log(JSON.stringify(plan, null, 2));
    } else {
      log(jsonMode, '\nDry-run plan:');
      for (const op of plan.operations) {
        log(jsonMode, `  [${op.strategy}] ${op.dest} (${op.contentLength} chars)`);
      }
      log(jsonMode, `\n${plan.operationCount} operations planned. No files written.`);
    }
    return 0;
  }

  // ------------------------------------------------------------------
  // 6. Execute each operation (normal or update mode)
  // ------------------------------------------------------------------
  log(jsonMode, `\nExecuting ${operations.length} operations...`);

  /** @type {OperationResult[]} */
  const results = [];

  if (args.update) {
    // ----------------------------------------------------------------
    // Update mode: diff against install-state, detect conflicts
    // ----------------------------------------------------------------
    let oldState;
    try {
      oldState = await readInstallState(outputDir);
    } catch (e) {
      err(`Error reading install-state for --update: ${e.message}`);
      err('Run without --update first to create the initial install-state.');
      return 2;
    }

    /** @type {Map<string, import('./lib/install-state.js').Operation>} */
    const oldOpsByDest = new Map(oldState.operations.map((op) => [op.dest, op]));

    // Track which dest paths appear in the new plan (for orphan detection)
    const newDestSet = new Set(operations.map((op) => op.dest));

    // Process each operation in the new plan
    for (const op of operations) {
      const destAbsolute = path.join(outputDir, op.dest);
      const newTemplateHash = contentHash(op.templateContent);
      const oldOp = oldOpsByDest.get(op.dest);

      if (!oldOp) {
        // NEW file — not present in the old install-state at all.
        // Use the actual status returned by executeOperation so that a
        // skip_if_exists file that already exists on disk is recorded as
        // PROTECTED rather than incorrectly force-overridden to CREATED.
        let writeResult;
        try {
          writeResult = await executeOperation(op, outputDir);
        } catch (e) {
          err(`Error writing ${op.dest}: ${e.message}`);
          return 2;
        }
        results.push(writeResult);
        continue;
      }

      if (newTemplateHash === oldOp.contentHash) {
        // Template content is unchanged — skip regardless of disk state
        results.push({
          dest: op.dest,
          strategy: op.strategy,
          status: STATUS.SKIPPED,
          hash: oldOp.contentHash,
          kind: oldOp.kind,
        });
        continue;
      }

      // Template changed — check whether the user also modified the file on disk
      let diskHash;
      try {
        diskHash = fs.existsSync(destAbsolute)
          ? await fileContentHash(destAbsolute)
          : null;
      } catch (e) {
        err(`Error reading ${op.dest} for conflict detection: ${e.message}`);
        return 2;
      }

      if (diskHash !== null && diskHash !== oldOp.contentHash) {
        // CONFLICT: template changed AND user changed the file.
        // Store the NEW template hash (not the disk hash) in the result so the
        // install-state baseline is updated to the incoming template version.
        // This preserves the three-way merge invariant: on the next --update run
        // the baseline reflects the template, not the user's disk content, so
        // the conflict can be detected again.
        results.push({
          dest: op.dest,
          strategy: op.strategy,
          status: STATUS.CONFLICTED,
          hash: newTemplateHash,
          kind: oldOp.kind,
        });
        continue;
      }

      // Safe to overwrite — user did not modify the file (or it doesn't exist)
      let writeResult;
      try {
        writeResult = await executeOperation(op, outputDir);
      } catch (e) {
        err(`Error writing ${op.dest}: ${e.message}`);
        return 2;
      }
      results.push({ ...writeResult, status: STATUS.UPDATED });
    }

    // ----------------------------------------------------------------
    // Detect orphaned files (in old install-state but not in new plan)
    // ----------------------------------------------------------------
    /** @type {Array<{dest: string, strategy: string, status: string, hash: string, kind: string}>} */
    const orphaned = [];
    for (const oldOp of oldState.operations) {
      if (!newDestSet.has(oldOp.dest)) {
        orphaned.push({
          dest: oldOp.dest,
          strategy: oldOp.strategy,
          status: 'orphaned',
          hash: oldOp.contentHash,
          kind: oldOp.kind,
        });
      }
    }

    // Append orphaned entries to results for reporting (files are NOT deleted)
    results.push(...orphaned);

  } else {
    // ----------------------------------------------------------------
    // Normal (initial generation) mode
    // ----------------------------------------------------------------
    for (const op of operations) {
      let result;
      try {
        result = await executeOperation(op, outputDir);
      } catch (e) {
        err(`Error writing ${op.dest}: ${e.message}`);
        return 2;
      }
      results.push(result);
    }
  }

  // ------------------------------------------------------------------
  // 7. Write install-state manifest
  // ------------------------------------------------------------------
  const templateVersion = readTemplateVersion();
  const profileRaw = fs.readFileSync(profilePath, 'utf8');
  const profileHashValue = contentHash(profileRaw);

  // Exclude orphaned entries from the written install-state — they are no
  // longer part of the active plan and should not persist in the manifest.
  const nonOrphanedResults = results.filter((r) => r.status !== 'orphaned');

  const manifestOperations = nonOrphanedResults.map((r) => ({
    kind: r.kind,
    source: operations.find((op) => op.dest === r.dest)?.source ?? r.dest,
    dest: r.dest,
    strategy: r.strategy,
    contentHash: r.hash,
  }));

  try {
    await writeInstallState(outputDir, {
      templateVersion,
      profileHash: profileHashValue,
      operations: manifestOperations,
    });
  } catch (e) {
    // Non-fatal — warn but do not abort
    err(`Warning: could not write install-state manifest: ${e.message}`);
  }

  // ------------------------------------------------------------------
  // 8. Report results
  // ------------------------------------------------------------------
  const counts = {};
  for (const r of results) {
    counts[r.status] = (counts[r.status] ?? 0) + 1;
  }

  const conflictedFiles = results.filter((r) => r.status === STATUS.CONFLICTED);
  const orphanedFiles = results.filter((r) => r.status === 'orphaned');

  if (jsonMode) {
    console.log(
      JSON.stringify(
        {
          success: conflictedFiles.length === 0,
          outputDir,
          operationCount: results.length,
          summary: counts,
          operations: results.map((r) => ({ dest: r.dest, strategy: r.strategy, status: r.status })),
          ...(conflictedFiles.length > 0 && {
            conflicts: conflictedFiles.map((r) => r.dest),
          }),
          ...(orphanedFiles.length > 0 && {
            orphaned: orphanedFiles.map((r) => r.dest),
          }),
        },
        null,
        2,
      ),
    );
  } else {
    log(jsonMode, '\nResults:');
    for (const r of results) {
      log(jsonMode, `  [${r.status}] ${r.dest}`);
    }
    log(jsonMode, '\nSummary:');
    for (const [status, count] of Object.entries(counts)) {
      log(jsonMode, `  ${status}: ${count}`);
    }
    log(jsonMode, `\nOutput: ${outputDir}`);

    if (conflictedFiles.length > 0) {
      err('\nConflicts detected (template changed AND user modified):');
      for (const r of conflictedFiles) {
        err(`  [conflict] ${r.dest}`);
      }
      err('Resolve conflicts manually, then re-run with --update.');
    }

    if (orphanedFiles.length > 0) {
      log(jsonMode, '\nOrphaned files (template removed, manual cleanup required):');
      for (const r of orphanedFiles) {
        log(jsonMode, `  [orphaned] ${r.dest}`);
      }
    }
  }

  // Exit code 3 when conflicts exist
  if (conflictedFiles.length > 0) {
    return 3;
  }

  return 0;
}

// ---------------------------------------------------------------------------
// Entrypoint — only runs when executed directly
// ---------------------------------------------------------------------------

const isMain =
  process.argv[1] &&
  path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));

if (isMain) {
  main(process.argv.slice(2)).then((code) => {
    process.exit(code);
  });
}
