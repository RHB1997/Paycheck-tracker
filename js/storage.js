const STORAGE_KEY = 'paycheck-tracker-data-v1';
const STORAGE_VERSION = 4;
const BUILTIN_CATEGORY_KEYS = ['housing', 'food', 'transport', 'utilities', 'health', 'shopping', 'subscriptions', 'education', 'travel', 'savings', 'other'];

import { inferCategory } from './categories.js';

export class LocalStore {
  constructor(storage = globalThis.localStorage) {
    if (!storage) throw new Error('Browser storage is not available.');
    this.storage = storage;
  }

  read() {
    try {
      const saved = JSON.parse(this.storage.getItem(STORAGE_KEY) ?? '{"paychecks":[]}');
      if (!Array.isArray(saved.paychecks)) return { version: STORAGE_VERSION, paychecks: [], customCategories: [] };
      if (saved.version === STORAGE_VERSION) {
        return { ...saved, customCategories: Array.isArray(saved.customCategories) ? saved.customCategories : [] };
      }
      const migrated = {
        version: STORAGE_VERSION,
        customCategories: Array.isArray(saved.customCategories) ? saved.customCategories : [],
        lastBackupAt: saved.lastBackupAt ?? null,
        paychecks: saved.paychecks.map((old) => {
          const entries = Array.isArray(old.entries) ? old.entries.map((entry) => {
            const savedEntry = { ...entry };
            // Before category overrides existed, descriptions were sometimes stored only in `category`.
            if (!String(savedEntry.note ?? '').trim() && String(savedEntry.category ?? '').trim()) {
              savedEntry.note = String(savedEntry.category).trim();
            }
            return savedEntry;
          }) : [];
          const paycheck = { ...old, entries };
          if (Number.isInteger(paycheck.grossMinor)) {
            paycheck.payMinor = Math.max(0, paycheck.grossMinor - (paycheck.taxWithheldMinor ?? 0));
          }
          delete paycheck.grossMinor;
          delete paycheck.taxWithheldMinor;
          return paycheck;
        }),
      };
      try { this.write(migrated); }
      catch { /* Keep showing migrated records if the browser refuses the rewrite. */ }
      return migrated;
    } catch {
      return { version: STORAGE_VERSION, paychecks: [], customCategories: [] };
    }
  }

  write(data) {
    try { this.storage.setItem(STORAGE_KEY, JSON.stringify(data)); }
    catch (error) { error.code = 'storageError'; throw error; }
  }
  markBackupCreated(at) {
    const data = this.read();
    data.lastBackupAt = at;
    data.version = STORAGE_VERSION;
    this.write(data);
  }
  replaceAll(data) {
    this.write({ version: STORAGE_VERSION, paychecks: data.paychecks, customCategories: data.customCategories, lastBackupAt: data.lastBackupAt ?? null });
  }
  listPaychecks() { return [...this.read().paychecks].sort((a, b) => b.payDate.localeCompare(a.payDate) || b.id - a.id); }
  getPaycheck(id) { return this.read().paychecks.find((item) => item.id === Number(id)) ?? null; }
  listEntries(paycheckId) {
    return (this.getPaycheck(paycheckId)?.entries ?? []).slice()
      .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt) || b.id - a.id);
  }

  listCustomCategories() {
    return [...this.read().customCategories].sort((a, b) => a.name.localeCompare(b.name));
  }

  saveCustomCategory(name) {
    const normalizedName = String(name ?? '').normalize('NFKC').trim();
    if (!normalizedName || normalizedName.length > 32) {
      const error = new TypeError('Enter a category name of 1 to 32 characters.');
      error.code = 'invalidCategoryName';
      throw error;
    }
    const data = this.read();
    const normalizedKey = normalizedName.toLocaleLowerCase();
    if (BUILTIN_CATEGORY_KEYS.includes(normalizedKey) || data.customCategories.some((item) => item.name.normalize('NFKC').trim().toLocaleLowerCase() === normalizedKey)) {
      const error = new TypeError('That category already exists.');
      error.code = 'duplicateCategory';
      throw error;
    }
    const usedIds = [
      ...data.customCategories.map((item) => item.id),
      ...data.paychecks.flatMap((paycheck) => paycheck.entries.map((entry) => entry.category)),
    ];
    const nextId = Math.max(0, ...usedIds.map((id) => Number(String(id).match(/^custom:(\d+)$/)?.[1] ?? 0))) + 1;
    const id = `custom:${nextId}`;
    data.customCategories.push({ id, name: normalizedName });
    data.version = STORAGE_VERSION;
    this.write(data);
    return id;
  }

  deleteCustomCategory(id) {
    const data = this.read();
    if (!data.customCategories.some((item) => item.id === id)) return;
    data.customCategories = data.customCategories.filter((item) => item.id !== id);
    for (const paycheck of data.paychecks) {
      for (const entry of paycheck.entries) {
        if (entry.category === id) {
          entry.category = inferCategory(entry.note, entry.kind);
          entry.categorySource = 'automatic';
        }
      }
    }
    data.version = STORAGE_VERSION;
    this.write(data);
  }

  savePaycheck(values) {
    const data = this.read();
    const now = new Date().toISOString();
    if (values.id) {
      const index = data.paychecks.findIndex((item) => item.id === Number(values.id));
      if (index < 0) throw new Error('Paycheck not found.');
      data.paychecks[index] = { ...data.paychecks[index], ...values, id: Number(values.id), updatedAt: now };
    } else {
      data.paychecks.push({ ...values, id: Math.max(0, ...data.paychecks.map((item) => item.id)) + 1,
        entries: [], createdAt: now, updatedAt: now });
    }
    data.version = STORAGE_VERSION;
    this.write(data);
    return values.id ? Number(values.id) : data.paychecks.at(-1).id;
  }

  deletePaycheck(id) {
    const data = this.read();
    data.paychecks = data.paychecks.filter((item) => item.id !== Number(id));
    this.write(data);
  }

  saveEntry(paycheckId, values) {
    const data = this.read();
    const paycheck = data.paychecks.find((item) => item.id === Number(paycheckId));
    if (!paycheck) throw new Error('Paycheck not found.');
    data.version = STORAGE_VERSION;
    const now = new Date().toISOString();
    if (values.id) {
      const index = paycheck.entries.findIndex((item) => item.id === Number(values.id));
      if (index < 0) throw new Error('Entry not found.');
      paycheck.entries[index] = { ...paycheck.entries[index], ...values, id: Number(values.id), updatedAt: now };
    } else {
      paycheck.entries.push({ ...values, id: Math.max(0, ...paycheck.entries.map((item) => item.id)) + 1,
        occurredAt: values.occurredAt ?? new Date().toISOString().slice(0, 10), createdAt: now, updatedAt: now });
    }
    this.write(data);
  }

  deleteEntry(paycheckId, entryId) {
    const data = this.read();
    const paycheck = data.paychecks.find((item) => item.id === Number(paycheckId));
    if (paycheck) paycheck.entries = paycheck.entries.filter((item) => item.id !== Number(entryId));
    this.write(data);
  }
}

export { STORAGE_KEY };
