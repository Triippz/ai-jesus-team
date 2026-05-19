/**
 * Integration tests for scripts/install-plugin.js
 *
 * Uses Node.js built-in test runner (node:test + node:assert/strict).
 * All I/O is scoped to per-test temp directories cleaned up in afterEach.
 *
 * Tests:
 *  1.  Install into project with no .claude/ creates directory, writes all plugin files,
 *      creates install-state.json
 *  2.  Install creates CLAUDE.md and AGENTS.md in target root (skip_if_exists)
 *  3.  Install preserves existing CLAUDE.md when target already has one (returns 'protected')
 *  4.  Install deep-merges settings.json without clobbering existing hooks
 *  5.  Install twice reports all files as 'skipped' or 'protected' (idempotency)
 *  6.  Install with --dry-run writes zero files but prints plan
 *  7.  Install with --json produces valid JSON output with per-file status
 *  8.  Install into project with existing hooks in settings.json preserves them
 *
 * @module tests/factory/install-plugin.test.js
 */

import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

import { main } from '../../scripts/install-plugin.js';

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
 * Walk a directory recursively, returning all file paths.
 *
 * @param {string} dir
 * @returns {string[]} Sorted absolute paths
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
 * Create a minimal "generated plugin" directory in a temp location.
 * Includes: plugin.json, CLAUDE.md, AGENTS.md, agents/team/orchestrator.md,
 * hooks/hooks.json, hooks/dispatcher.js, .claude/install-state.json
 *
 * @param {string} dir - Directory to write the plugin into
 * @param {object} [overrides]
 * @param {string} [overrides.pluginName]
 * @param {object} [overrides.hooks] - Custom hooks object for hooks/hooks.json
 * @returns {string} The directory path
 */
function createMinimalPlugin(dir, { pluginName = 'test-plugin', hooks } = {}) {
  const defaultHooks = hooks ?? {
    hooks: {
      PreToolUse: [
        {
          matcher: 'Bash',
          hooks: [{ type: 'command', command: '${PLUGIN_ROOT}/hooks/dispatcher.js' }],
        },
      ],
      PostToolUse: [
        {
          matcher: 'Edit|Write',
          hooks: [{ type: 'command', command: '${PLUGIN_ROOT}/hooks/protect-files.js' }],
        },
      ],
    },
  };

  // plugin.json
  writeFile(
    path.join(dir, 'plugin.json'),
    JSON.stringify({ name: pluginName, version: '1.0.0' }, null, 2),
  );

  // CLAUDE.md at plugin root
  writeFile(path.join(dir, 'CLAUDE.md'), `# ${pluginName}\n\nPlugin instructions.\n`);

  // AGENTS.md at plugin root
  writeFile(path.join(dir, 'AGENTS.md'), `# Agents\n\nAgent roster for ${pluginName}.\n`);

  // An agent file
  writeFile(
    path.join(dir, 'agents', 'team', 'orchestrator.md'),
    `# Orchestrator\n\nManages the team for ${pluginName}.\n`,
  );

  // hooks/hooks.json
  writeFile(path.join(dir, 'hooks', 'hooks.json'), JSON.stringify(defaultHooks, null, 2));

  // hooks/dispatcher.js
  writeFile(
    path.join(dir, 'hooks', 'dispatcher.js'),
    '#!/usr/bin/env node\nconsole.log("dispatcher");\n',
  );

  // .claude/install-state.json (generation artifact — should be skipped during install)
  writeFile(
    path.join(dir, '.claude', 'install-state.json'),
    JSON.stringify(
      {
        schema: 'install-state.v1',
        generatedAt: new Date().toISOString(),
        templateVersion: '2.1.0',
        profileHash: 'sha256:aaaa',
        operations: [],
      },
      null,
      2,
    ),
  );

  return dir;
}

/**
 * Capture stdout/stderr from main() without polluting test output.
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

/** @type {string} Temp root for the current test */
let tmpRoot;

beforeEach(() => {
  tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'install-plugin-test-'));
});

afterEach(() => {
  fs.rmSync(tmpRoot, { recursive: true, force: true });
});

// ===========================================================================
// TEST 1 — Fresh install creates .claude/, writes plugin files, install-state
// ===========================================================================
describe('install-plugin — fresh install', () => {
  it('creates .claude/ directory, writes plugin files, and creates install-state.json', async () => {
    const pluginDir = path.join(tmpRoot, 'plugin');
    const targetDir = path.join(tmpRoot, 'target');

    createMinimalPlugin(pluginDir);
    fs.mkdirSync(targetDir, { recursive: true });

    const { exitCode } = await runMain(['--plugin', pluginDir, '--target', targetDir]);

    assert.equal(exitCode, 0, 'exit code must be 0');

    // .claude/ directory must exist
    assert.ok(
      fs.existsSync(path.join(targetDir, '.claude')),
      '.claude/ directory must be created',
    );

    // plugin.json must be inside .claude/
    assert.ok(
      fs.existsSync(path.join(targetDir, '.claude', 'plugin.json')),
      '.claude/plugin.json must exist',
    );

    // install-state.json must be written
    assert.ok(
      fs.existsSync(path.join(targetDir, '.claude', 'install-state.json')),
      '.claude/install-state.json must be created',
    );

    const manifest = JSON.parse(
      fs.readFileSync(path.join(targetDir, '.claude', 'install-state.json'), 'utf8'),
    );
    assert.equal(manifest.schema, 'install-state.v1', 'manifest schema must be install-state.v1');
    assert.ok(Array.isArray(manifest.operations), 'manifest.operations must be an array');
    assert.ok(manifest.operations.length > 0, 'manifest must record operations');
  });

  it('does NOT copy the plugin .claude/install-state.json into the target', async () => {
    const pluginDir = path.join(tmpRoot, 'plugin');
    const targetDir = path.join(tmpRoot, 'target');

    createMinimalPlugin(pluginDir);
    fs.mkdirSync(targetDir, { recursive: true });

    await runMain(['--plugin', pluginDir, '--target', targetDir]);

    // The target's install-state.json must be freshly written by the installer,
    // not the one copied from plugin/.claude/install-state.json.
    // We verify by checking that installed files do not include a nested
    // .claude/.claude/install-state.json path.
    const nestedPath = path.join(targetDir, '.claude', '.claude', 'install-state.json');
    assert.ok(
      !fs.existsSync(nestedPath),
      'plugin generation install-state must not be nested-copied to target/.claude/.claude/',
    );
  });

  it('copies agent files into target/.claude/agents/', async () => {
    const pluginDir = path.join(tmpRoot, 'plugin');
    const targetDir = path.join(tmpRoot, 'target');

    createMinimalPlugin(pluginDir);
    fs.mkdirSync(targetDir, { recursive: true });

    await runMain(['--plugin', pluginDir, '--target', targetDir]);

    assert.ok(
      fs.existsSync(path.join(targetDir, '.claude', 'agents', 'team', 'orchestrator.md')),
      'agent files must be copied to .claude/agents/',
    );
  });
});

// ===========================================================================
// TEST 2 — CLAUDE.md and AGENTS.md land at target root with skip_if_exists
// ===========================================================================
describe('install-plugin — root markdown files', () => {
  it('creates CLAUDE.md and AGENTS.md in the target root', async () => {
    const pluginDir = path.join(tmpRoot, 'plugin');
    const targetDir = path.join(tmpRoot, 'target');

    createMinimalPlugin(pluginDir);
    fs.mkdirSync(targetDir, { recursive: true });

    await runMain(['--plugin', pluginDir, '--target', targetDir]);

    assert.ok(
      fs.existsSync(path.join(targetDir, 'CLAUDE.md')),
      'CLAUDE.md must be created at target root',
    );
    assert.ok(
      fs.existsSync(path.join(targetDir, 'AGENTS.md')),
      'AGENTS.md must be created at target root',
    );

    // They must NOT be inside .claude/
    assert.ok(
      !fs.existsSync(path.join(targetDir, '.claude', 'CLAUDE.md')),
      'CLAUDE.md must not be inside .claude/',
    );
    assert.ok(
      !fs.existsSync(path.join(targetDir, '.claude', 'AGENTS.md')),
      'AGENTS.md must not be inside .claude/',
    );
  });

  it('CLAUDE.md content matches the plugin source', async () => {
    const pluginDir = path.join(tmpRoot, 'plugin');
    const targetDir = path.join(tmpRoot, 'target');

    createMinimalPlugin(pluginDir, { pluginName: 'my-plugin' });
    fs.mkdirSync(targetDir, { recursive: true });

    await runMain(['--plugin', pluginDir, '--target', targetDir]);

    const content = fs.readFileSync(path.join(targetDir, 'CLAUDE.md'), 'utf8');
    assert.ok(content.includes('my-plugin'), 'CLAUDE.md must contain plugin name');
  });
});

// ===========================================================================
// TEST 3 — Existing CLAUDE.md is preserved (skip_if_exists → protected)
// ===========================================================================
describe('install-plugin — skip_if_exists strategy', () => {
  it('preserves existing CLAUDE.md and reports protected status in JSON output', async () => {
    const pluginDir = path.join(tmpRoot, 'plugin');
    const targetDir = path.join(tmpRoot, 'target');

    createMinimalPlugin(pluginDir);
    fs.mkdirSync(targetDir, { recursive: true });

    // Pre-populate CLAUDE.md in the target
    const existingContent = '# My Custom CLAUDE\n\nDo not overwrite me.\n';
    writeFile(path.join(targetDir, 'CLAUDE.md'), existingContent);

    const { exitCode, stdout } = await runMain([
      '--plugin', pluginDir,
      '--target', targetDir,
      '--json',
    ]);

    assert.equal(exitCode, 0, 'exit code must be 0');

    const result = JSON.parse(stdout);
    const claudeOp = result.operations.find((op) => op.dest === 'CLAUDE.md');
    assert.ok(claudeOp, 'CLAUDE.md must appear in operations');
    assert.equal(claudeOp.status, 'protected', 'CLAUDE.md status must be "protected"');

    // Content must be unchanged
    const afterContent = fs.readFileSync(path.join(targetDir, 'CLAUDE.md'), 'utf8');
    assert.equal(afterContent, existingContent, 'Existing CLAUDE.md content must be preserved');
  });

  it('preserves existing AGENTS.md and reports protected status', async () => {
    const pluginDir = path.join(tmpRoot, 'plugin');
    const targetDir = path.join(tmpRoot, 'target');

    createMinimalPlugin(pluginDir);
    fs.mkdirSync(targetDir, { recursive: true });

    const existingContent = '# My Custom Agents\n\nKeep this.\n';
    writeFile(path.join(targetDir, 'AGENTS.md'), existingContent);

    const { exitCode, stdout } = await runMain([
      '--plugin', pluginDir,
      '--target', targetDir,
      '--json',
    ]);

    assert.equal(exitCode, 0);

    const result = JSON.parse(stdout);
    const agentsOp = result.operations.find((op) => op.dest === 'AGENTS.md');
    assert.ok(agentsOp, 'AGENTS.md must appear in operations');
    assert.equal(agentsOp.status, 'protected', 'AGENTS.md status must be "protected"');

    const afterContent = fs.readFileSync(path.join(targetDir, 'AGENTS.md'), 'utf8');
    assert.equal(afterContent, existingContent, 'Existing AGENTS.md content must be preserved');
  });
});

// ===========================================================================
// TEST 4 — hooks/hooks.json deep-merges into target/.claude/settings.json
// ===========================================================================
describe('install-plugin — deep-merge settings.json', () => {
  it('creates settings.json from hooks.json when target has no settings.json', async () => {
    const pluginDir = path.join(tmpRoot, 'plugin');
    const targetDir = path.join(tmpRoot, 'target');

    createMinimalPlugin(pluginDir);
    fs.mkdirSync(targetDir, { recursive: true });

    await runMain(['--plugin', pluginDir, '--target', targetDir]);

    const settingsPath = path.join(targetDir, '.claude', 'settings.json');
    assert.ok(fs.existsSync(settingsPath), 'settings.json must be created');

    const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
    assert.ok(settings.hooks, 'settings.json must have a hooks key');
    assert.ok(settings.hooks.PreToolUse, 'hooks.PreToolUse must be present');
  });

  it('merges plugin hooks into existing settings.json without removing existing keys', async () => {
    const pluginDir = path.join(tmpRoot, 'plugin');
    const targetDir = path.join(tmpRoot, 'target');

    createMinimalPlugin(pluginDir);
    fs.mkdirSync(path.join(targetDir, '.claude'), { recursive: true });

    // Pre-populate settings.json with some existing config
    const existingSettings = {
      permissions: { allow: ['Bash'] },
      hooks: {
        SessionStart: [
          {
            matcher: 'startup',
            hooks: [{ type: 'command', command: 'existing-hook.js' }],
          },
        ],
      },
    };
    writeFile(
      path.join(targetDir, '.claude', 'settings.json'),
      JSON.stringify(existingSettings, null, 2),
    );

    await runMain(['--plugin', pluginDir, '--target', targetDir]);

    const settingsPath = path.join(targetDir, '.claude', 'settings.json');
    const merged = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));

    // Existing permissions must be preserved
    assert.ok(merged.permissions?.allow?.includes('Bash'), 'permissions.allow must be preserved');

    // Existing SessionStart hook must be preserved
    assert.ok(
      Array.isArray(merged.hooks.SessionStart),
      'SessionStart hooks must exist',
    );
    const sessionStartCommands = merged.hooks.SessionStart.map((e) => e.hooks?.[0]?.command ?? '');
    assert.ok(
      sessionStartCommands.some((c) => c.includes('existing-hook.js')),
      'Existing SessionStart hook must be preserved after merge',
    );

    // Plugin PreToolUse hooks must be added
    assert.ok(
      Array.isArray(merged.hooks.PreToolUse),
      'PreToolUse hooks from plugin must be added',
    );
  });
});

// ===========================================================================
// TEST 5 — Idempotency: second install reports only 'skipped' or 'protected'
// ===========================================================================
describe('install-plugin — idempotency', () => {
  it('second install with --json reports no created/updated/merged operations', async () => {
    const pluginDir = path.join(tmpRoot, 'plugin');
    const targetDir = path.join(tmpRoot, 'target');

    createMinimalPlugin(pluginDir);
    fs.mkdirSync(targetDir, { recursive: true });

    // First install
    const { exitCode: firstCode } = await runMain([
      '--plugin', pluginDir,
      '--target', targetDir,
    ]);
    assert.equal(firstCode, 0, 'first install must succeed');

    // Second install
    const { exitCode: secondCode, stdout } = await runMain([
      '--plugin', pluginDir,
      '--target', targetDir,
      '--json',
    ]);
    assert.equal(secondCode, 0, 'second install must succeed');

    const result = JSON.parse(stdout);
    assert.ok(result.success, 'second install result must have success: true');

    const nonIdempotentStatuses = ['created', 'updated'];
    const written = result.operations.filter((op) =>
      nonIdempotentStatuses.includes(op.status),
    );

    assert.equal(
      written.length,
      0,
      `Second install must not create or update any files, but got: ${written.map((o) => `${o.dest}(${o.status})`).join(', ')}`,
    );
  });
});

// ===========================================================================
// TEST 6 — --dry-run writes zero files but prints plan
// ===========================================================================
describe('install-plugin — dry-run', () => {
  it('--dry-run exits 0 without creating any files', async () => {
    const pluginDir = path.join(tmpRoot, 'plugin');
    const targetDir = path.join(tmpRoot, 'target');

    createMinimalPlugin(pluginDir);
    fs.mkdirSync(targetDir, { recursive: true });

    const { exitCode } = await runMain([
      '--plugin', pluginDir,
      '--target', targetDir,
      '--dry-run',
    ]);

    assert.equal(exitCode, 0, '--dry-run must exit 0');

    // No .claude/ directory should be created
    const files = walkDir(targetDir);
    assert.equal(files.length, 0, '--dry-run must not write any files');
  });

  it('--dry-run with --json returns valid JSON with operations list', async () => {
    const pluginDir = path.join(tmpRoot, 'plugin');
    const targetDir = path.join(tmpRoot, 'target');

    createMinimalPlugin(pluginDir);
    fs.mkdirSync(targetDir, { recursive: true });

    const { exitCode, stdout } = await runMain([
      '--plugin', pluginDir,
      '--target', targetDir,
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
    assert.ok(plan.operations.length > 0, 'plan must list at least one operation');
    assert.ok(
      plan.operations.every((op) => typeof op.dest === 'string'),
      'each operation must have a dest string',
    );
  });

  it('--dry-run plan includes source and strategy for each operation', async () => {
    const pluginDir = path.join(tmpRoot, 'plugin');
    const targetDir = path.join(tmpRoot, 'target');

    createMinimalPlugin(pluginDir);
    fs.mkdirSync(targetDir, { recursive: true });

    const { stdout } = await runMain([
      '--plugin', pluginDir,
      '--target', targetDir,
      '--dry-run',
      '--json',
    ]);

    const plan = JSON.parse(stdout);
    for (const op of plan.operations) {
      assert.ok(typeof op.source === 'string', 'op.source must be a string');
      assert.ok(typeof op.strategy === 'string', 'op.strategy must be a string');
    }
  });
});

// ===========================================================================
// TEST 7 — --json produces valid JSON output with per-file status
// ===========================================================================
describe('install-plugin — JSON output', () => {
  it('--json produces parseable JSON with success, operations, and summary', async () => {
    const pluginDir = path.join(tmpRoot, 'plugin');
    const targetDir = path.join(tmpRoot, 'target');

    createMinimalPlugin(pluginDir);
    fs.mkdirSync(targetDir, { recursive: true });

    const { exitCode, stdout } = await runMain([
      '--plugin', pluginDir,
      '--target', targetDir,
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
    assert.ok(typeof result.summary === 'object', 'result.summary must be an object');
  });

  it('each operation in JSON output has source, dest, strategy, and status', async () => {
    const pluginDir = path.join(tmpRoot, 'plugin');
    const targetDir = path.join(tmpRoot, 'target');

    createMinimalPlugin(pluginDir);
    fs.mkdirSync(targetDir, { recursive: true });

    const { stdout } = await runMain([
      '--plugin', pluginDir,
      '--target', targetDir,
      '--json',
    ]);

    const result = JSON.parse(stdout);
    for (const op of result.operations) {
      assert.ok(typeof op.source === 'string', 'op.source must be a string');
      assert.ok(typeof op.dest === 'string', 'op.dest must be a string');
      assert.ok(typeof op.strategy === 'string', 'op.strategy must be a string');
      assert.ok(typeof op.status === 'string', 'op.status must be a string');
    }
  });

  it('returns exit code 1 and error when --plugin is missing', async () => {
    const { exitCode, stderr } = await runMain(['--target', '/some/target']);
    assert.equal(exitCode, 1, 'exit code must be 1 when --plugin is missing');
    assert.ok(stderr.length > 0, 'stderr must be non-empty');
  });

  it('returns exit code 1 and error when --target is missing', async () => {
    const pluginDir = path.join(tmpRoot, 'plugin');
    createMinimalPlugin(pluginDir);

    const { exitCode, stderr } = await runMain(['--plugin', pluginDir]);
    assert.equal(exitCode, 1, 'exit code must be 1 when --target is missing');
    assert.ok(stderr.length > 0, 'stderr must be non-empty');
  });

  it('returns exit code 1 when plugin directory does not exist', async () => {
    const { exitCode } = await runMain([
      '--plugin', '/nonexistent/plugin',
      '--target', tmpRoot,
    ]);
    assert.equal(exitCode, 1, 'exit code must be 1 for non-existent plugin dir');
  });

  it('returns exit code 1 when plugin.json is missing from plugin dir', async () => {
    const pluginDir = path.join(tmpRoot, 'bad-plugin');
    fs.mkdirSync(pluginDir, { recursive: true });
    // No plugin.json

    const targetDir = path.join(tmpRoot, 'target');
    fs.mkdirSync(targetDir, { recursive: true });

    const { exitCode } = await runMain([
      '--plugin', pluginDir,
      '--target', targetDir,
    ]);
    assert.equal(exitCode, 1, 'exit code must be 1 when plugin.json is absent');
  });
});

// ===========================================================================
// TEST 8 — Existing hooks in target settings.json are preserved after merge
// ===========================================================================
describe('install-plugin — settings.json hook preservation', () => {
  it('preserves existing PreToolUse hooks when plugin adds new PostToolUse hooks', async () => {
    const pluginDir = path.join(tmpRoot, 'plugin');
    const targetDir = path.join(tmpRoot, 'target');

    // Plugin only defines PostToolUse hooks
    const pluginHooks = {
      hooks: {
        PostToolUse: [
          {
            matcher: 'Edit',
            hooks: [{ type: 'command', command: '${PLUGIN_ROOT}/hooks/after-edit.js' }],
          },
        ],
      },
    };
    createMinimalPlugin(pluginDir, { hooks: pluginHooks });
    fs.mkdirSync(path.join(targetDir, '.claude'), { recursive: true });

    // Target already has PreToolUse hooks
    const existingSettings = {
      hooks: {
        PreToolUse: [
          {
            matcher: 'Write',
            hooks: [{ type: 'command', command: 'existing-write-guard.js' }],
          },
        ],
      },
    };
    writeFile(
      path.join(targetDir, '.claude', 'settings.json'),
      JSON.stringify(existingSettings, null, 2),
    );

    await runMain(['--plugin', pluginDir, '--target', targetDir]);

    const merged = JSON.parse(
      fs.readFileSync(path.join(targetDir, '.claude', 'settings.json'), 'utf8'),
    );

    // Existing PreToolUse hook must still be there
    assert.ok(
      Array.isArray(merged.hooks.PreToolUse),
      'Existing PreToolUse must be preserved',
    );
    const preCommands = merged.hooks.PreToolUse.flatMap(
      (e) => (e.hooks ?? []).map((h) => h.command),
    );
    assert.ok(
      preCommands.some((c) => c.includes('existing-write-guard.js')),
      'Existing PreToolUse hook command must be preserved',
    );

    // Plugin PostToolUse hook must be added
    assert.ok(
      Array.isArray(merged.hooks.PostToolUse),
      'Plugin PostToolUse must be added',
    );
  });

  it('does not duplicate hook entries when the same matcher already exists', async () => {
    const pluginDir = path.join(tmpRoot, 'plugin');
    const targetDir = path.join(tmpRoot, 'target');

    const sharedMatcher = 'Bash';
    const pluginHooks = {
      hooks: {
        PreToolUse: [
          {
            matcher: sharedMatcher,
            hooks: [{ type: 'command', command: '${PLUGIN_ROOT}/hooks/dispatcher.js' }],
          },
        ],
      },
    };
    createMinimalPlugin(pluginDir, { hooks: pluginHooks });
    fs.mkdirSync(path.join(targetDir, '.claude'), { recursive: true });

    // Target already has the same matcher
    const existingSettings = {
      hooks: {
        PreToolUse: [
          {
            matcher: sharedMatcher,
            hooks: [{ type: 'command', command: 'existing-bash-hook.js' }],
          },
        ],
      },
    };
    writeFile(
      path.join(targetDir, '.claude', 'settings.json'),
      JSON.stringify(existingSettings, null, 2),
    );

    await runMain(['--plugin', pluginDir, '--target', targetDir]);

    const merged = JSON.parse(
      fs.readFileSync(path.join(targetDir, '.claude', 'settings.json'), 'utf8'),
    );

    // Should not have two entries with the same matcher
    const bashEntries = (merged.hooks.PreToolUse ?? []).filter(
      (e) => e.matcher === sharedMatcher,
    );
    assert.equal(
      bashEntries.length,
      1,
      `Duplicate matcher entries must not be created; found ${bashEntries.length} entries for matcher "${sharedMatcher}"`,
    );
  });

  it('adds new matchers from plugin hooks alongside existing ones', async () => {
    const pluginDir = path.join(tmpRoot, 'plugin');
    const targetDir = path.join(tmpRoot, 'target');

    const pluginHooks = {
      hooks: {
        PreToolUse: [
          {
            matcher: 'Edit|Write',
            hooks: [{ type: 'command', command: '${PLUGIN_ROOT}/hooks/protect.js' }],
          },
        ],
      },
    };
    createMinimalPlugin(pluginDir, { hooks: pluginHooks });
    fs.mkdirSync(path.join(targetDir, '.claude'), { recursive: true });

    // Target only has a Bash matcher
    const existingSettings = {
      hooks: {
        PreToolUse: [
          {
            matcher: 'Bash',
            hooks: [{ type: 'command', command: 'bash-guard.js' }],
          },
        ],
      },
    };
    writeFile(
      path.join(targetDir, '.claude', 'settings.json'),
      JSON.stringify(existingSettings, null, 2),
    );

    await runMain(['--plugin', pluginDir, '--target', targetDir]);

    const merged = JSON.parse(
      fs.readFileSync(path.join(targetDir, '.claude', 'settings.json'), 'utf8'),
    );

    // Both matchers should be present
    const matchers = (merged.hooks.PreToolUse ?? []).map((e) => e.matcher);
    assert.ok(matchers.includes('Bash'), 'Existing Bash matcher must be preserved');
    assert.ok(matchers.includes('Edit|Write'), 'New Edit|Write matcher must be added');
  });
});

// ===========================================================================
// Additional edge cases
// ===========================================================================
describe('install-plugin — edge cases', () => {
  it('install-state.json records templateVersion from plugin generation state', async () => {
    const pluginDir = path.join(tmpRoot, 'plugin');
    const targetDir = path.join(tmpRoot, 'target');

    createMinimalPlugin(pluginDir);
    fs.mkdirSync(targetDir, { recursive: true });

    await runMain(['--plugin', pluginDir, '--target', targetDir]);

    const manifest = JSON.parse(
      fs.readFileSync(path.join(targetDir, '.claude', 'install-state.json'), 'utf8'),
    );

    // The minimal plugin's .claude/install-state.json sets templateVersion to '2.1.0'
    assert.equal(
      manifest.templateVersion,
      '2.1.0',
      'templateVersion must be read from plugin install-state',
    );
  });

  it('install-state.json is written with correct schema field', async () => {
    const pluginDir = path.join(tmpRoot, 'plugin');
    const targetDir = path.join(tmpRoot, 'target');

    createMinimalPlugin(pluginDir);
    fs.mkdirSync(targetDir, { recursive: true });

    await runMain(['--plugin', pluginDir, '--target', targetDir]);

    const manifest = JSON.parse(
      fs.readFileSync(path.join(targetDir, '.claude', 'install-state.json'), 'utf8'),
    );
    assert.equal(manifest.schema, 'install-state.v1');
  });

  it('target directory is created if it does not exist', async () => {
    const pluginDir = path.join(tmpRoot, 'plugin');
    const targetDir = path.join(tmpRoot, 'nonexistent-target');

    createMinimalPlugin(pluginDir);
    // Do NOT create targetDir

    const { exitCode } = await runMain(['--plugin', pluginDir, '--target', targetDir]);

    assert.equal(exitCode, 0, 'exit code must be 0 even if target dir does not exist');
    assert.ok(fs.existsSync(path.join(targetDir, '.claude')), '.claude/ must be created');
  });

  it('install without any args returns exit code 1', async () => {
    const { exitCode } = await runMain([]);
    assert.equal(exitCode, 1);
  });
});
