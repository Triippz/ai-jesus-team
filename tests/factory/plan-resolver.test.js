/**
 * TDD red-phase tests for the plan resolver module.
 * The implementation at ../../scripts/lib/plan-resolver.js does not exist yet.
 * These tests are expected to fail on import until the module is created.
 *
 * resolveGeneratePlan is READ-ONLY — it must produce zero file-system side
 * effects.  All tests that need an output directory verify the directory
 * remains empty after the call.
 *
 * @module tests/factory/plan-resolver.test.js
 */

import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

import { resolveGeneratePlan } from '../../scripts/lib/plan-resolver.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Writes a file, creating parent directories as needed.
 * @param {string} filePath - Absolute path to write.
 * @param {string} content  - UTF-8 content.
 */
function writeFile(filePath, content) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content, 'utf8');
}

/**
 * Builds a minimal valid profile object.
 * @returns {object}
 */
function validProfile() {
  return {
    name: 'test-project',
    stack: { language: 'javascript', framework: 'node' },
    orm: null,
    test_framework: 'node:test',
    concurrency_model: 'async-await',
    ci_platform: 'github',
  };
}

// ---------------------------------------------------------------------------
// Per-test temp directories
// ---------------------------------------------------------------------------

/** @type {string} */
let tmpRoot;
/** @type {string} */
let profilePath;
/** @type {string} */
let templatesDir;
/** @type {string} */
let outputDir;

beforeEach(() => {
  tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'plan-resolver-'));
  templatesDir = path.join(tmpRoot, 'templates');
  outputDir = path.join(tmpRoot, 'output');
  fs.mkdirSync(templatesDir, { recursive: true });
  fs.mkdirSync(outputDir, { recursive: true });

  // Write a valid profile JSON file
  profilePath = path.join(tmpRoot, 'profile.json');
  fs.writeFileSync(profilePath, JSON.stringify(validProfile()), 'utf8');

  // Populate the templates directory with a representative set of files
  writeFile(path.join(templatesDir, 'CLAUDE.md.j2'), '# CLAUDE\n{{profile.name}}');
  writeFile(path.join(templatesDir, 'AGENTS.md.j2'), '# AGENTS\n{{profile.name}}');
  writeFile(path.join(templatesDir, 'hooks.json.j2'), '{"hooks": []}');
  writeFile(path.join(templatesDir, 'settings.json'), '{"model": "default"}');
  writeFile(path.join(templatesDir, 'README.md.j2'), '# {{profile.name}} README');
  writeFile(path.join(templatesDir, 'scripts', 'setup.js'), 'console.log("setup");');
});

afterEach(() => {
  fs.rmSync(tmpRoot, { recursive: true, force: true });
});

// ---------------------------------------------------------------------------
// 1. Returns a non-empty operations array for a valid profile + templates
// ---------------------------------------------------------------------------
describe('resolveGeneratePlan — basic result shape', () => {
  it('returns an object with an operations array that is not empty', async () => {
    const result = await resolveGeneratePlan(profilePath, templatesDir, outputDir);

    assert.ok(result !== null && typeof result === 'object', 'result must be an object');
    assert.ok(Array.isArray(result.operations), 'result.operations must be an array');
    assert.ok(result.operations.length > 0, 'operations must not be empty for a populated templates dir');
  });

  it('returns a profile property matching the parsed profile JSON', async () => {
    const result = await resolveGeneratePlan(profilePath, templatesDir, outputDir);

    assert.ok(result.profile !== undefined, 'result.profile must be present');
    assert.equal(result.profile.name, 'test-project');
  });

  it('returns an errors array (empty on success)', async () => {
    const result = await resolveGeneratePlan(profilePath, templatesDir, outputDir);

    assert.ok(Array.isArray(result.errors), 'result.errors must be an array');
    assert.equal(result.errors.length, 0, 'errors must be empty for a valid profile');
  });

  it('each operation has source, dest, strategy, and templateContent fields', async () => {
    const result = await resolveGeneratePlan(profilePath, templatesDir, outputDir);

    for (const op of result.operations) {
      assert.ok(typeof op.source === 'string', `op.source must be a string, got ${typeof op.source}`);
      assert.ok(typeof op.dest === 'string', `op.dest must be a string, got ${typeof op.dest}`);
      assert.ok(typeof op.strategy === 'string', `op.strategy must be a string, got ${typeof op.strategy}`);
      assert.ok('templateContent' in op, 'op must have a templateContent field');
    }
  });
});

// ---------------------------------------------------------------------------
// 2. Operations are sorted alphabetically by dest
// ---------------------------------------------------------------------------
describe('resolveGeneratePlan — deterministic ordering', () => {
  it('returns operations sorted alphabetically by dest path', async () => {
    const result = await resolveGeneratePlan(profilePath, templatesDir, outputDir);
    const dests = result.operations.map((op) => op.dest);
    const sorted = [...dests].sort((a, b) => a.localeCompare(b));

    assert.deepEqual(dests, sorted, 'operations must be sorted alphabetically by dest');
  });
});

// ---------------------------------------------------------------------------
// 3. .j2 extension is stripped from dest path
// ---------------------------------------------------------------------------
describe('resolveGeneratePlan — .j2 extension stripping', () => {
  it('strips the .j2 extension from the dest path of a .j2 source file', async () => {
    const result = await resolveGeneratePlan(profilePath, templatesDir, outputDir);

    const readmeDest = result.operations.find((op) => op.source.endsWith('README.md.j2'));
    assert.ok(readmeDest, 'should have an operation for README.md.j2');
    assert.ok(
      !readmeDest.dest.endsWith('.j2'),
      `dest should not end with .j2, got: ${readmeDest.dest}`
    );
    assert.ok(
      readmeDest.dest.endsWith('README.md'),
      `dest should end with README.md, got: ${readmeDest.dest}`
    );
  });
});

// ---------------------------------------------------------------------------
// 4. CLAUDE.md.j2 gets strategy 'skip_if_exists'
// ---------------------------------------------------------------------------
describe('resolveGeneratePlan — strategy: skip_if_exists', () => {
  it("assigns strategy 'skip_if_exists' to CLAUDE.md.j2", async () => {
    const result = await resolveGeneratePlan(profilePath, templatesDir, outputDir);

    const op = result.operations.find((op) => op.source.endsWith('CLAUDE.md.j2'));
    assert.ok(op, 'should have an operation for CLAUDE.md.j2');
    assert.equal(op.strategy, 'skip_if_exists');
  });

  it("assigns strategy 'skip_if_exists' to AGENTS.md.j2", async () => {
    const result = await resolveGeneratePlan(profilePath, templatesDir, outputDir);

    const op = result.operations.find((op) => op.source.endsWith('AGENTS.md.j2'));
    assert.ok(op, 'should have an operation for AGENTS.md.j2');
    assert.equal(op.strategy, 'skip_if_exists');
  });
});

// ---------------------------------------------------------------------------
// 5. hooks.json.j2 gets strategy 'deep_merge'
// ---------------------------------------------------------------------------
describe('resolveGeneratePlan — strategy: deep_merge', () => {
  it("assigns strategy 'deep_merge' to hooks.json.j2", async () => {
    const result = await resolveGeneratePlan(profilePath, templatesDir, outputDir);

    const op = result.operations.find((op) => op.source.endsWith('hooks.json.j2'));
    assert.ok(op, 'should have an operation for hooks.json.j2');
    assert.equal(op.strategy, 'deep_merge');
  });

  it("assigns strategy 'deep_merge' to settings.json", async () => {
    const result = await resolveGeneratePlan(profilePath, templatesDir, outputDir);

    const op = result.operations.find((op) => op.source.endsWith('settings.json'));
    assert.ok(op, 'should have an operation for settings.json');
    assert.equal(op.strategy, 'deep_merge');
  });
});

// ---------------------------------------------------------------------------
// 6. Regular .md.j2 files get strategy 'overwrite'
// ---------------------------------------------------------------------------
describe('resolveGeneratePlan — strategy: overwrite (template file)', () => {
  it("assigns strategy 'overwrite' to a regular .md.j2 file", async () => {
    const result = await resolveGeneratePlan(profilePath, templatesDir, outputDir);

    const op = result.operations.find((op) => op.source.endsWith('README.md.j2'));
    assert.ok(op, 'should have an operation for README.md.j2');
    assert.equal(op.strategy, 'overwrite');
  });
});

// ---------------------------------------------------------------------------
// 7. Non-.j2 files (e.g. .js) are included with strategy 'overwrite'
// ---------------------------------------------------------------------------
describe('resolveGeneratePlan — non-.j2 file handling', () => {
  it('includes non-.j2 files in the operations array', async () => {
    const result = await resolveGeneratePlan(profilePath, templatesDir, outputDir);

    const op = result.operations.find((op) => op.source.endsWith('setup.js'));
    assert.ok(op, 'should have an operation for the non-.j2 .js file');
  });

  it("assigns strategy 'overwrite' to a non-.j2 file", async () => {
    const result = await resolveGeneratePlan(profilePath, templatesDir, outputDir);

    const op = result.operations.find((op) => op.source.endsWith('setup.js'));
    assert.ok(op, 'should have an operation for setup.js');
    assert.equal(op.strategy, 'overwrite');
  });

  it('preserves the original filename (no extension stripping) for non-.j2 files', async () => {
    const result = await resolveGeneratePlan(profilePath, templatesDir, outputDir);

    const op = result.operations.find((op) => op.source.endsWith('setup.js'));
    assert.ok(op, 'should have an operation for setup.js');
    assert.ok(op.dest.endsWith('setup.js'), `dest should end with setup.js, got: ${op.dest}`);
  });
});

// ---------------------------------------------------------------------------
// 8. Invalid profile returns non-empty errors and empty operations
// ---------------------------------------------------------------------------
describe('resolveGeneratePlan — invalid profile', () => {
  it('returns a non-empty errors array when the profile is missing a required field', async () => {
    const invalidProfile = { name: 'broken' }; // missing stack, orm, etc.
    const badProfilePath = path.join(tmpRoot, 'bad-profile.json');
    fs.writeFileSync(badProfilePath, JSON.stringify(invalidProfile), 'utf8');

    const result = await resolveGeneratePlan(badProfilePath, templatesDir, outputDir);

    assert.ok(Array.isArray(result.errors), 'result.errors must be an array');
    assert.ok(result.errors.length > 0, 'errors must be non-empty for an invalid profile');
  });

  it('returns an empty operations array when the profile is invalid', async () => {
    const invalidProfile = { name: 'broken' };
    const badProfilePath = path.join(tmpRoot, 'bad-profile.json');
    fs.writeFileSync(badProfilePath, JSON.stringify(invalidProfile), 'utf8');

    const result = await resolveGeneratePlan(badProfilePath, templatesDir, outputDir);

    assert.ok(Array.isArray(result.operations), 'result.operations must be an array');
    assert.equal(result.operations.length, 0, 'operations must be empty when profile is invalid');
  });
});

// ---------------------------------------------------------------------------
// 9. Empty templates directory returns empty operations (no error)
// ---------------------------------------------------------------------------
describe('resolveGeneratePlan — empty templates directory', () => {
  it('returns an empty operations array for an empty templates directory', async () => {
    const emptyTemplatesDir = path.join(tmpRoot, 'empty-templates');
    fs.mkdirSync(emptyTemplatesDir, { recursive: true });

    const result = await resolveGeneratePlan(profilePath, emptyTemplatesDir, outputDir);

    assert.ok(Array.isArray(result.operations), 'result.operations must be an array');
    assert.equal(result.operations.length, 0, 'operations must be empty for an empty templates dir');
  });

  it('does not add errors when templates directory is empty', async () => {
    const emptyTemplatesDir = path.join(tmpRoot, 'empty-templates');
    fs.mkdirSync(emptyTemplatesDir, { recursive: true });

    const result = await resolveGeneratePlan(profilePath, emptyTemplatesDir, outputDir);

    assert.ok(Array.isArray(result.errors), 'result.errors must be an array');
    assert.equal(result.errors.length, 0, 'an empty templates dir is not a validation error');
  });
});

// ---------------------------------------------------------------------------
// 10. Zero side effects — no files created in outputDir
// ---------------------------------------------------------------------------
describe('resolveGeneratePlan — zero side effects', () => {
  it('does not create any files in outputDir', async () => {
    await resolveGeneratePlan(profilePath, templatesDir, outputDir);

    const entries = fs.readdirSync(outputDir, { recursive: true });
    assert.equal(
      entries.length,
      0,
      `outputDir must remain empty after resolveGeneratePlan, found: ${entries.join(', ')}`
    );
  });

  it('does not modify the templates directory', async () => {
    const before = fs
      .readdirSync(templatesDir, { recursive: true })
      .sort();

    await resolveGeneratePlan(profilePath, templatesDir, outputDir);

    const after = fs
      .readdirSync(templatesDir, { recursive: true })
      .sort();

    assert.deepEqual(after, before, 'templates directory must be unmodified after resolveGeneratePlan');
  });

  it('does not modify the profile file', async () => {
    const beforeStat = fs.statSync(profilePath);

    await resolveGeneratePlan(profilePath, templatesDir, outputDir);

    const afterStat = fs.statSync(profilePath);
    assert.equal(
      afterStat.mtimeMs,
      beforeStat.mtimeMs,
      'profile file mtime must not change after resolveGeneratePlan'
    );
  });
});

// ---------------------------------------------------------------------------
// 11. Determinism — two calls with the same input produce identical results
// ---------------------------------------------------------------------------
describe('resolveGeneratePlan — determinism', () => {
  it('produces identical operations on two consecutive calls with the same input', async () => {
    const first = await resolveGeneratePlan(profilePath, templatesDir, outputDir);
    const second = await resolveGeneratePlan(profilePath, templatesDir, outputDir);

    assert.deepEqual(
      first.operations,
      second.operations,
      'two calls with identical inputs must produce identical operations arrays'
    );
  });

  it('produces identical errors on two consecutive calls with the same input', async () => {
    const first = await resolveGeneratePlan(profilePath, templatesDir, outputDir);
    const second = await resolveGeneratePlan(profilePath, templatesDir, outputDir);

    assert.deepEqual(first.errors, second.errors, 'errors must be identical across calls');
  });
});
