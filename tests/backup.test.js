import test from 'node:test';
import assert from 'node:assert/strict';
import { createBackup, isBackupDue, parseBackup } from '../js/backup.js';

const sampleData = {
  version: 4,
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
