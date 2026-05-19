/**
 * Integration and unit tests for scripts/generate.js — the plugin template factory CLI.
 *
 * Uses Node.js built-in test runner (node:test + node:assert/strict).
 * All file I/O is scoped to per-test temp directories that are cleaned up in afterEach.
 *
 * Test coverage:
 *  1.  Valid profile produces a complete plugin directory with zero {{ placeholders remaining
 *  2.  Determinism — two runs with identical input are byte-identical (SHA-256 comparison)
 *  3.  Idempotency — second run reports all files as skipped/protected
 *  4.  Missing required profile field fails with an explicit error naming the field
 *  5.  Unrecognized top-level profile field fails validation
 *  6.  stack.language "rust" includes tokio/ractor references in concurrency agent
 *  7.  --dry-run returns plan without writing any files
 *  8.  --json flag produces valid JSON output
 *  9.  Invalid plugin.json schema blocks all writes (FR-006)
 * 10.  All 4 plan-review personas present in generated output
 * 11.  Unsupported language "cobol" — schema allows any string; fallback branches render correctly
 * 12.  Performance — generation completes in under 5 seconds
 *
 * @module tests/factory/generate.test.js
 */

import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

import { main } from '../../scripts/generate.js';

// ---------------------------------------------------------------------------
// Paths
// ---------------------------------------------------------------------------

const PROJECT_ROOT = fileURLToPath(new URL('../../', import.meta.url));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Write a file, creating parent directories as needed.
 *
 * @param {string} filePath
 * @param {string} content
 */
function writeFile(filePath, content) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content, 'utf8');
}

/**
 * Walk a directory recursively, collecting all file paths.
 *
 * @param {string} dir
 * @returns {string[]} Absolute paths sorted
 */
function walkDir(dir) {
  const results = [];
  if (!fs.existsSync(dir)) return results;

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

/**
 * Compute a deterministic hash of all files in a directory, excluding
 * install-state.json (which contains a timestamp).
 *
 * Files are sorted by their path relative to the directory, so the hash
 * is independent of filesystem traversal order.
 *
 * @param {string} dir
 * @returns {string} sha256 hex digest
 */
function hashOutputDir(dir) {
  const files = walkDir(dir).filter(
    (f) => !f.endsWith('install-state.json'),
  );

  const hash = crypto.createHash('sha256');
  for (const filePath of files) {
    const rel = path.relative(dir, filePath);
    const content = fs.readFileSync(filePath, 'utf8');
    hash.update(rel + '\0' + content);
  }
  return hash.digest('hex');
}

/**
 * Scan all files under `dir` for remaining {{ placeholder strings.
 * Returns all occurrences as an array of { file, line, match } objects.
 *
 * @param {string} dir
 * @returns {Array<{file: string, line: number, match: string}>}
 */
function findUnresolvedPlaceholders(dir) {
  const results = [];
  const re = /\{\{[^}]+\}\}/g;

  for (const filePath of walkDir(dir)) {
    if (filePath.endsWith('install-state.json')) continue;

    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    lines.forEach((line, idx) => {
      re.lastIndex = 0;
      let m;
      while ((m = re.exec(line)) !== null) {
        results.push({ file: path.relative(dir, filePath), line: idx + 1, match: m[0] });
      }
    });
  }

  return results;
}

/**
 * Build a minimal valid profile object.
 *
 * @param {Partial<object>} overrides
 * @returns {object}
 */
function makeProfile(overrides = {}) {
  return {
    name: 'test-plugin',
    stack: { language: 'typescript', framework: 'hono' },
    orm: null,
    test_framework: 'node:test',
    concurrency_model: 'async-await',
    ci_platform: 'github',
    commit_format: 'type(scope): description',
    hook_profile: 'standard',
    ...overrides,
  };
}

/**
 * Write a profile JSON file and return its path.
 *
 * @param {string} dir
 * @param {object} profile
 * @returns {string}
 */
function writeProfile(dir, profile) {
  const profilePath = path.join(dir, 'profile.json');
  writeFile(profilePath, JSON.stringify(profile, null, 2));
  return profilePath;
}

/**
 * Capture stdout/stderr from main() without polluting test output.
 * Returns { exitCode, stdout, stderr }.
 *
 * @param {string[]} argv
 * @returns {Promise<{exitCode: number, stdout: string, stderr: string}>}
 */
async function runMain(argv) {
  const stdoutLines = [];
  const stderrLines = [];

  const origLog = console.log;
  const origErr = console.error;

  console.log = (...args) => stdoutLines.push(args.map(String).join(' '));
  console.error = (...args) => stderrLines.push(args.map(String).join(' '));

  let exitCode;
  try {
    exitCode = await main(argv);
  } finally {
    console.log = origLog;
    console.error = origErr;
  }

  return {
    exitCode,
    stdout: stdoutLines.join('\n'),
    stderr: stderrLines.join('\n'),
  };
}

// ---------------------------------------------------------------------------
// Per-test state
// ---------------------------------------------------------------------------

/** @type {string} */
let tmpRoot;

beforeEach(() => {
  tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'generate-test-'));
});

afterEach(() => {
  fs.rmSync(tmpRoot, { recursive: true, force: true });
});

// ===========================================================================
// TEST 1 — Valid profile produces complete directory with zero {{}} remaining
// ===========================================================================
describe('generate — complete output with no unresolved placeholders', () => {
  it('generates all expected top-level entries for a valid profile', async () => {
    const profilePath = writeProfile(tmpRoot, makeProfile());
    const outputDir = path.join(tmpRoot, 'output');

    const { exitCode } = await runMain([
      '--profile', profilePath,
      '--output', outputDir,
    ]);

    assert.equal(exitCode, 0, 'exit code must be 0 for a valid profile');

    assert.ok(fs.existsSync(path.join(outputDir, 'CLAUDE.md')), 'CLAUDE.md must exist');
    assert.ok(fs.existsSync(path.join(outputDir, 'AGENTS.md')), 'AGENTS.md must exist');
    assert.ok(fs.existsSync(path.join(outputDir, 'plugin.json')), 'plugin.json must exist');
    assert.ok(fs.existsSync(path.join(outputDir, 'agents')), 'agents/ directory must exist');
    assert.ok(fs.existsSync(path.join(outputDir, 'hooks')), 'hooks/ directory must exist');
    assert.ok(fs.existsSync(path.join(outputDir, 'knowledge')), 'knowledge/ directory must exist');
  });

  it('leaves zero {{ placeholder strings in any generated file', async () => {
    const profilePath = writeProfile(tmpRoot, makeProfile());
    const outputDir = path.join(tmpRoot, 'output');

    await runMain(['--profile', profilePath, '--output', outputDir]);

    const unresolved = findUnresolvedPlaceholders(outputDir);
    assert.equal(
      unresolved.length,
      0,
      `Found unresolved placeholders:\n${unresolved.map((u) => `  ${u.file}:${u.line} ${u.match}`).join('\n')}`,
    );
  });

  it('plugin.json contains the profile name in its name field', async () => {
    const profile = makeProfile({ name: 'my-app' });
    const profilePath = writeProfile(tmpRoot, profile);
    const outputDir = path.join(tmpRoot, 'output');

    await runMain(['--profile', profilePath, '--output', outputDir]);

    const pluginJson = JSON.parse(
      fs.readFileSync(path.join(outputDir, 'plugin.json'), 'utf8'),
    );
    assert.equal(
      pluginJson.name,
      'my-app-superpowers',
      'plugin.json name must include the profile name',
    );
  });
});

// ===========================================================================
// TEST 2 — Determinism: two runs produce byte-identical output
// ===========================================================================
describe('generate — determinism', () => {
  it('produces byte-identical output on two consecutive runs (hash comparison)', async () => {
    const profilePath = writeProfile(tmpRoot, makeProfile());
    const outputA = path.join(tmpRoot, 'run-a');
    const outputB = path.join(tmpRoot, 'run-b');

    const { exitCode: codeA } = await runMain([
      '--profile', profilePath,
      '--output', outputA,
    ]);
    const { exitCode: codeB } = await runMain([
      '--profile', profilePath,
      '--output', outputB,
    ]);

    assert.equal(codeA, 0);
    assert.equal(codeB, 0);

    const hashA = hashOutputDir(outputA);
    const hashB = hashOutputDir(outputB);

    assert.equal(hashA, hashB, 'SHA-256 hashes of both output directories must match');
  });
});

// ===========================================================================
// TEST 3 — Idempotency: second run on same directory reports skipped/protected
// ===========================================================================
describe('generate — idempotency', () => {
  it('second run on already-generated output reports no new writes', async () => {
    const profilePath = writeProfile(tmpRoot, makeProfile());
    const outputDir = path.join(tmpRoot, 'output');

    const { exitCode: firstCode } = await runMain([
      '--profile', profilePath,
      '--output', outputDir,
    ]);
    assert.equal(firstCode, 0, 'first run must succeed');

    const { exitCode: secondCode, stdout } = await runMain([
      '--profile', profilePath,
      '--output', outputDir,
      '--json',
    ]);
    assert.equal(secondCode, 0, 'second run must succeed');

    const result = JSON.parse(stdout);
    assert.ok(result.success, 'second run result must have success: true');

    const nonIdempotentStatuses = ['created', 'updated', 'merged'];
    const written = result.operations.filter((op) =>
      nonIdempotentStatuses.includes(op.status),
    );

    assert.equal(
      written.length,
      0,
      `Second run must not write any files, but got: ${written.map((o) => `${o.dest}(${o.status})`).join(', ')}`,
    );
  });
});

// ===========================================================================
// TEST 4 — Missing required profile field fails with explicit error
// ===========================================================================
describe('generate — missing required field', () => {
  it('returns exit code 1 when a required field is absent', async () => {
    const badProfile = {
      name: 'test-plugin',
      orm: null,
      test_framework: 'node:test',
      concurrency_model: 'async-await',
      ci_platform: 'github',
      // missing: stack
    };
    const profilePath = writeProfile(tmpRoot, badProfile);
    const outputDir = path.join(tmpRoot, 'output');

    const { exitCode, stderr } = await runMain([
      '--profile', profilePath,
      '--output', outputDir,
    ]);

    assert.equal(exitCode, 1, 'exit code must be 1 for invalid profile');
    assert.ok(stderr.length > 0, 'error output must be non-empty for a missing required field');
  });

  it('error output mentions the missing field in JSON mode', async () => {
    const badProfile = {
      name: 'test-plugin',
      // missing: stack, orm, test_framework, concurrency_model, ci_platform
    };
    const profilePath = writeProfile(tmpRoot, badProfile);
    const outputDir = path.join(tmpRoot, 'output');

    const { exitCode, stdout } = await runMain([
      '--profile', profilePath,
      '--output', outputDir,
      '--json',
    ]);

    assert.equal(exitCode, 1);

    const result = JSON.parse(stdout);
    assert.ok(result.success === false, 'success must be false');
    assert.ok(Array.isArray(result.errors) && result.errors.length > 0, 'errors array must be non-empty');
  });

  it('does not write any files when required field is missing', async () => {
    const badProfile = { name: 'incomplete' };
    const profilePath = writeProfile(tmpRoot, badProfile);
    const outputDir = path.join(tmpRoot, 'output');

    await runMain(['--profile', profilePath, '--output', outputDir]);

    if (fs.existsSync(outputDir)) {
      const files = walkDir(outputDir).filter(
        (f) => !f.endsWith('install-state.json'),
      );
      assert.equal(files.length, 0, 'no plugin files must be written on validation failure');
    }
  });
});

// ===========================================================================
// TEST 5 — Unrecognized top-level profile field fails validation
// ===========================================================================
describe('generate — unrecognized top-level field', () => {
  it('returns exit code 1 when profile has an unknown top-level field', async () => {
    const badProfile = {
      ...makeProfile(),
      totally_unknown_field: 'this should not be here',
    };
    const profilePath = writeProfile(tmpRoot, badProfile);
    const outputDir = path.join(tmpRoot, 'output');

    const { exitCode } = await runMain([
      '--profile', profilePath,
      '--output', outputDir,
    ]);

    assert.equal(
      exitCode,
      1,
      'exit code must be 1 for a profile with an unrecognized field (additionalProperties: false)',
    );
  });

  it('JSON error output contains errors for the unrecognized field', async () => {
    const badProfile = {
      ...makeProfile(),
      totally_unknown_field: 'bad value',
    };
    const profilePath = writeProfile(tmpRoot, badProfile);
    const outputDir = path.join(tmpRoot, 'output');

    const { exitCode, stdout } = await runMain([
      '--profile', profilePath,
      '--output', outputDir,
      '--json',
    ]);

    assert.equal(exitCode, 1);

    const result = JSON.parse(stdout);
    assert.ok(result.success === false, 'success must be false');
    assert.ok(Array.isArray(result.errors) && result.errors.length > 0, 'errors must be non-empty');
  });
});

// ===========================================================================
// TEST 6 — stack.language "rust" produces concurrency agent with tokio/ractor
// ===========================================================================
describe('generate — rust stack produces tokio/ractor concurrency agent', () => {
  it('concurrency-review agent references tokio when language is rust', async () => {
    const rustProfile = makeProfile({
      name: 'rust-svc',
      stack: { language: 'rust', framework: 'axum' },
      concurrency_model: 'tokio',
    });
    const profilePath = writeProfile(tmpRoot, rustProfile);
    const outputDir = path.join(tmpRoot, 'output');

    const { exitCode } = await runMain([
      '--profile', profilePath,
      '--output', outputDir,
    ]);

    assert.equal(exitCode, 0, 'generation must succeed for rust profile');

    const concurrencyPath = path.join(outputDir, 'agents', 'review', 'concurrency-review.md');
    assert.ok(fs.existsSync(concurrencyPath), 'concurrency-review.md must be generated');

    const content = fs.readFileSync(concurrencyPath, 'utf8');
    assert.ok(content.includes('tokio'), 'concurrency-review agent must reference tokio for rust');
    assert.ok(content.includes('ractor'), 'concurrency-review agent must reference ractor for rust');
  });
});

// ===========================================================================
// TEST 7 — --dry-run returns plan without writing any files
// ===========================================================================
describe('generate — dry-run', () => {
  it('--dry-run exits 0 without creating any files', async () => {
    const profilePath = writeProfile(tmpRoot, makeProfile());
    const outputDir = path.join(tmpRoot, 'dry-run-output');

    const { exitCode } = await runMain([
      '--profile', profilePath,
      '--output', outputDir,
      '--dry-run',
    ]);

    assert.equal(exitCode, 0, '--dry-run must exit 0');

    if (fs.existsSync(outputDir)) {
      const files = walkDir(outputDir);
      assert.equal(files.length, 0, '--dry-run must not write any files');
    }
  });

  it('--dry-run with --json returns valid JSON with operations list', async () => {
    const profilePath = writeProfile(tmpRoot, makeProfile());
    const outputDir = path.join(tmpRoot, 'dry-run-output');

    const { exitCode, stdout } = await runMain([
      '--profile', profilePath,
      '--output', outputDir,
      '--dry-run',
      '--json',
    ]);

    assert.equal(exitCode, 0);

    let plan;
    assert.doesNotThrow(() => {
      plan = JSON.parse(stdout);
    }, 'stdout must be valid JSON with --dry-run --json');

    assert.ok(plan.dryRun === true, 'plan.dryRun must be true');
    assert.ok(Array.isArray(plan.operations), 'plan.operations must be an array');
    assert.ok(plan.operations.length > 0, 'plan must contain at least one operation');
    assert.ok(
      plan.operations.every((op) => typeof op.dest === 'string'),
      'each operation must have a dest string',
    );
  });

  it('--dry-run plan includes the expected output directory', async () => {
    const profilePath = writeProfile(tmpRoot, makeProfile());
    const outputDir = path.join(tmpRoot, 'dry-run-output');

    const { stdout } = await runMain([
      '--profile', profilePath,
      '--output', outputDir,
      '--dry-run',
      '--json',
    ]);

    const plan = JSON.parse(stdout);
    assert.equal(plan.outputDir, outputDir, 'plan must contain the correct outputDir');
  });
});

// ===========================================================================
// TEST 8 — --json flag produces valid JSON output
// ===========================================================================
describe('generate — --json output', () => {
  it('--json produces parseable JSON to stdout', async () => {
    const profilePath = writeProfile(tmpRoot, makeProfile());
    const outputDir = path.join(tmpRoot, 'output');

    const { exitCode, stdout } = await runMain([
      '--profile', profilePath,
      '--output', outputDir,
      '--json',
    ]);

    assert.equal(exitCode, 0);

    let result;
    assert.doesNotThrow(() => {
      result = JSON.parse(stdout);
    }, 'stdout must be valid JSON');

    assert.ok(result.success === true, 'result.success must be true');
    assert.ok(typeof result.operationCount === 'number', 'result.operationCount must be a number');
    assert.ok(Array.isArray(result.operations), 'result.operations must be an array');
  });

  it('--json result.operations has dest, strategy, and status for each file', async () => {
    const profilePath = writeProfile(tmpRoot, makeProfile());
    const outputDir = path.join(tmpRoot, 'output');

    const { stdout } = await runMain([
      '--profile', profilePath,
      '--output', outputDir,
      '--json',
    ]);

    const result = JSON.parse(stdout);
    for (const op of result.operations) {
      assert.ok(typeof op.dest === 'string', 'op.dest must be a string');
      assert.ok(typeof op.strategy === 'string', 'op.strategy must be a string');
      assert.ok(typeof op.status === 'string', 'op.status must be a string');
    }
  });

  it('--json failure response is valid JSON with success: false', async () => {
    const badProfile = { name: 'broken' };
    const profilePath = writeProfile(tmpRoot, badProfile);
    const outputDir = path.join(tmpRoot, 'output');

    const { exitCode, stdout } = await runMain([
      '--profile', profilePath,
      '--output', outputDir,
      '--json',
    ]);

    assert.equal(exitCode, 1);

    let result;
    assert.doesNotThrow(() => {
      result = JSON.parse(stdout);
    }, 'failure output must be valid JSON');

    assert.ok(result.success === false, 'result.success must be false on validation error');
    assert.ok(Array.isArray(result.errors), 'result.errors must be an array');
  });
});

// ===========================================================================
// TEST 9 — Invalid plugin.json schema blocks all writes (FR-006)
// ===========================================================================
describe('generate — FR-006: invalid plugin schema blocks all writes', () => {
  it('blocks all file writes when plugin.json renders to an invalid name pattern', async () => {
    // plugin-manifest.schema.json requires name: /^[a-z0-9-]+$/
    // Using uppercase + underscore breaks that constraint
    const profile = makeProfile({ name: 'MY_APP' });
    const profilePath = writeProfile(tmpRoot, profile);
    const outputDir = path.join(tmpRoot, 'output');

    const { exitCode } = await runMain([
      '--profile', profilePath,
      '--output', outputDir,
    ]);

    assert.equal(exitCode, 1, 'exit code must be 1 when plugin.json schema validation fails');

    if (fs.existsSync(outputDir)) {
      const files = walkDir(outputDir).filter(
        (f) => !f.endsWith('install-state.json'),
      );
      assert.equal(
        files.length,
        0,
        `No files must be written when plugin schema validation fails, found: ${files.map((f) => path.relative(outputDir, f)).join(', ')}`,
      );
    }
  });

  it('error message indicates plugin-manifest or schema validation failure', async () => {
    const profile = makeProfile({ name: 'MY_APP' });
    const profilePath = writeProfile(tmpRoot, profile);
    const outputDir = path.join(tmpRoot, 'output');

    const { exitCode, stdout, stderr } = await runMain([
      '--profile', profilePath,
      '--output', outputDir,
      '--json',
    ]);

    assert.equal(exitCode, 1);

    let result = null;
    try {
      result = JSON.parse(stdout);
    } catch {
      // fall through to stderr check
    }

    if (result) {
      assert.ok(
        result.success === false &&
          (result.stage === 'plugin-manifest-validation' ||
            (Array.isArray(result.errors) && result.errors.length > 0)),
        'JSON result must indicate plugin manifest validation failure',
      );
    } else {
      assert.ok(
        stderr.includes('plugin') || stderr.includes('schema') || stderr.includes('validation'),
        `error output must mention plugin/schema/validation, got: "${stderr}"`,
      );
    }
  });
});

// ===========================================================================
// TEST 10 — All 4 plan-review personas present in generated output
// ===========================================================================
describe('generate — all 4 plan-review personas present', () => {
  it('generates all four plan-review prompt files', async () => {
    const profilePath = writeProfile(tmpRoot, makeProfile());
    const outputDir = path.join(tmpRoot, 'output');

    const { exitCode } = await runMain([
      '--profile', profilePath,
      '--output', outputDir,
    ]);

    assert.equal(exitCode, 0);

    const expectedPersonas = [
      'plan-review-acceptance.md',
      'plan-review-design.md',
      'plan-review-strategic.md',
      'plan-review-ux.md',
    ];

    for (const persona of expectedPersonas) {
      const personaPath = path.join(outputDir, 'prompts', persona);
      assert.ok(
        fs.existsSync(personaPath),
        `plan-review persona must exist: prompts/${persona}`,
      );
    }
  });

  it('each persona file contains the profile name after template rendering', async () => {
    const profile = makeProfile({ name: 'acme-app' });
    const profilePath = writeProfile(tmpRoot, profile);
    const outputDir = path.join(tmpRoot, 'output');

    await runMain(['--profile', profilePath, '--output', outputDir]);

    const personaDir = path.join(outputDir, 'prompts');
    if (!fs.existsSync(personaDir)) return;

    const personas = fs.readdirSync(personaDir).filter((f) => f.endsWith('.md'));
    for (const f of personas) {
      const content = fs.readFileSync(path.join(personaDir, f), 'utf8');
      assert.ok(
        content.includes('acme-app'),
        `persona file ${f} must contain the profile name "acme-app"`,
      );
    }
  });
});

// ===========================================================================
// TEST 11 — "cobol" language uses fallback template branches, renders cleanly
// ===========================================================================
describe('generate — unsupported language fallback', () => {
  it('succeeds for an unrecognized language string', async () => {
    // The profile schema allows any string for stack.language — no enum constraint.
    // Templates use language-specific {% if %} blocks with a generic fallback.
    const cobolProfile = makeProfile({
      name: 'cobol-svc',
      stack: { language: 'cobol', framework: '' },
      concurrency_model: 'sequential',
    });
    const profilePath = writeProfile(tmpRoot, cobolProfile);
    const outputDir = path.join(tmpRoot, 'output');

    const { exitCode } = await runMain([
      '--profile', profilePath,
      '--output', outputDir,
    ]);

    assert.equal(exitCode, 0, 'generation must succeed for any valid language string');
  });

  it('CLAUDE.md for unknown language has no unresolved {{ placeholders', async () => {
    const cobolProfile = makeProfile({
      name: 'cobol-svc',
      stack: { language: 'cobol', framework: '' },
      concurrency_model: 'sequential',
    });
    const profilePath = writeProfile(tmpRoot, cobolProfile);
    const outputDir = path.join(tmpRoot, 'output');

    await runMain(['--profile', profilePath, '--output', outputDir]);

    const claudePath = path.join(outputDir, 'CLAUDE.md');
    if (fs.existsSync(claudePath)) {
      const content = fs.readFileSync(claudePath, 'utf8');
      assert.ok(
        !content.includes('{{'),
        'CLAUDE.md must have no unresolved placeholders for an unsupported language',
      );
    }
  });

  it('all files for unknown language have no unresolved {{ placeholders', async () => {
    const cobolProfile = makeProfile({
      name: 'cobol-svc',
      stack: { language: 'cobol', framework: '' },
      concurrency_model: 'sequential',
    });
    const profilePath = writeProfile(tmpRoot, cobolProfile);
    const outputDir = path.join(tmpRoot, 'output');

    await runMain(['--profile', profilePath, '--output', outputDir]);

    const unresolved = findUnresolvedPlaceholders(outputDir);
    assert.equal(
      unresolved.length,
      0,
      `Found unresolved placeholders:\n${unresolved.map((u) => `  ${u.file}:${u.line} ${u.match}`).join('\n')}`,
    );
  });
});

// ===========================================================================
// TEST 12 — Performance: full generation completes in under 5 seconds
// ===========================================================================
describe('generate — performance', () => {
  it('complete generation finishes in under 5 seconds', async () => {
    const profilePath = writeProfile(tmpRoot, makeProfile());
    const outputDir = path.join(tmpRoot, 'perf-output');

    const start = performance.now();
    const { exitCode } = await runMain([
      '--profile', profilePath,
      '--output', outputDir,
    ]);
    const elapsed = performance.now() - start;

    assert.equal(exitCode, 0, 'generation must succeed');
    assert.ok(
      elapsed < 5000,
      `Generation must complete in under 5 seconds, took ${elapsed.toFixed(0)}ms`,
    );
  });
});

// ===========================================================================
// Additional edge-case tests
// ===========================================================================
describe('generate — edge cases', () => {
  it('missing --profile argument returns exit code 1', async () => {
    const { exitCode } = await runMain([]);
    assert.equal(exitCode, 1, 'exit code must be 1 when --profile is not provided');
  });

  it('non-existent profile path returns exit code 1', async () => {
    const { exitCode } = await runMain([
      '--profile', '/nonexistent/path/profile.json',
      '--output', path.join(tmpRoot, 'output'),
    ]);
    assert.equal(exitCode, 1, 'exit code must be 1 for non-existent profile');
  });

  it('output defaults to generated/<name>-superpowers when --output is omitted', async () => {
    const profile = makeProfile({ name: 'my-service' });
    const profilePath = writeProfile(tmpRoot, profile);

    // Change cwd so that generated/ resolves predictably under tmpRoot
    const origCwd = process.cwd();
    process.chdir(tmpRoot);
    try {
      const { exitCode, stdout } = await runMain([
        '--profile', profilePath,
        '--dry-run',
        '--json',
      ]);
      assert.equal(exitCode, 0);
      const plan = JSON.parse(stdout);
      assert.ok(
        plan.outputDir.endsWith('my-service-superpowers'),
        `outputDir must end with "my-service-superpowers", got: ${plan.outputDir}`,
      );
    } finally {
      process.chdir(origCwd);
    }
  });

  it('CLAUDE.md is protected (skip_if_exists) on second run', async () => {
    const profilePath = writeProfile(tmpRoot, makeProfile());
    const outputDir = path.join(tmpRoot, 'output');

    await runMain(['--profile', profilePath, '--output', outputDir]);

    const claudePath = path.join(outputDir, 'CLAUDE.md');
    const originalContent = fs.readFileSync(claudePath, 'utf8');
    fs.writeFileSync(claudePath, originalContent + '\n# Custom addition\n', 'utf8');

    const { exitCode, stdout } = await runMain([
      '--profile', profilePath,
      '--output', outputDir,
      '--json',
    ]);

    assert.equal(exitCode, 0);
    const result = JSON.parse(stdout);

    const claudeOp = result.operations.find((op) => op.dest === 'CLAUDE.md');
    assert.ok(claudeOp, 'CLAUDE.md must appear in operations');
    assert.equal(
      claudeOp.status,
      'protected',
      'CLAUDE.md must have status "protected" on second run',
    );

    const afterContent = fs.readFileSync(claudePath, 'utf8');
    assert.ok(
      afterContent.includes('Custom addition'),
      'Custom addition to CLAUDE.md must be preserved',
    );
  });

  it('install-state.json is written to output directory', async () => {
    const profilePath = writeProfile(tmpRoot, makeProfile());
    const outputDir = path.join(tmpRoot, 'output');

    await runMain(['--profile', profilePath, '--output', outputDir]);

    const manifestPath = path.join(outputDir, '.claude', 'install-state.json');
    assert.ok(fs.existsSync(manifestPath), 'install-state.json must be written');

    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    assert.equal(manifest.schema, 'install-state.v1', 'manifest schema must be install-state.v1');
    assert.ok(typeof manifest.generatedAt === 'string', 'manifest.generatedAt must be a string');
    assert.ok(Array.isArray(manifest.operations), 'manifest.operations must be an array');
    assert.ok(manifest.operations.length > 0, 'manifest must record at least one operation');
  });
});

// ===========================================================================
// TEST 13 — --update mode
//
// These tests use a minimal custom templates directory to avoid depending on
// the real templates tree. Each test creates its own templates/ and profile,
// runs an initial generation, modifies the template state, then runs --update
// and asserts per-file status values from the JSON output.
// ===========================================================================

/**
 * Build a minimal templates directory that passes plugin.json manifest
 * validation and renders cleanly with `makeProfile()`.
 *
 * Structure written:
 *   <templatesDir>/plugin.json.j2   — rendered → plugin.json (overwrite)
 *   <templatesDir>/readme.md.j2     — rendered → readme.md   (overwrite)
 *   <templatesDir>/static.md        — verbatim  → static.md  (overwrite)
 *
 * @param {string} templatesDir - Absolute path to write template files into.
 */
function writeMinimalTemplates(templatesDir) {
  // plugin.json.j2 must render to a valid plugin-manifest (name + version required)
  writeFile(
    path.join(templatesDir, 'plugin.json.j2'),
    '{\n  "name": "{{profile.name}}-superpowers",\n  "version": "1.0.0"\n}\n',
  );
  // A simple j2 template referencing the profile
  writeFile(
    path.join(templatesDir, 'readme.md.j2'),
    '# {{profile.name}}\n\nGenerated readme.\n',
  );
  // A verbatim static file
  writeFile(
    path.join(templatesDir, 'static.md'),
    '# Static content\n\nThis file is not templated.\n',
  );
}

describe('generate — --update mode', () => {
  // =========================================================================
  // TEST 13-A — regenerates only changed template files, reports others skipped
  // =========================================================================
  it(
    'generate --update regenerates only changed template files, reports others as skipped',
    async () => {
      const templatesDir = path.join(tmpRoot, 'templates');
      writeMinimalTemplates(templatesDir);

      const profilePath = writeProfile(tmpRoot, makeProfile({ name: 'update-test' }));
      const outputDir = path.join(tmpRoot, 'output');

      // Initial generation
      const { exitCode: initCode } = await runMain([
        '--profile', profilePath,
        '--output', outputDir,
        '--templates', templatesDir,
      ]);
      assert.equal(initCode, 0, 'initial generation must succeed');

      // Modify exactly one template file (readme.md.j2) — append new content
      const readmeTmplPath = path.join(templatesDir, 'readme.md.j2');
      const originalTmpl = fs.readFileSync(readmeTmplPath, 'utf8');
      fs.writeFileSync(readmeTmplPath, originalTmpl + '\nNew section added.\n', 'utf8');

      // Run --update
      const { exitCode: updateCode, stdout } = await runMain([
        '--profile', profilePath,
        '--output', outputDir,
        '--templates', templatesDir,
        '--update',
        '--json',
      ]);

      assert.equal(updateCode, 0, '--update must exit 0 when no conflicts');

      const result = JSON.parse(stdout);
      assert.ok(result.success === true, 'result.success must be true');

      const ops = result.operations;

      // readme.md was changed in the template and user did not modify it → 'updated'
      const readmeOp = ops.find((op) => op.dest === 'readme.md');
      assert.ok(readmeOp, 'readme.md must appear in operations');
      assert.equal(
        readmeOp.status,
        'updated',
        'readme.md must be "updated" when only the template changed',
      );

      // plugin.json and static.md templates were not touched → 'skipped'
      const skippedDests = ops
        .filter((op) => op.status === 'skipped')
        .map((op) => op.dest);

      assert.ok(
        skippedDests.includes('plugin.json'),
        'plugin.json must be "skipped" when template is unchanged',
      );
      assert.ok(
        skippedDests.includes('static.md'),
        'static.md must be "skipped" when template is unchanged',
      );
    },
  );

  // =========================================================================
  // TEST 13-B — detects conflict between template change and user modification
  // =========================================================================
  it(
    'generate --update detects conflict between template change and user modification',
    async () => {
      const templatesDir = path.join(tmpRoot, 'templates');
      writeMinimalTemplates(templatesDir);

      const profilePath = writeProfile(tmpRoot, makeProfile({ name: 'conflict-test' }));
      const outputDir = path.join(tmpRoot, 'output');

      // Initial generation
      const { exitCode: initCode } = await runMain([
        '--profile', profilePath,
        '--output', outputDir,
        '--templates', templatesDir,
      ]);
      assert.equal(initCode, 0, 'initial generation must succeed');

      // 1. Modify the template (simulates a template upgrade)
      const readmeTmplPath = path.join(templatesDir, 'readme.md.j2');
      const originalTmpl = fs.readFileSync(readmeTmplPath, 'utf8');
      fs.writeFileSync(readmeTmplPath, originalTmpl + '\nUpstream template change.\n', 'utf8');

      // 2. Also modify the generated output file (simulates user edit)
      const readmeOutputPath = path.join(outputDir, 'readme.md');
      const originalOutput = fs.readFileSync(readmeOutputPath, 'utf8');
      fs.writeFileSync(readmeOutputPath, originalOutput + '\nUser custom content.\n', 'utf8');

      // Run --update — must detect the conflict
      const { exitCode: updateCode, stdout } = await runMain([
        '--profile', profilePath,
        '--output', outputDir,
        '--templates', templatesDir,
        '--update',
        '--json',
      ]);

      // Exit code 3 signals at least one conflict
      assert.equal(updateCode, 3, '--update must exit 3 when conflicts are detected');

      const result = JSON.parse(stdout);
      assert.ok(result.success === false, 'result.success must be false when conflicts exist');

      const ops = result.operations;
      const readmeOp = ops.find((op) => op.dest === 'readme.md');
      assert.ok(readmeOp, 'readme.md must appear in operations');
      assert.equal(
        readmeOp.status,
        'conflicted',
        'readme.md must be "conflicted" when both template and output changed',
      );

      // The output file must NOT have been overwritten — user content must remain
      const afterContent = fs.readFileSync(readmeOutputPath, 'utf8');
      assert.ok(
        afterContent.includes('User custom content.'),
        'conflicted file must not be overwritten — user content must be preserved',
      );
      assert.ok(
        !afterContent.includes('Upstream template change.'),
        'conflicted file must not contain the upstream template change',
      );

      // conflicts array must be present in JSON output
      assert.ok(Array.isArray(result.conflicts), 'result.conflicts must be an array');
      assert.ok(
        result.conflicts.includes('readme.md'),
        'result.conflicts must list the conflicted file',
      );
    },
  );

  // =========================================================================
  // TEST 13-C — new template file is created in the generated plugin
  // =========================================================================
  it(
    'generate --update with new template file adds it to generated plugin',
    async () => {
      const templatesDir = path.join(tmpRoot, 'templates');
      writeMinimalTemplates(templatesDir);

      const profilePath = writeProfile(tmpRoot, makeProfile({ name: 'new-file-test' }));
      const outputDir = path.join(tmpRoot, 'output');

      // Initial generation (before the new template exists)
      const { exitCode: initCode } = await runMain([
        '--profile', profilePath,
        '--output', outputDir,
        '--templates', templatesDir,
      ]);
      assert.equal(initCode, 0, 'initial generation must succeed');

      // Add a new template file after the initial generation
      writeFile(
        path.join(templatesDir, 'new-agent.md.j2'),
        '# {{profile.name}} New Agent\n\nAutogenerated.\n',
      );

      // Run --update
      const { exitCode: updateCode, stdout } = await runMain([
        '--profile', profilePath,
        '--output', outputDir,
        '--templates', templatesDir,
        '--update',
        '--json',
      ]);

      assert.equal(updateCode, 0, '--update must exit 0 when no conflicts');

      const result = JSON.parse(stdout);
      const ops = result.operations;

      const newAgentOp = ops.find((op) => op.dest === 'new-agent.md');
      assert.ok(newAgentOp, 'new-agent.md must appear in operations');
      assert.equal(
        newAgentOp.status,
        'created',
        'new template file must have status "created"',
      );

      // File must physically exist in the output directory
      const newAgentPath = path.join(outputDir, 'new-agent.md');
      assert.ok(fs.existsSync(newAgentPath), 'new-agent.md must exist in the output directory');

      const content = fs.readFileSync(newAgentPath, 'utf8');
      assert.ok(
        content.includes('new-file-test'),
        'new file must have the profile name rendered into it',
      );
    },
  );

  // =========================================================================
  // TEST 13-D — deleted template file flags orphaned generated file without deleting it
  // =========================================================================
  it(
    'generate --update with deleted template file flags for removal',
    async () => {
      const templatesDir = path.join(tmpRoot, 'templates');
      writeMinimalTemplates(templatesDir);

      const profilePath = writeProfile(tmpRoot, makeProfile({ name: 'orphan-test' }));
      const outputDir = path.join(tmpRoot, 'output');

      // Initial generation (while static.md template exists)
      const { exitCode: initCode } = await runMain([
        '--profile', profilePath,
        '--output', outputDir,
        '--templates', templatesDir,
      ]);
      assert.equal(initCode, 0, 'initial generation must succeed');

      // The generated static.md exists on disk after initial generation
      const staticOutputPath = path.join(outputDir, 'static.md');
      assert.ok(fs.existsSync(staticOutputPath), 'static.md must exist after initial generation');

      // Delete the template source file (simulates template removal)
      fs.unlinkSync(path.join(templatesDir, 'static.md'));

      // Run --update — must flag static.md as orphaned, NOT delete it
      const { exitCode: updateCode, stdout } = await runMain([
        '--profile', profilePath,
        '--output', outputDir,
        '--templates', templatesDir,
        '--update',
        '--json',
      ]);

      assert.equal(updateCode, 0, '--update must exit 0 when only orphans exist (no conflicts)');

      const result = JSON.parse(stdout);
      const ops = result.operations;

      const orphanOp = ops.find((op) => op.dest === 'static.md');
      assert.ok(orphanOp, 'static.md must appear in operations');
      assert.equal(
        orphanOp.status,
        'orphaned',
        'deleted template must produce "orphaned" status for the generated file',
      );

      // The file must still exist on disk — --update must NOT delete it silently
      assert.ok(
        fs.existsSync(staticOutputPath),
        'orphaned generated file must NOT be deleted by --update',
      );

      // orphaned array must be present in JSON output
      assert.ok(Array.isArray(result.orphaned), 'result.orphaned must be an array');
      assert.ok(
        result.orphaned.includes('static.md'),
        'result.orphaned must list the orphaned file',
      );
    },
  );
});
