import test from 'node:test';
import assert from 'node:assert/strict';
import { sortEntries } from '../js/entry-sort.js';

const entries = [
  { id: 1, amountMinor: 900, category: 'food', occurredAt: '2026-02-01' },
  { id: 2, amountMinor: 100, category: 'housing', occurredAt: '2026-02-03' },
  { id: 3, amountMinor: 500, category: 'transport', occurredAt: '2026-02-02' },
];
const category = (entry) => ({ food: 'Food', housing: 'Housing', transport: 'Transport' })[entry.category];

test('sorts entries by newest date, amount in either direction, and category without mutating input', () => {
  assert.deepEqual(sortEntries(entries, 'date-desc', category).map((item) => item.id), [2, 3, 1]);
  assert.deepEqual(sortEntries(entries, 'amount-desc', category).map((item) => item.id), [1, 3, 2]);
  assert.deepEqual(sortEntries(entries, 'amount-asc', category).map((item) => item.id), [2, 3, 1]);
  assert.deepEqual(sortEntries(entries, 'category', category).map((item) => item.id), [1, 2, 3]);
  assert.deepEqual(entries.map((item) => item.id), [1, 2, 3]);
});
