/**
 * @file schema-validator.js
 * @description AJV-backed JSON schema validator. Loads all `.schema.json` files
 * from a given directory and exposes a `validate(schemaId, data)` method.
 *
 * @module schema-validator
 */

import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import fs from 'node:fs';
import path from 'node:path';

/**
 * @typedef {Object} ValidationError
 * @property {string} path - JSON pointer path to the failing field (e.g. "/stack/language")
 * @property {string} message - Human-readable error description
 */

/**
 * @typedef {Object} ValidationResult
 * @property {boolean} valid - Whether the data conforms to the schema
 * @property {ValidationError[]|null} errors - Array of errors when invalid, null when valid
 */

/**
 * @typedef {Object} Validator
 * @property {function(string, unknown): ValidationResult} validate - Validate data against a named schema
 */

/**
 * Loads all `.schema.json` files from `schemasDir`, registers them with AJV,
 * and returns a validator instance.
 *
 * @param {string} schemasDir - Absolute path to the directory containing schema files
 * @returns {Validator} Validator instance with a `validate` method
 * @throws {Error} If schemasDir cannot be read or a schema file contains invalid JSON
 */
export function createValidator(schemasDir) {
  const ajv = new Ajv({ allErrors: true });
  addFormats(ajv);

  const schemaFiles = fs
    .readdirSync(schemasDir)
    .filter((filename) => filename.endsWith('.schema.json'));

  for (const filename of schemaFiles) {
    const fullPath = path.join(schemasDir, filename);
    const raw = fs.readFileSync(fullPath, 'utf8');
    const schema = JSON.parse(raw);
    ajv.addSchema(schema, schema.$id);
  }

  return {
    /**
     * Validates `data` against the schema identified by `schemaId`.
     *
     * @param {string} schemaId - The `$id` of the target schema (e.g. "profile.schema.json")
     * @param {unknown} data - The data to validate
     * @returns {ValidationResult}
     * @throws {Error} If no schema with the given `schemaId` has been loaded
     */
    validate(schemaId, data) {
      const validateFn = ajv.getSchema(schemaId);
      if (!validateFn) {
        throw new Error(`Schema not found: "${schemaId}"`);
      }

      const valid = validateFn(data);

      if (valid) {
        return { valid: true, errors: null };
      }

      const errors = (validateFn.errors ?? []).map((error) => ({
        path: error.instancePath || '/',
        message: error.message ?? 'Unknown validation error',
      }));

      return { valid: false, errors };
    },
  };
}
