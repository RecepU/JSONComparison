const { test } = require('node:test');
const assert = require('node:assert/strict');
const { compareValues, highlightPaths, changedLines } = require('../src/app.js');

test('object key order is ignored, primitive types and array positions matter', () => {
  assert.equal(compareValues({ a: 1, b: 2 }, { b: 2, a: 1 }).filter(r => r.type !== 'same').length, 0);
  assert.equal(compareValues(1, '1')[0].type, 'changed');
  assert.deepEqual(compareValues([1], [1, 2]).map(r => r.type), ['same', 'added']);
});

test('renamed parent and nested changes highlight only their own lines', () => {
  const left = { metadata: { environment: 'production', version: '4', pagination: { current_page: 1, total_pages: 145 } } };
  const right = { metadata6: { environment: 'production2', version: '4', pagination: { current_page: 12, total_pages: 145 } } };
  const paths = highlightPaths(left, right);
  for (const [side, obj] of [['left', left], ['right', right]]) {
    assert.deepEqual([...changedLines(JSON.stringify(obj, null, 2), paths[side])].sort((a, b) => a - b), [1, 2, 5]);
  }
  assert.deepEqual(compareValues(left, right).map(r => r.type), ['removed', 'added']);
  assert.deepEqual(highlightPaths(left, { metadata6: left.metadata }).left, ['$["metadata"]']);
});
