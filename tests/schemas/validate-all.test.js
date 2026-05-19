/**
 * @file validate-all.test.js
 * @description Integration tests for the schema-validator module against all
 * project JSON schemas. Uses the Node.js built-in test runner (node:test).
 */

import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import { createValidator } from '../../scripts/lib/schema-validator.js';

const SCHEMAS_DIR = new URL('../../schemas/', import.meta.url).pathname;

// ---------------------------------------------------------------------------
// Shared validator instance — loaded once before all suites.
// ---------------------------------------------------------------------------

/** @type {ReturnType<typeof createValidator>} */
let validator;

// ---------------------------------------------------------------------------
// Minimal valid fixtures
// ---------------------------------------------------------------------------

/** @returns {object} Minimal valid profile object */
const validProfile = () => ({
  name: 'my-project',
  stack: { language: 'typescript', framework: 'express' },
  orm: null,
  test_framework: 'jest',
  concurrency_model: 'node-async',
  ci_platform: 'github',
});

/** @returns {object} Minimal valid install-state object */
const validInstallState = () => ({
  schema: 'install-state.v1',
  generatedAt: '2026-05-17T12:00:00.000Z',
  templateVersion: '1.0.0',
  profileHash: 'sha256:' + 'a'.repeat(64),
  operations: [],
});

/** @returns {object} Minimal valid review-output object */
const validReviewOutput = () => ({
  status: 'pass',
  issues: [],
  summary: 'No issues found.',
});

/** @returns {object} Minimal valid conformance-report object */
const validConformanceReport = () => ({
  schema: 'conformance-report.v1',
  checkedAt: '2026-05-17T12:00:00.000Z',
  summary: {
    okCount: 5,
    driftedCount: 0,
    missingCount: 0,
    protectedCount: 1,
    errorCount: 0,
  },
  files: [],
});

/** @returns {object} Minimal valid orchestrator-aggregation object */
const validOrchestratorAggregation = () => ({
  healthScore: 'HEALTHY',
  agentResults: [
    { agent: 'security-review', status: 'pass', issueCount: 0 },
  ],
  summary: 'All checks passed with no issues.',
});

// ---------------------------------------------------------------------------
// Suite: loader
// ---------------------------------------------------------------------------

describe('createValidator', () => {
  before(() => {
    validator = createValidator(SCHEMAS_DIR);
  });

  it('loads all schemas from the directory without error', () => {
    assert.ok(validator, 'createValidator should return a truthy validator instance');
  });
});

// ---------------------------------------------------------------------------
// Suite: profile.schema.json
// ---------------------------------------------------------------------------

describe('profile schema', () => {
  before(() => {
    validator = createValidator(SCHEMAS_DIR);
  });

  it('passes for valid profile data', () => {
    const result = validator.validate('profile.schema.json', validProfile());
    assert.equal(result.valid, true, `Expected valid but got errors: ${JSON.stringify(result.errors)}`);
    assert.equal(result.errors, null);
  });

  it('fails when required field "name" is missing', () => {
    const data = validProfile();
    delete data.name;

    const result = validator.validate('profile.schema.json', data);
    assert.equal(result.valid, false);
    assert.ok(Array.isArray(result.errors) && result.errors.length > 0, 'errors array should be non-empty');

    const mentionsName = result.errors.some(
      (e) => e.path?.includes('name') || e.message?.includes('name'),
    );
    assert.ok(mentionsName, `Expected an error referencing "name", got: ${JSON.stringify(result.errors)}`);
  });

  it('fails when an unknown top-level field is present (additionalProperties: false)', () => {
    const data = { ...validProfile(), unknownField: 'should-be-rejected' };

    const result = validator.validate('profile.schema.json', data);
    assert.equal(result.valid, false);
    assert.ok(Array.isArray(result.errors) && result.errors.length > 0);
  });
});

// ---------------------------------------------------------------------------
// Suite: install-state.schema.json
// ---------------------------------------------------------------------------

describe('install-state schema', () => {
  before(() => {
    validator = createValidator(SCHEMAS_DIR);
  });

  it('passes for valid install-state data', () => {
    const result = validator.validate('install-state.schema.json', validInstallState());
    assert.equal(result.valid, true, `Expected valid but got errors: ${JSON.stringify(result.errors)}`);
    assert.equal(result.errors, null);
  });

  it('fails when schema version string does not match the required const', () => {
    const data = { ...validInstallState(), schema: 'install-state.v2' };

    const result = validator.validate('install-state.schema.json', data);
    assert.equal(result.valid, false);
    assert.ok(Array.isArray(result.errors) && result.errors.length > 0);
  });
});

// ---------------------------------------------------------------------------
// Suite: review-output.schema.json
// ---------------------------------------------------------------------------

describe('review-output schema', () => {
  before(() => {
    validator = createValidator(SCHEMAS_DIR);
  });

  it('passes for valid review-output data', () => {
    const result = validator.validate('review-output.schema.json', validReviewOutput());
    assert.equal(result.valid, true, `Expected valid but got errors: ${JSON.stringify(result.errors)}`);
    assert.equal(result.errors, null);
  });

  it('fails when status is not a valid enum value', () => {
    const data = { ...validReviewOutput(), status: 'unknown' };

    const result = validator.validate('review-output.schema.json', data);
    assert.equal(result.valid, false);
    assert.ok(Array.isArray(result.errors) && result.errors.length > 0);
  });

  it('fails when an issue has line < 1', () => {
    const data = {
      ...validReviewOutput(),
      issues: [
        {
          severity: 'error',
          confidence: 'high',
          file: 'src/index.js',
          line: 0,
          message: 'Something is wrong.',
          suggestedFix: '',
        },
      ],
    };

    const result = validator.validate('review-output.schema.json', data);
    assert.equal(result.valid, false);
    assert.ok(Array.isArray(result.errors) && result.errors.length > 0);
  });
});

// ---------------------------------------------------------------------------
// Suite: conformance-report.schema.json
// ---------------------------------------------------------------------------

describe('conformance-report schema', () => {
  before(() => {
    validator = createValidator(SCHEMAS_DIR);
  });

  it('passes for valid conformance-report data', () => {
    const result = validator.validate('conformance-report.schema.json', validConformanceReport());
    assert.equal(result.valid, true, `Expected valid but got errors: ${JSON.stringify(result.errors)}`);
    assert.equal(result.errors, null);
  });
});

// ---------------------------------------------------------------------------
// Suite: orchestrator-aggregation.schema.json
// ---------------------------------------------------------------------------

describe('orchestrator-aggregation schema', () => {
  before(() => {
    validator = createValidator(SCHEMAS_DIR);
  });

  it('passes for valid orchestrator-aggregation data', () => {
    const result = validator.validate('orchestrator-aggregation.schema.json', validOrchestratorAggregation());
    assert.equal(result.valid, true, `Expected valid but got errors: ${JSON.stringify(result.errors)}`);
    assert.equal(result.errors, null);
  });
});

// ---------------------------------------------------------------------------
// Suite: structured error paths
// ---------------------------------------------------------------------------

describe('structured error paths', () => {
  before(() => {
    validator = createValidator(SCHEMAS_DIR);
  });

  it('returns a JSON path referencing /stack/language for a nested failure', () => {
    const data = validProfile();
    // language has minLength: 1, so an empty string violates the constraint
    data.stack.language = '';

    const result = validator.validate('profile.schema.json', data);
    assert.equal(result.valid, false);
    assert.ok(Array.isArray(result.errors) && result.errors.length > 0);

    const pathMatches = result.errors.some(
      (e) => e.path === '/stack/language' || e.path?.includes('stack') && e.path?.includes('language'),
    );
    assert.ok(
      pathMatches,
      `Expected an error with path containing /stack/language, got: ${JSON.stringify(result.errors)}`,
    );
  });
});
