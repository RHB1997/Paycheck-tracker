import test from 'node:test';
import assert from 'node:assert/strict';
import { LocalStore, STORAGE_KEY } from '../js/storage.js';
import { categoryOverridePatch, entryDescription } from '../js/entries.js';

class MemoryStorage {
  values = new Map();
  getItem(key) { return this.values.get(key) ?? null; }
  setItem(key, value) { this.values.set(key, String(value)); }
}

function setup() { return new LocalStore(new MemoryStorage()); }

test('creates and sorts paychecks, and updates without losing entries', () => {
  const store = setup();
  const older = store.savePaycheck({ label: 'June', payDate: '2026-06-01', currencyCode: 'USD', fractionDigits: 2, payMinor: 350000, usdMinor: 350000 });
  const newer = store.savePaycheck({ label: 'July', payDate: '2026-07-01', currencyCode: 'USD', fractionDigits: 2, payMinor: 420000, usdMinor: 420000 });
  store.saveEntry(older, { kind: 'expense', category: 'Rent', note: '', amountMinor: 100000 });
  store.savePaycheck({ id: older, label: 'June salary', payDate: '2026-06-01', currencyCode: 'USD', fractionDigits: 2, payMinor: 350000, usdMinor: 350000 });
  assert.deepEqual(store.listPaychecks().map((item) => item.id), [newer, older]);
  assert.equal(store.getPaycheck(older).label, 'June salary');
  assert.equal(store.listEntries(older).length, 1);
});

test('updates and deletes entries and cascades paycheck deletion locally', () => {
  const store = setup();
  const paycheckId = store.savePaycheck({ label: '', payDate: '2026-01-01', currencyCode: 'USD', fractionDigits: 2, payMinor: 100000, usdMinor: 100000 });
  store.saveEntry(paycheckId, { kind: 'expense', category: 'food', note: 'groceries', amountMinor: 2000, currencyCode: 'USD', fractionDigits: 2, usdMinor: 2000, usdRate: 1 });
  const entry = store.listEntries(paycheckId)[0];
  store.saveEntry(paycheckId, { id: entry.id, kind: 'saving', category: 'savings', note: 'Emergency fund', amountMinor: 3000, currencyCode: 'USD', fractionDigits: 2, usdMinor: 3000, usdRate: 1 });
  assert.equal(store.listEntries(paycheckId)[0].kind, 'saving');
  store.deleteEntry(paycheckId, entry.id);
  assert.equal(store.listEntries(paycheckId).length, 0);
  store.saveEntry(paycheckId, { kind: 'expense', category: 'food', note: 'groceries', amountMinor: 2000, currencyCode: 'USD', fractionDigits: 2, usdMinor: 2000, usdRate: 1 });
  store.deletePaycheck(paycheckId);
  assert.equal(store.getPaycheck(paycheckId), null);
  assert.equal(store.listEntries(paycheckId).length, 0);
});

test('recovers from unreadable saved data without crashing', () => {
  const storage = new MemoryStorage();
  storage.setItem(STORAGE_KEY, 'not json');
  assert.deepEqual(new LocalStore(storage).listPaychecks(), []);
});

test('migrates tax-withheld records to amount received without restoring tax', () => {
  const storage = new MemoryStorage();
  storage.setItem(STORAGE_KEY, JSON.stringify({ paychecks: [{ id: 7, label: 'Old pay', payDate: '2026-02-01', currencyCode: 'USD', fractionDigits: 2, grossMinor: 500000, taxWithheldMinor: 75000, entries: [] }] }));
  const paycheck = new LocalStore(storage).getPaycheck(7);
  assert.equal(paycheck.payMinor, 425000);
  assert.equal('taxWithheldMinor' in paycheck, false);
  assert.equal('grossMinor' in paycheck, false);
  assert.equal(Number.isSafeInteger(paycheck.usdMinor), false);
});

test('keeps migrated records readable if browser storage refuses the migration write', () => {
  const storage = new MemoryStorage();
  storage.setItem(STORAGE_KEY, JSON.stringify({ paychecks: [{ id: 9, label: 'Legacy', payDate: '2026-02-01', currencyCode: 'USD', fractionDigits: 2, grossMinor: 20000, taxWithheldMinor: 1000, entries: [] }] }));
  storage.setItem = () => { throw new DOMException('Storage is full.', 'QuotaExceededError'); };
  const paycheck = new LocalStore(storage).getPaycheck(9);
  assert.equal(paycheck.payMinor, 19000);
});

test('retains recorded USD snapshots when reloading local data', () => {
  const storage = new MemoryStorage();
  const store = new LocalStore(storage);
  const paycheckId = store.savePaycheck({ label: '', payDate: '2026-01-01', currencyCode: 'IQD', fractionDigits: 3, payMinor: 1000000, usdRate: 0.00076, usdMinor: 76, usdRateAsOf: '2026-11-02T00:00:00.000Z' });
  store.saveEntry(paycheckId, { kind: 'expense', category: 'food', note: 'groceries', amountMinor: 10000, currencyCode: 'IQD', fractionDigits: 3, usdRate: 0.00076, usdMinor: 1, usdRateAsOf: '2026-11-02T00:00:00.000Z' });
  const loaded = new LocalStore(storage);
  assert.equal(loaded.getPaycheck(paycheckId).usdMinor, 76);
  assert.equal(loaded.listEntries(paycheckId)[0].usdMinor, 1);
});

test('records backup time and restores backed up data without changing its content', () => {
  const storage = new MemoryStorage();
  const store = new LocalStore(storage);
  const paycheckId = store.savePaycheck({ label: 'Salary', payDate: '2026-11-01', currencyCode: 'USD', fractionDigits: 2, payMinor: 300000, usdMinor: 300000, usdRate: 1, entries: [] });
  const backup = store.read();
  store.markBackupCreated('2026-11-07T12:00:00.000Z');
  assert.equal(store.read().lastBackupAt, '2026-11-07T12:00:00.000Z');
  store.deletePaycheck(paycheckId);
  store.replaceAll(backup);
  assert.equal(store.listPaychecks()[0].label, 'Salary');
  assert.equal(store.read().lastBackupAt, null);
});

test('persists manually reassigned entry categories through reload and later edits', () => {
  const storage = new MemoryStorage();
  const store = new LocalStore(storage);
  const paycheckId = store.savePaycheck({ label: '', payDate: '2026-01-01', currencyCode: 'USD', fractionDigits: 2, payMinor: 100000, usdMinor: 100000 });
  store.saveEntry(paycheckId, { kind: 'expense', category: 'utilities', categorySource: 'manual', note: 'generator fee', amountMinor: 2000, usdMinor: 2000, usdRate: 1 });
  const loaded = new LocalStore(storage);
  const entry = loaded.listEntries(paycheckId)[0];
  assert.equal(entry.category, 'utilities');
  assert.equal(entry.categorySource, 'manual');
  loaded.saveEntry(paycheckId, { id: entry.id, amountMinor: 2500 });
  assert.equal(loaded.listEntries(paycheckId)[0].category, 'utilities');
  assert.equal(loaded.listEntries(paycheckId)[0].categorySource, 'manual');
});

test('keeps a legacy expense description when drag reassignment changes its old category field', () => {
  const storage = new MemoryStorage();
  const paycheckId = 12;
  storage.setItem(STORAGE_KEY, JSON.stringify({ version: 2, paychecks: [{
    id: paycheckId, label: 'Test pay', payDate: '2026-01-01', currencyCode: 'USD', fractionDigits: 2, payMinor: 100000,
    entries: [{ id: 3, kind: 'expense', category: 'اشتراك المولدة', note: '', amountMinor: 2000, occurredAt: '2026-01-02' }],
  }] }));
  const store = new LocalStore(storage);
  const legacyEntry = store.listEntries(paycheckId)[0];
  store.saveEntry(paycheckId, categoryOverridePatch(legacyEntry, 'utilities'));
  const saved = store.listEntries(paycheckId)[0];
  assert.equal(saved.category, 'utilities');
  assert.equal(entryDescription(saved), 'اشتراك المولدة');
});

test('migrates old entries so legacy descriptions are separate before any category change', () => {
  const storage = new MemoryStorage();
  storage.setItem(STORAGE_KEY, JSON.stringify({ version: 2, paychecks: [{
    id: 13, label: 'Old pay', payDate: '2026-02-01', currencyCode: 'IQD', fractionDigits: 3, payMinor: 100000,
    entries: [{ id: 5, kind: 'expense', category: 'اشتراك المولدة', note: '', amountMinor: 50000, occurredAt: '2026-02-02' }],
  }] }));
  const store = new LocalStore(storage);
  const entry = store.listEntries(13)[0];
  assert.equal(entry.note, 'اشتراك المولدة');
  store.saveEntry(13, categoryOverridePatch(entry, 'utilities'));
  const saved = store.listEntries(13)[0];
  assert.equal(saved.category, 'utilities');
  assert.equal(entryDescription(saved), 'اشتراك المولدة');
  assert.equal(JSON.parse(storage.getItem(STORAGE_KEY)).version, 5);
});

test('reinterprets legacy IQD thousandths as whole dinars and refreshes USD using saved rates', () => {
  const storage = new MemoryStorage();
  storage.setItem(STORAGE_KEY, JSON.stringify({ version: 4, customCategories: [], paychecks: [{
    id: 21, label: 'Legacy IQD', payDate: '2026-10-01', currencyCode: 'IQD', fractionDigits: 3,
    payMinor: 45000, usdRate: 0.00076, usdMinor: 3, usdRateAsOf: '2026-10-01T00:00:00.000Z', entries: [
      { id: 1, kind: 'expense', category: 'food', note: 'Lunch', currencyCode: 'IQD', fractionDigits: 3, amountMinor: 12000, usdRate: 0.00076, usdMinor: 1 },
      { id: 3, kind: 'expense', category: 'other', note: 'Whole dinars', currencyCode: 'IQD', fractionDigits: 0, amountMinor: 45000, usdRate: 0.00076, usdMinor: 3420 },
      { id: 2, kind: 'expense', category: 'other', note: 'USD purchase', currencyCode: 'USD', fractionDigits: 3, amountMinor: 45000, usdMinor: 4500 },
    ],
  }] }));
  const migrated = new LocalStore(storage).getPaycheck(21);
  assert.equal(migrated.payMinor, 45000);
  assert.equal(migrated.fractionDigits, 0);
  assert.equal(migrated.usdMinor, 3420);
  assert.equal(migrated.usdRateAsOf, '2026-10-01T00:00:00.000Z');
  assert.equal(migrated.entries[0].amountMinor, 12000);
  assert.equal(migrated.entries[0].fractionDigits, 0);
  assert.equal(migrated.entries[0].usdMinor, 912);
  assert.equal(migrated.entries[1].fractionDigits, 0);
  assert.equal(migrated.entries[1].amountMinor, 45000);
  assert.equal(migrated.entries[1].usdMinor, 3420);
  assert.equal(migrated.entries[2].fractionDigits, 3);
  assert.equal(JSON.parse(storage.getItem(STORAGE_KEY)).version, 5);
});

test('stores custom categories locally and returns expenses to automatic grouping when one is removed', () => {
  const storage = new MemoryStorage();
  const store = new LocalStore(storage);
  const paycheckId = store.savePaycheck({ label: '', payDate: '2026-01-01', currencyCode: 'USD', fractionDigits: 2, payMinor: 100000, usdMinor: 100000 });
  const categoryId = store.saveCustomCategory('  Pets  ');
  assert.equal(store.listCustomCategories()[0].name, 'Pets');
  store.saveEntry(paycheckId, { kind: 'expense', category: categoryId, categorySource: 'manual', note: 'dog food', amountMinor: 1200 });
  const reloaded = new LocalStore(storage);
  assert.equal(reloaded.listEntries(paycheckId)[0].category, categoryId);
  reloaded.deleteCustomCategory(categoryId);
  const entry = reloaded.listEntries(paycheckId)[0];
  assert.equal(entry.note, 'dog food');
  assert.equal(entry.category, 'food');
  assert.equal(entry.categorySource, 'automatic');
  assert.deepEqual(reloaded.listCustomCategories(), []);
});

test('rejects empty, too long, duplicate, and built-in custom category names', () => {
  const store = setup();
  store.saveCustomCategory('Pets');
  for (const name of ['', 'x'.repeat(33)]) assert.throws(() => store.saveCustomCategory(name), { code: 'invalidCategoryName' });
  for (const name of ['pets', 'Food']) assert.throws(() => store.saveCustomCategory(name), { code: 'duplicateCategory' });
});
