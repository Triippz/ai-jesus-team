/**
 * Plugin installer — CLI entry point.
 *
 * Installs a generated plugin directory into a target project's `.claude/` folder.
 *
 * Usage:
 *   node scripts/install-plugin.js --plugin <dir> --target <dir> [--dry-run] [--json]
 *
 * Exit codes:
 *   0  success
 *   1  validation error (missing args, plugin dir invalid)
 *
 * File routing rules:
 *   - CLAUDE.md / AGENTS.md at plugin root → target root, skip_if_exists
 *   - hooks/hooks.json → deep-merge into target/.claude/settings.json
 *   - plugin.json → target/.claude/plugin.json, overwrite
 *   - .claude/install-state.json → skip (generation artifact, not install state)
 *   - everything else → target/.claude/<relative-path>, overwrite
 *
 * @module scripts/install-plugin
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  writeFileAtomic,
  writeFileIfNotExists,
  contentHash,
  STATUS,
} from './lib/file-operations.js';
import { deepMerge } from './lib/deep-merge.js';
import { writeInstallState } from './lib/install-state.js';

// ---------------------------------------------------------------------------
// Help text
// ---------------------------------------------------------------------------

const HELP = `
Usage: node scripts/install-plugin.js --plugin <dir> --target <dir> [--dry-run] [--json]

Options:
  --plugin <dir>  Path to generated plugin directory (required)
  --target <dir>  Path to target project repository (required)
  --dry-run       Show what would be installed without writing files
  --json          Machine-readable JSON output
  --help          Show this help message
`.trim();

// ---------------------------------------------------------------------------
// CLI argument parser
// ---------------------------------------------------------------------------

/**
 * @typedef {Object} CliArgs
 * @property {string|null} plugin  - Path to the generated plugin directory
 * @property {string|null} target  - Path to the target project root
 * @property {boolean}     dryRun  - Print plan without writing files
 * @property {boolean}     json    - Emit JSON output
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
    plugin: null,
    target: null,
    dryRun: false,
    json: false,
    help: false,
  };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--plugin' && argv[i + 1]) {
      args.plugin = argv[++i];
    } else if (arg === '--target' && argv[i + 1]) {
      args.target = argv[++i];
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
 * Print to stdout when not in JSON mode.
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
// Directory walker
// ---------------------------------------------------------------------------

/**
 * Recursively collect all file paths under a directory.
 *
 * @param {string} dir - Absolute path to the directory.
 * @returns {string[]} Sorted absolute file paths.
 */
function walkDir(dir) {
  const results = [];

  function walk(current) {
    const entries = fs.readdirSync(current, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) {
        walk(full);
      } else {
        results.push(full);
      }
    }
  }

  walk(dir);
  return results.sort();
}

// ---------------------------------------------------------------------------
// Install-state reader (plugin-side, not target)
// ---------------------------------------------------------------------------

/**
 * Attempt to read the plugin's own install-state.json (the generation artifact).
 * Returns null when absent or unparseable.
 *
 * @param {string} pluginDir
 * @returns {{ templateVersion: string, profileHash: string } | null}
 */
function readPluginInstallState(pluginDir) {
  const statePath = path.join(pluginDir, '.claude', 'install-state.json');
  if (!fs.existsSync(statePath)) return null;

  try {
    const raw = fs.readFileSync(statePath, 'utf8');
    const parsed = JSON.parse(raw);
    return {
      templateVersion: parsed.templateVersion ?? 'unknown',
      profileHash: parsed.profileHash ?? 'unknown',
    };
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Deep-merge hooks.json into target settings.json
// ---------------------------------------------------------------------------

/**
 * Read or initialize the target settings.json.
 *
 * @param {string} settingsPath
 * @returns {Record<string, unknown>}
 */
function readOrInitSettings(settingsPath) {
  if (fs.existsSync(settingsPath)) {
    try {
      return JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
    } catch {
      return {};
    }
  }
  return {};
}

/**
 * Merge hooks from hooks.json into the target settings.json.
 *
 * hooks.json has the shape: `{ "hooks": { "EventName": [...] } }`
 * settings.json also uses: `{ "hooks": { "EventName": [...] } }`
 *
 * Arrays under each event key are replaced wholesale by deepMerge (source wins).
 * To preserve existing hook entries we union them instead.
 *
 * @param {string} settingsPath   - Absolute path to target settings.json
 * @param {string} hooksContent   - Raw JSON string from hooks.json
 * @returns {Promise<{ finalContent: string, status: string }>}
 */
async function mergeHooksIntoSettings(settingsPath, hooksContent) {
  const existing = readOrInitSettings(settingsPath);

  let incoming;
  try {
    incoming = JSON.parse(hooksContent);
  } catch {
    // Fallback: just write the hooks content as-is
    const result = await writeFileAtomic(settingsPath, hooksContent);
    return { finalContent: hooksContent, status: result.status };
  }

  // Merge top-level keys (permissions, env, etc.) via deepMerge first
  const { result: merged } = deepMerge(existing, incoming);

  // For the hooks sub-object, union arrays per event type instead of replace
  if (
    incoming.hooks &&
    typeof incoming.hooks === 'object' &&
    !Array.isArray(incoming.hooks)
  ) {
    if (!merged.hooks || typeof merged.hooks !== 'object') {
      merged.hooks = {};
    }

    for (const [eventName, incomingEntries] of Object.entries(incoming.hooks)) {
      if (!Array.isArray(incomingEntries)) continue;

      const existingEntries = Array.isArray(existing.hooks?.[eventName])
        ? existing.hooks[eventName]
        : [];

      // Union: keep existing entries, append any incoming entries whose
      // dedup key is not already present in the existing list.
      const dedupeKey = (e) =>
        typeof e === 'object' && e !== null
          ? (e.matcher || JSON.stringify(e))
          : String(e);

      const existingMatchers = new Set(existingEntries.map(dedupeKey));

      const newEntries = incomingEntries.filter((e) => !existingMatchers.has(dedupeKey(e)));

      merged.hooks[eventName] = [...existingEntries, ...newEntries];
    }
  }

  const finalContent = JSON.stringify(merged, null, 2);
  const result = await writeFileAtomic(settingsPath, finalContent);
  const status = result.status === STATUS.SKIPPED ? STATUS.SKIPPED : STATUS.MERGED;

  return { finalContent, status };
}

// ---------------------------------------------------------------------------
// Plan builder
// ---------------------------------------------------------------------------

/**
 * @typedef {Object} InstallOperation
 * @property {string} relSource  - Relative path from plugin root
 * @property {string} destAbs    - Absolute destination path
 * @property {string} destRel    - Relative destination path (from target root)
 * @property {string} strategy   - 'overwrite' | 'skip_if_exists' | 'deep_merge'
 * @property {string} content    - File content
 */

/**
 * Build the list of install operations from a plugin directory.
 *
 * @param {string} pluginDir  - Absolute path to the plugin source.
 * @param {string} targetDir  - Absolute path to the target project root.
 * @returns {InstallOperation[]}
 */
function buildInstallPlan(pluginDir, targetDir) {
  const allFiles = walkDir(pluginDir);
  /** @type {InstallOperation[]} */
  const ops = [];

  for (const absSource of allFiles) {
    const relSource = path.relative(pluginDir, absSource);
    const content = fs.readFileSync(absSource, 'utf8');

    // Skip the plugin's own generation install-state — it is not installed
    if (relSource === path.join('.claude', 'install-state.json')) {
      continue;
    }

    // CLAUDE.md and AGENTS.md at plugin root → target root, skip_if_exists
    if (relSource === 'CLAUDE.md' || relSource === 'AGENTS.md') {
      ops.push({
        relSource,
        destAbs: path.join(targetDir, relSource),
        destRel: relSource,
        strategy: 'skip_if_exists',
        content,
      });
      continue;
    }

    // hooks/hooks.json → deep-merge into target/.claude/settings.json
    if (relSource === path.join('hooks', 'hooks.json')) {
      ops.push({
        relSource,
        destAbs: path.join(targetDir, '.claude', 'settings.json'),
        destRel: path.join('.claude', 'settings.json'),
        strategy: 'deep_merge',
        content,
      });
      continue;
    }

    // plugin.json → target/.claude/plugin.json, overwrite
    if (relSource === 'plugin.json') {
      ops.push({
        relSource,
        destAbs: path.join(targetDir, '.claude', 'plugin.json'),
        destRel: path.join('.claude', 'plugin.json'),
        strategy: 'overwrite',
        content,
      });
      continue;
    }

    // Everything else → target/.claude/<relative-path>, overwrite
    ops.push({
      relSource,
      destAbs: path.join(targetDir, '.claude', relSource),
      destRel: path.join('.claude', relSource),
      strategy: 'overwrite',
      content,
    });
  }

  return ops;
}

// ---------------------------------------------------------------------------
// Execute a single operation
// ---------------------------------------------------------------------------

/**
 * @typedef {Object} OperationResult
 * @property {string} source   - Relative source path in plugin
 * @property {string} dest     - Relative destination path in target
 * @property {string} strategy - Write strategy used
 * @property {string} status   - Outcome status
 * @property {string} hash     - sha256 hash of final written content
 * @property {'create'|'merge'} kind - Manifest operation kind
 */

/**
 * Execute a single install operation.
 *
 * @param {InstallOperation} op
 * @returns {Promise<OperationResult>}
 */
async function executeOperation(op) {
  switch (op.strategy) {
    case 'skip_if_exists': {
      const result = await writeFileIfNotExists(op.destAbs, op.content);
      return {
        source: op.relSource,
        dest: op.destRel,
        strategy: op.strategy,
        status: result.status,
        hash: contentHash(op.content),
        kind: 'create',
      };
    }

    case 'deep_merge': {
      const { finalContent, status } = await mergeHooksIntoSettings(op.destAbs, op.content);
      return {
        source: op.relSource,
        dest: op.destRel,
        strategy: op.strategy,
        status,
        hash: contentHash(finalContent),
        kind: 'merge',
      };
    }

    case 'overwrite':
    default: {
      const result = await writeFileAtomic(op.destAbs, op.content);
      return {
        source: op.relSource,
        dest: op.destRel,
        strategy: op.strategy,
        status: result.status,
        hash: contentHash(op.content),
        kind: 'create',
      };
    }
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
  if (!args.plugin || !args.target) {
    err('Error: --plugin <dir> and --target <dir> are both required');
    err('Usage: node scripts/install-plugin.js --plugin <dir> --target <dir> [--dry-run] [--json]');
    return 1;
  }

  const pluginDir = path.resolve(args.plugin);
  const targetDir = path.resolve(args.target);

  if (!fs.existsSync(pluginDir)) {
    err(`Error: plugin directory not found: ${pluginDir}`);
    return 1;
  }

  const pluginJsonPath = path.join(pluginDir, 'plugin.json');
  if (!fs.existsSync(pluginJsonPath)) {
    err(`Error: plugin.json not found in plugin directory: ${pluginDir}`);
    return 1;
  }

  // ------------------------------------------------------------------
  // 2. Read plugin install-state for version/hash metadata
  // ------------------------------------------------------------------
  const pluginState = readPluginInstallState(pluginDir);
  let templateVersion = pluginState?.templateVersion ?? 'unknown';
  let profileHash = pluginState?.profileHash ?? 'unknown';

  if (!pluginState) {
    // Derive a stable hash from plugin.json content as fallback
    try {
      const pluginJsonContent = fs.readFileSync(pluginJsonPath, 'utf8');
      profileHash = contentHash(pluginJsonContent);
    } catch {
      profileHash = 'unknown';
    }
  }

  // ------------------------------------------------------------------
  // 3. Build the install plan
  // ------------------------------------------------------------------
  const operations = buildInstallPlan(pluginDir, targetDir);

  log(jsonMode, `Plugin:  ${pluginDir}`);
  log(jsonMode, `Target:  ${targetDir}`);
  log(jsonMode, `Files:   ${operations.length} operations planned`);

  // ------------------------------------------------------------------
  // 4. Dry-run — print plan and exit
  // ------------------------------------------------------------------
  if (args.dryRun) {
    const plan = {
      dryRun: true,
      pluginDir,
      targetDir,
      operationCount: operations.length,
      operations: operations.map((op) => ({
        source: op.relSource,
        dest: op.destRel,
        strategy: op.strategy,
        contentLength: op.content.length,
      })),
    };

    if (jsonMode) {
      console.log(JSON.stringify(plan, null, 2));
    } else {
      log(jsonMode, '\nDry-run plan:');
      for (const op of plan.operations) {
        log(jsonMode, `  [${op.strategy}] ${op.source} → ${op.dest} (${op.contentLength} chars)`);
      }
      log(jsonMode, `\n${plan.operationCount} operations planned. No files written.`);
    }

    return 0;
  }

  // ------------------------------------------------------------------
  // 5. Execute operations
  // ------------------------------------------------------------------
  log(jsonMode, `\nInstalling ${operations.length} files...`);

  /** @type {OperationResult[]} */
  const results = [];

  for (const op of operations) {
    let result;
    try {
      result = await executeOperation(op);
    } catch (e) {
      err(`Error installing ${op.relSource}: ${e.message}`);
      return 1;
    }
    results.push(result);
  }

  // ------------------------------------------------------------------
  // 6. Write install-state manifest to target
  // ------------------------------------------------------------------
  const manifestOperations = results.map((r) => ({
    kind: r.kind,
    source: r.source,
    dest: r.dest,
    strategy: r.strategy,
    contentHash: r.hash,
  }));

  try {
    await writeInstallState(targetDir, {
      templateVersion,
      profileHash,
      operations: manifestOperations,
    });
  } catch (e) {
    err(`Warning: could not write install-state manifest: ${e.message}`);
  }

  // ------------------------------------------------------------------
  // 7. Report results
  // ------------------------------------------------------------------
  const counts = {};
  for (const r of results) {
    counts[r.status] = (counts[r.status] ?? 0) + 1;
  }

  if (jsonMode) {
    console.log(
      JSON.stringify(
        {
          success: true,
          pluginDir,
          targetDir,
          operationCount: results.length,
          summary: counts,
          operations: results.map((r) => ({
            source: r.source,
            dest: r.dest,
            strategy: r.strategy,
            status: r.status,
          })),
        },
        null,
        2,
      ),
    );
  } else {
    log(jsonMode, '\nResults:');
    for (const r of results) {
      log(jsonMode, `  [${r.status}] ${r.source} → ${r.dest}`);
    }
    log(jsonMode, '\nSummary:');
    for (const [status, count] of Object.entries(counts)) {
      log(jsonMode, `  ${status}: ${count}`);
    }
    log(jsonMode, `\nInstalled into: ${targetDir}`);
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
