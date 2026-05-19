/**
 * @file validate-schemas.js
 * @description CI validation script — validates all structured files against their schemas.
 *
 * Validates:
 *   - Every new-format profile in profiles/ against profile.schema.json
 *   - Every generated plugin's plugin.json against plugin-manifest.schema.json
 *   - Every install-state.json found under generated/ against install-state.schema.json
 *
 * Old-format profiles (those lacking the required top-level fields "stack",
 * "test_framework", "concurrency_model", and "ci_platform") are skipped with
 * a warning rather than failed — they pre-date the current schema.
 *
 * Usage:
 *   node scripts/validate-schemas.js [--json]
 *
 * Exit codes:
 *   0  all validated files pass
 *   1  one or more validated files fail
 *
 * @module scripts/validate-schemas
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { createValidator } from './lib/schema-validator.js';

// ---------------------------------------------------------------------------
// Paths
// ---------------------------------------------------------------------------

const SCHEMAS_DIR = fileURLToPath(new URL('../schemas', import.meta.url));
const PROFILES_DIR = fileURLToPath(new URL('../profiles', import.meta.url));
const GENERATED_DIR = fileURLToPath(new URL('../generated', import.meta.url));

// ---------------------------------------------------------------------------
// CLI argument parser
// ---------------------------------------------------------------------------

/**
 * @typedef {Object} CliArgs
 * @property {boolean} json   - Emit machine-readable JSON output
 * @property {boolean} help   - Print help and exit
 */

/**
 * Parse process.argv manually — no third-party arg parser.
 *
 * @param {string[]} argv - Typically process.argv.slice(2)
 * @returns {CliArgs}
 */
function parseArgs(argv) {
  const args = { json: false, help: false };
  for (const arg of argv) {
    if (arg === '--json') args.json = true;
    if (arg === '--help') args.help = true;
  }
  return args;
}

// ---------------------------------------------------------------------------
// Help
// ---------------------------------------------------------------------------

const HELP = `
Usage: node scripts/validate-schemas.js [--json]

Validates all structured files against their JSON schemas.

Options:
  --json   Machine-readable JSON output
  --help   Show this help message

What is validated:
  profiles/*.json          against profile.schema.json
    (old-format profiles are skipped with a warning)
  generated/*/plugin.json  against plugin-manifest.schema.json
  generated/*/.claude/install-state.json  against install-state.schema.json

Exit codes:
  0  all validated files pass
  1  one or more validated files fail
`.trim();

// ---------------------------------------------------------------------------
// Result types
// ---------------------------------------------------------------------------

/**
 * @typedef {'valid'|'invalid'|'skipped'} FileResultStatus
 *
 * @typedef {Object} FileResult
 * @property {string}            file    - Relative file path (from project root)
 * @property {string}            schema  - Schema ID used for validation
 * @property {FileResultStatus}  status  - Outcome
 * @property {string}            [reason] - Why file was skipped (when status === 'skipped')
 * @property {Array<{path:string, message:string}>} [errors] - Validation errors (when invalid)
 */

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Read and parse a JSON file. Returns null with an error message on failure.
 *
 * @param {string} absPath
 * @returns {{ data: unknown, error: null } | { data: null, error: string }}
 */
function readJson(absPath) {
  try {
    const raw = fs.readFileSync(absPath, 'utf8');
    return { data: JSON.parse(raw), error: null };
  } catch (e) {
    return { data: null, error: e.message };
  }
}

/**
 * Compute a path relative to the project root for display purposes.
 *
 * @param {string} absPath
 * @returns {string}
 */
function projectRelative(absPath) {
  const projectRoot = fileURLToPath(new URL('..', import.meta.url));
  return path.relative(projectRoot, absPath);
}

/**
 * Determine whether a parsed profile object matches the new schema format.
 *
 * A profile is considered "new format" when it has all of the fields that the
 * profile.schema.json `required` array demands. Old-format profiles use a
 * completely different shape (plugins, cursor_rules, description).
 *
 * @param {unknown} data
 * @returns {boolean}
 */
function isNewFormatProfile(data) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return false;
  const obj = /** @type {Record<string, unknown>} */ (data);
  return (
    typeof obj.name === 'string' &&
    typeof obj.stack === 'object' && obj.stack !== null &&
    typeof obj.test_framework === 'string' &&
    typeof obj.concurrency_model === 'string' &&
    typeof obj.ci_platform === 'string'
  );
}

/**
 * Recursively walk a directory and return all file paths matching a predicate.
 *
 * @param {string} dir
 * @param {(name: string) => boolean} predicate - called with the filename only
 * @returns {string[]} Sorted absolute file paths
 */
function findFiles(dir, predicate) {
  const results = [];

  if (!fs.existsSync(dir)) return results;

  function walk(current) {
    const entries = fs.readdirSync(current, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) {
        walk(full);
      } else if (predicate(entry.name)) {
        results.push(full);
      }
    }
  }

  walk(dir);
  return results.sort();
}

// ---------------------------------------------------------------------------
// Validation runners
// ---------------------------------------------------------------------------

/**
 * Validate all profiles in profiles/.
 *
 * Files that cannot be parsed or do not match the new-format shape are
 * recorded as skipped rather than invalid.
 *
 * @param {ReturnType<typeof createValidator>} validator
 * @returns {FileResult[]}
 */
function validateProfiles(validator) {
  /** @type {FileResult[]} */
  const results = [];

  const profileFiles = fs
    .readdirSync(PROFILES_DIR)
    .filter((name) => name.endsWith('.json') && name !== 'profile-schema.json')
    .sort()
    .map((name) => path.join(PROFILES_DIR, name));

  for (const absPath of profileFiles) {
    const rel = projectRelative(absPath);
    const schemaId = 'profile.schema.json';

    const { data, error } = readJson(absPath);

    if (error) {
      results.push({
        file: rel,
        schema: schemaId,
        status: 'skipped',
        reason: `could not parse JSON: ${error}`,
      });
      continue;
    }

    if (!isNewFormatProfile(data)) {
      results.push({
        file: rel,
        schema: schemaId,
        status: 'skipped',
        reason: 'old-format profile — missing required new-schema fields',
      });
      continue;
    }

    const result = validator.validate(schemaId, data);
    results.push({
      file: rel,
      schema: schemaId,
      status: result.valid ? 'valid' : 'invalid',
      ...(result.errors ? { errors: result.errors } : {}),
    });
  }

  return results;
}

/**
 * Validate every plugin.json found directly under generated/<name>/.
 *
 * @param {ReturnType<typeof createValidator>} validator
 * @returns {FileResult[]}
 */
function validatePluginManifests(validator) {
  /** @type {FileResult[]} */
  const results = [];

  if (!fs.existsSync(GENERATED_DIR)) return results;

  const pluginDirs = fs
    .readdirSync(GENERATED_DIR, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => path.join(GENERATED_DIR, entry.name))
    .sort();

  for (const pluginDir of pluginDirs) {
    const absPath = path.join(pluginDir, 'plugin.json');
    if (!fs.existsSync(absPath)) continue;

    const rel = projectRelative(absPath);
    const schemaId = 'plugin-manifest.schema.json';

    const { data, error } = readJson(absPath);

    if (error) {
      results.push({
        file: rel,
        schema: schemaId,
        status: 'invalid',
        errors: [{ path: '/', message: `could not parse JSON: ${error}` }],
      });
      continue;
    }

    const result = validator.validate(schemaId, data);
    results.push({
      file: rel,
      schema: schemaId,
      status: result.valid ? 'valid' : 'invalid',
      ...(result.errors ? { errors: result.errors } : {}),
    });
  }

  return results;
}

/**
 * Validate every install-state.json found under generated/.
 *
 * @param {ReturnType<typeof createValidator>} validator
 * @returns {FileResult[]}
 */
function validateInstallStates(validator) {
  /** @type {FileResult[]} */
  const results = [];

  const stateFiles = findFiles(
    GENERATED_DIR,
    (name) => name === 'install-state.json',
  );

  for (const absPath of stateFiles) {
    const rel = projectRelative(absPath);
    const schemaId = 'install-state.schema.json';

    const { data, error } = readJson(absPath);

    if (error) {
      results.push({
        file: rel,
        schema: schemaId,
        status: 'invalid',
        errors: [{ path: '/', message: `could not parse JSON: ${error}` }],
      });
      continue;
    }

    const result = validator.validate(schemaId, data);
    results.push({
      file: rel,
      schema: schemaId,
      status: result.valid ? 'valid' : 'invalid',
      ...(result.errors ? { errors: result.errors } : {}),
    });
  }

  return results;
}

// ---------------------------------------------------------------------------
// Human-readable renderer
// ---------------------------------------------------------------------------

/**
 * @type {Record<FileResultStatus, string>}
 */
const STATUS_ICONS = {
  valid:   'PASS',
  invalid: 'FAIL',
  skipped: 'SKIP',
};

/**
 * Print a human-readable summary of all results.
 *
 * @param {FileResult[]} results
 */
function printHumanReport(results) {
  const valid = results.filter((r) => r.status === 'valid').length;
  const invalid = results.filter((r) => r.status === 'invalid').length;
  const skipped = results.filter((r) => r.status === 'skipped').length;

  console.log('\nSchema validation report\n');

  for (const r of results) {
    const icon = STATUS_ICONS[r.status] ?? r.status.toUpperCase();
    console.log(`  [${icon}] ${r.file}  (${r.schema})`);
    if (r.status === 'skipped' && r.reason) {
      console.log(`         Note: ${r.reason}`);
    }
    if (r.status === 'invalid' && r.errors) {
      for (const e of r.errors) {
        console.log(`         ${e.path}: ${e.message}`);
      }
    }
  }

  console.log(`\n--- Summary ---`);
  console.log(`  passed:  ${valid}`);
  console.log(`  failed:  ${invalid}`);
  console.log(`  skipped: ${skipped}`);
  console.log(invalid > 0 ? '\nStatus: FAILED' : '\nStatus: PASSED');
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

/**
 * Main entry point. Returns exit code.
 *
 * @param {string[]} argv - process.argv.slice(2)
 * @returns {number} exit code
 */
export function main(argv) {
  const args = parseArgs(argv);

  if (args.help) {
    console.log(HELP);
    return 0;
  }

  const jsonMode = args.json;

  // Load all schemas once
  let validator;
  try {
    validator = createValidator(SCHEMAS_DIR);
  } catch (e) {
    console.error(`Error: could not load schemas from ${SCHEMAS_DIR}: ${e.message}`);
    return 1;
  }

  // Run each validation category
  const profileResults = validateProfiles(validator);
  const manifestResults = validatePluginManifests(validator);
  const installStateResults = validateInstallStates(validator);

  const allResults = [...profileResults, ...manifestResults, ...installStateResults];

  const hasFailures = allResults.some((r) => r.status === 'invalid');

  if (jsonMode) {
    const valid = allResults.filter((r) => r.status === 'valid').length;
    const invalid = allResults.filter((r) => r.status === 'invalid').length;
    const skipped = allResults.filter((r) => r.status === 'skipped').length;

    console.log(
      JSON.stringify(
        {
          passed: valid,
          failed: invalid,
          skipped,
          success: !hasFailures,
          results: allResults,
        },
        null,
        2,
      ),
    );
  } else {
    printHumanReport(allResults);
  }

  return hasFailures ? 1 : 0;
}

// ---------------------------------------------------------------------------
// Entrypoint — only runs when executed directly
// ---------------------------------------------------------------------------

const isMain =
  process.argv[1] &&
  path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));

if (isMain) {
  process.exit(main(process.argv.slice(2)));
}
