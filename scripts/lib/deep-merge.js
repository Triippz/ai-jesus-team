/**
 * @module deep-merge
 * @description Recursively merges two plain objects, tracking what changed.
 */

/**
 * Returns true if the value is a plain (non-array) object.
 *
 * @param {unknown} obj
 * @returns {boolean}
 */
function isPlainObject(obj) {
  return typeof obj === 'object' && obj !== null && !Array.isArray(obj);
}

/**
 * Performs a structural deep-equality check between two values.
 *
 * @param {unknown} a
 * @param {unknown} b
 * @returns {boolean}
 */
function deepEqual(a, b) {
  if (a === b) return true;
  if (a === null || b === null) return false;
  if (typeof a !== typeof b) return false;

  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    return a.every((item, i) => deepEqual(item, b[i]));
  }

  if (isPlainObject(a) && isPlainObject(b)) {
    const keysA = Object.keys(a);
    const keysB = Object.keys(b);
    if (keysA.length !== keysB.length) return false;
    return keysA.every(key => Object.hasOwn(b, key) && deepEqual(a[key], b[key]));
  }

  return false;
}

/**
 * Walks the source object recursively, merging into a cloned target and
 * collecting change records.
 *
 * @param {Record<string, unknown>} targetClone - Already-cloned working copy of target.
 * @param {Record<string, unknown>} source
 * @param {string} prefix - Dot-notation prefix for nested paths.
 * @param {Array<{path: string, action: 'added'|'replaced'|'unchanged'}>} changes
 */
function walk(targetClone, source, prefix, changes) {
  for (const key of Object.keys(source)) {
    const path = prefix ? `${prefix}.${key}` : key;
    const sourceVal = source[key];
    const targetHasKey = Object.hasOwn(targetClone, key);

    if (!targetHasKey) {
      // Key is new — add it and record 'added'.
      targetClone[key] = structuredClone(sourceVal);
      changes.push({ path, action: 'added' });
      continue;
    }

    const targetVal = targetClone[key];

    if (isPlainObject(sourceVal) && isPlainObject(targetVal)) {
      // Both sides are plain objects — recurse without recording a top-level change.
      walk(targetVal, sourceVal, path, changes);
      continue;
    }

    if (deepEqual(targetVal, sourceVal)) {
      changes.push({ path, action: 'unchanged' });
    } else {
      // Arrays, primitives, null, or type mismatches — replace entirely.
      targetClone[key] = structuredClone(sourceVal);
      changes.push({ path, action: 'replaced' });
    }
  }
}

/**
 * Deeply merges `source` into `target`, returning a new object and a
 * description of every key-level change.
 *
 * Rules:
 * - Plain objects are recursively merged.
 * - Arrays are replaced wholesale (source wins, no appending).
 * - Keys present in target but absent from source are preserved untouched.
 * - A `null` value in source replaces — it does NOT delete — the target key.
 * - Neither `target` nor `source` is ever mutated.
 *
 * @param {Record<string, unknown>} target
 * @param {Record<string, unknown>} source
 * @returns {{ result: Record<string, unknown>, changes: Array<{path: string, action: 'added'|'replaced'|'unchanged'}> }}
 *
 * @example
 * const { result, changes } = deepMerge({ a: 1 }, { a: 2, b: 3 });
 * // result  → { a: 2, b: 3 }
 * // changes → [{ path: 'a', action: 'replaced' }, { path: 'b', action: 'added' }]
 */
export function deepMerge(target, source) {
  const result = structuredClone(target);
  const changes = [];

  walk(result, source, '', changes);

  return { result, changes };
}
