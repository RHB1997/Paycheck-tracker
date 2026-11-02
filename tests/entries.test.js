import test from 'node:test';
import assert from 'node:assert/strict';
import { categoryOverridePatch, entryDescription } from '../js/entries.js';

test('shows a legacy free-text category as the entry description when note is empty', () => {
  const legacyEntry = { category: 'Coffee shop', note: '' };
  assert.equal(entryDescription(legacyEntry), 'Coffee shop');
});

test('keeps a saved note as the description when both legacy fields exist', () => {
  const legacyEntry = { category: 'Restaurants', note: 'Dinner with family' };
  assert.equal(entryDescription(legacyEntry), 'Dinner with family');
});

test('uses the category as a safe fallback when a note is missing', () => {
  assert.equal(entryDescription({ category: 'Rent' }), 'Rent');
  assert.equal(entryDescription({ category: '', note: '' }), '');
});

test('preserves a legacy description before replacing its old category field', () => {
  const legacyEntry = { id: 4, category: 'اشتراك المولدة', note: '' };
  const patch = categoryOverridePatch(legacyEntry, 'utilities');
  assert.deepEqual(patch, {
    id: 4,
    note: 'اشتراك المولدة',
    category: 'utilities',
    categorySource: 'manual',
  });
  assert.equal(entryDescription({ ...legacyEntry, ...patch }), 'اشتراك المولدة');
});
