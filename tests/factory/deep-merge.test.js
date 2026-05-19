import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { deepMerge } from '../../scripts/lib/deep-merge.js';

describe('deepMerge', () => {
  describe('result correctness', () => {
    it('merges two flat objects: existing keys preserved, new keys added', () => {
      const target = { a: 1, b: 2 };
      const source = { b: 99, c: 3 };
      const { result } = deepMerge(target, source);
      assert.deepEqual(result, { a: 1, b: 99, c: 3 });
    });

    it('merges nested objects recursively', () => {
      const target = { a: { b: 1 } };
      const source = { a: { c: 2 } };
      const { result } = deepMerge(target, source);
      assert.deepEqual(result, { a: { b: 1, c: 2 } });
    });

    it('replaces arrays entirely — source array overwrites target array', () => {
      const target = { arr: [1, 2] };
      const source = { arr: [3] };
      const { result } = deepMerge(target, source);
      assert.deepEqual(result, { arr: [3] });
    });

    it('does not remove existing target keys absent from source', () => {
      const target = { a: 1, b: 2 };
      const source = { a: 3 };
      const { result } = deepMerge(target, source);
      assert.deepEqual(result, { a: 3, b: 2 });
    });

    it('treats null in source as an explicit null assignment — does not remove the key', () => {
      const target = { a: 1 };
      const source = { a: null };
      const { result } = deepMerge(target, source);
      assert.equal(Object.hasOwn(result, 'a'), true);
      assert.equal(result.a, null);
    });

    it('returns target unchanged when source is empty', () => {
      const target = { x: 42, y: 'hello' };
      const { result } = deepMerge(target, {});
      assert.deepEqual(result, { x: 42, y: 'hello' });
    });

    it('returns source values when target is empty', () => {
      const source = { x: 42, y: 'hello' };
      const { result } = deepMerge({}, source);
      assert.deepEqual(result, { x: 42, y: 'hello' });
    });

    it('merges three levels of nesting correctly', () => {
      const target = { a: { b: { c: 1, d: 2 } } };
      const source = { a: { b: { c: 99 }, e: 3 } };
      const { result } = deepMerge(target, source);
      assert.deepEqual(result, { a: { b: { c: 99, d: 2 }, e: 3 } });
    });
  });

  describe('changes array', () => {
    it('reports "added" for keys present in source but not in target', () => {
      const { changes } = deepMerge({ a: 1 }, { b: 2 });
      const added = changes.filter(c => c.action === 'added');
      assert.equal(added.length, 1);
      assert.equal(added[0].path, 'b');
    });

    it('reports "replaced" for keys whose value was overwritten by source', () => {
      const { changes } = deepMerge({ a: 1 }, { a: 99 });
      const replaced = changes.filter(c => c.action === 'replaced');
      assert.equal(replaced.length, 1);
      assert.equal(replaced[0].path, 'a');
    });

    it('reports "unchanged" for keys whose value is identical in both target and source', () => {
      const { changes } = deepMerge({ a: 1, b: 2 }, { a: 1 });
      const unchanged = changes.filter(c => c.action === 'unchanged');
      assert.equal(unchanged.length, 1);
      assert.equal(unchanged[0].path, 'a');
    });
  });

  describe('immutability', () => {
    it('does not mutate the target object', () => {
      const target = { a: 1, nested: { b: 2 } };
      const targetSnapshot = JSON.parse(JSON.stringify(target));
      deepMerge(target, { a: 99, nested: { c: 3 } });
      assert.deepEqual(target, targetSnapshot);
    });
  });
});
