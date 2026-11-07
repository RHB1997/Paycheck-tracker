import test from 'node:test';
import assert from 'node:assert/strict';
import { createBackup, isBackupDue, parseBackup } from '../js/backup.js';
import { STORAGE_VERSION } from '../js/storage.js';

const sampleData = {
  version: STORAGE_VERSION,
  lastBackupAt: null,
  customCategories: [{ id: 'custom:1', name: 'Pets' }],
  paychecks: [{ id: 1, payDate: '2026-11-01', currencyCode: 'USD', fractionDigits: 2, payMinor: 250000, entries: [
    { id: 1, kind: 'expense', amountMinor: 2500, note: 'Pet food', category: 'custom:1' },
  ] }],
};

test('exports a versioned backup and restores its complete local data', () => {
  const backupText = JSON.stringify(createBackup(sampleData, '2026-11-07T12:00:00.000Z'));
  const restored = parseBackup(backupText);
  assert.equal(restored.paychecks[0].entries[0].note, 'Pet food');
  assert.equal(restored.customCategories[0].name, 'Pets');
  assert.equal(restored.lastBackupAt, '2026-11-07T12:00:00.000Z');
});

test('rejects malformed, unrelated, and incomplete backup files', () => {
  assert.throws(() => parseBackup('not json'), { code: 'invalidBackup' });
  assert.throws(() => parseBackup(JSON.stringify({ format: 'other' })), { code: 'invalidBackup' });
  assert.throws(() => parseBackup(JSON.stringify(createBackup({ ...sampleData, paychecks: [{ ...sampleData.paychecks[0], entries: [{ kind: 'expense' }] }] }))), { code: 'invalidBackup' });
});

test('asks for a backup initially and again after 30 days', () => {
  const now = Date.parse('2026-11-07T12:00:00.000Z');
  assert.equal(isBackupDue(null, now), true);
  assert.equal(isBackupDue('2026-10-09T12:00:00.000Z', now), false);
  assert.equal(isBackupDue('2026-10-08T12:00:00.000Z', now), true);
});

test('migrates version 4 backup files during restore', () => {
  const legacy = { ...sampleData, version: 4, paychecks: [{ id: 7, payDate: '2026-10-01', currencyCode: 'IQD', fractionDigits: 3,
    payMinor: 45000, usdRate: 0.00076, usdMinor: 3, entries: [{ id: 1, kind: 'expense', amountMinor: 12000, fractionDigits: 3, usdRate: 0.00076, usdMinor: 1 }] }] };
  const restored = parseBackup(JSON.stringify(createBackup(legacy, '2026-11-01T00:00:00.000Z')));
  assert.equal(restored.version, STORAGE_VERSION);
  assert.equal(restored.paychecks[0].fractionDigits, 0);
  assert.equal(restored.paychecks[0].payMinor, 45000);
  assert.equal(restored.paychecks[0].usdMinor, 3420);
  assert.equal(restored.paychecks[0].entries[0].fractionDigits, 0);
  assert.equal(restored.paychecks[0].entries[0].usdMinor, 912);
});
