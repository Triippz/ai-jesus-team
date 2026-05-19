/**
 * Plan resolver — READ-ONLY computation of a file-generation plan.
 *
 * Scans a templates directory, applies strategy rules, renders .j2 templates,
 * and returns a sorted operations array. No files are written.
 *
 * @module scripts/lib/plan-resolver
 */

import { renderTemplate } from './template-engine.js';
import { contentHash } from './file-operations.js';
import { createValidator } from './schema-validator.js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// ---------------------------------------------------------------------------
// Schema ID
// ---------------------------------------------------------------------------

const PROFILE_SCHEMA_ID = 'profile.schema.json';

// ---------------------------------------------------------------------------
// Resolve the schemas directory relative to this file's location
// ---------------------------------------------------------------------------

const schemasDir = fileURLToPath(new URL('../../schemas', import.meta.url));

// ---------------------------------------------------------------------------
// Strategy determination
// ---------------------------------------------------------------------------

/**
 * Basenames that always receive the `skip_if_exists` strategy.
 * @type {Set<string>}
 */
const SKIP_IF_EXISTS_NAMES = new Set(['CLAUDE.md', 'AGENTS.md']);

/**
 * Basenames that always receive the `deep_merge` strategy.
 * @type {Set<string>}
 */
const DEEP_MERGE_NAMES = new Set(['hooks.json', 'settings.json']);

/**
 * Determine the write strategy for a given destination basename.
 *
 * @param {string} destBasename - The final filename (after .j2 stripping).
 * @returns {'skip_if_exists' | 'deep_merge' | 'overwrite'}
 */
function determineStrategy(destBasename) {
  if (SKIP_IF_EXISTS_NAMES.has(destBasename)) return 'skip_if_exists';
  if (DEEP_MERGE_NAMES.has(destBasename)) return 'deep_merge';
  return 'overwrite';
}

// ---------------------------------------------------------------------------
// Recursive directory walk
// ---------------------------------------------------------------------------

/**
 * Recursively collect all file paths under `dir`.
 *
 * @param {string} dir - Absolute path to a directory.
 * @returns {string[]} Absolute paths to every file found (directories excluded).
 */
function walkDir(dir) {
  const results = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...walkDir(fullPath));
    } else if (entry.isFile()) {
      results.push(fullPath);
    }
  }

  return results;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * @typedef {Object} Operation
 * @property {string} source          - Relative path from templatesDir (e.g. `agents/orchestrator.md.j2`)
 * @property {string} dest            - Relative destination path (.j2 extension stripped when applicable)
 * @property {'skip_if_exists'|'deep_merge'|'overwrite'} strategy - Write strategy
 * @property {string} templateContent - Rendered (or verbatim) file content
 */

/**
 * @typedef {Object} PlanResult
 * @property {Operation[]} operations - Sorted list of file operations to perform
 * @property {object|null} profile    - Parsed profile object, or null if invalid
 * @property {Array<{path: string, message: string}>} errors - Validation errors (empty on success)
 */

/**
 * Compute a READ-ONLY generation plan.
 *
 * Reads the profile, validates it against the JSON schema, scans `templatesDir`,
 * and returns a deterministic list of operations. No files are written.
 *
 * @param {string} profilePath   - Absolute path to the profile JSON file.
 * @param {string} templatesDir  - Absolute path to the templates directory.
 * @param {string} outputDir     - Accepted for API symmetry; NOT used for writing.
 * @returns {Promise<PlanResult>}
 */
export async function resolveGeneratePlan(profilePath, templatesDir, outputDir) {
  // ------------------------------------------------------------------
  // 1. Read and parse the profile
  // ------------------------------------------------------------------
  const profileRaw = fs.readFileSync(profilePath, 'utf8');
  let profile;
  try {
    profile = JSON.parse(profileRaw);
  } catch (err) {
    return {
      operations: [],
      profile: null,
      errors: [{ path: '/', message: `Profile at ${profilePath} contains invalid JSON: ${err.message}` }],
    };
  }

  // ------------------------------------------------------------------
  // 2. Validate profile against schema
  // ------------------------------------------------------------------
  const validator = createValidator(schemasDir);
  const validation = validator.validate(PROFILE_SCHEMA_ID, profile);

  if (!validation.valid) {
    return {
      operations: [],
      profile: null,
      errors: validation.errors ?? [],
    };
  }

  // ------------------------------------------------------------------
  // 3. Collect all files from templatesDir (recursive)
  // ------------------------------------------------------------------
  const allFiles = walkDir(templatesDir);

  if (allFiles.length === 0) {
    return { operations: [], profile, errors: [] };
  }

  // ------------------------------------------------------------------
  // 4. Build an operation for each file
  // ------------------------------------------------------------------
  const operations = [];
  for (const absolutePath of allFiles) {
    const source = path.relative(templatesDir, absolutePath);
    const isTemplate = source.endsWith('.j2');
    const dest = isTemplate ? source.slice(0, -3) : source; // strip ".j2"
    const destBasename = path.basename(dest);
    const strategy = determineStrategy(destBasename);

    const rawContent = fs.readFileSync(absolutePath, 'utf8');
    let templateContent;
    if (isTemplate) {
      try {
        templateContent = renderTemplate(rawContent, { profile });
      } catch (err) {
        return {
          operations: [],
          profile,
          errors: [{ path: source, message: `Template error in ${source}: ${err.message}` }],
        };
      }
    } else {
      templateContent = rawContent;
    }

    operations.push({ source, dest, strategy, templateContent });
  }

  // ------------------------------------------------------------------
  // 5. Sort alphabetically by dest (deterministic ordering)
  // ------------------------------------------------------------------
  operations.sort((a, b) => a.dest.localeCompare(b.dest));

  return { operations, profile, errors: [] };
}
