import { migrateStoredData, STORAGE_VERSION } from './storage.js';

export const BACKUP_FORMAT = 'paycheck-tracker-backup';
export const BACKUP_VERSION = 1;

export function isBackupDue(lastBackupAt, now = Date.now()) {
  const timestamp = Date.parse(lastBackupAt ?? '');
  return !Number.isFinite(timestamp) || now - timestamp >= 30 * 24 * 60 * 60 * 1000;
}

export function createBackup(data, createdAt = new Date().toISOString()) {
  return { format: BACKUP_FORMAT, backupVersion: BACKUP_VERSION, createdAt, data: JSON.parse(JSON.stringify(data)) };
}

export function parseBackup(text) {
  let backup;
  try { backup = JSON.parse(String(text)); }
  catch {
    const error = new TypeError('This file is not valid JSON.');
    error.code = 'invalidBackup';
    throw error;
  }
  const data = backup?.data;
  const validHeader = backup?.format === BACKUP_FORMAT && backup?.backupVersion === BACKUP_VERSION && typeof backup?.createdAt === 'string';
  const validData = [4, STORAGE_VERSION].includes(data?.version) && Array.isArray(data?.paychecks) && Array.isArray(data?.customCategories);
  const validPaychecks = validData && data.paychecks.every((paycheck) =>
    Number.isSafeInteger(paycheck?.id) && typeof paycheck.payDate === 'string' &&
    typeof paycheck.currencyCode === 'string' && Number.isInteger(paycheck.fractionDigits) &&
    paycheck.fractionDigits >= 0 && paycheck.fractionDigits <= 3 && Number.isSafeInteger(paycheck.payMinor) &&
    Array.isArray(paycheck.entries) && paycheck.entries.every((entry) =>
      Number.isSafeInteger(entry?.id) && ['expense', 'saving'].includes(entry.kind) && Number.isSafeInteger(entry.amountMinor)));
  const validCategories = validData && data.customCategories.every((category) =>
    typeof category?.id === 'string' && typeof category?.name === 'string' && category.name.trim().length > 0 && category.name.length <= 32);
  if (!validHeader || !validData || !validPaychecks || !validCategories) {
    const error = new TypeError('This file is not a supported Paycheck Tracker backup.');
    error.code = 'invalidBackup';
    throw error;
  }
  const restored = data.version === STORAGE_VERSION ? data : migrateStoredData(data);
  return { ...restored, lastBackupAt: restored.lastBackupAt ?? backup.createdAt };
}
