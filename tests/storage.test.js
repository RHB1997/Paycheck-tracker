import test from 'node:test';
import assert from 'node:assert/strict';
import { LocalStore, STORAGE_KEY } from '../js/storage.js';

class MemoryStorage {
  values = new Map();
  getItem(key) { return this.values.get(key) ?? null; }
  setItem(key, value) { this.values.set(key, String(value)); }
}

function setup() { return new LocalStore(new MemoryStorage()); }

test('creates and sorts paychecks, and updates without losing entries', () => {
  const store = setup();
  const older = store.savePaycheck({ label: 'June', payDate: '2026-06-01', currencyCode: 'USD', fractionDigits: 2, grossMinor: 400000, taxWithheldMinor: 50000 });
  const newer = store.savePaycheck({ label: 'July', payDate: '2026-07-01', currencyCode: 'USD', fractionDigits: 2, grossMinor: 420000, taxWithheldMinor: 50000 });
  store.saveEntry(older, { kind: 'expense', category: 'Rent', note: '', amountMinor: 100000 });
  store.savePaycheck({ id: older, label: 'June salary', payDate: '2026-06-01', currencyCode: 'USD', fractionDigits: 2, grossMinor: 400000, taxWithheldMinor: 50000 });
  assert.deepEqual(store.listPaychecks().map((item) => item.id), [newer, older]);
  assert.equal(store.getPaycheck(older).label, 'June salary');
  assert.equal(store.listEntries(older).length, 1);
});

test('updates and deletes entries and cascades paycheck deletion locally', () => {
  const store = setup();
  const paycheckId = store.savePaycheck({ label: '', payDate: '2026-01-01', currencyCode: 'USD', fractionDigits: 2, grossMinor: 100000, taxWithheldMinor: 0 });
  store.saveEntry(paycheckId, { kind: 'expense', category: 'Food', note: '', amountMinor: 2000 });
  const entry = store.listEntries(paycheckId)[0];
  store.saveEntry(paycheckId, { id: entry.id, kind: 'saving', category: 'Fund', note: 'Rainy day', amountMinor: 3000 });
  assert.equal(store.listEntries(paycheckId)[0].kind, 'saving');
  store.deleteEntry(paycheckId, entry.id);
  assert.equal(store.listEntries(paycheckId).length, 0);
  store.saveEntry(paycheckId, { kind: 'expense', category: 'Food', note: '', amountMinor: 2000 });
  store.deletePaycheck(paycheckId);
  assert.equal(store.getPaycheck(paycheckId), null);
  assert.equal(store.listEntries(paycheckId).length, 0);
});

test('recovers from unreadable saved data without crashing', () => {
  const storage = new MemoryStorage();
  storage.setItem(STORAGE_KEY, 'not json');
  assert.deepEqual(new LocalStore(storage).listPaychecks(), []);
});
