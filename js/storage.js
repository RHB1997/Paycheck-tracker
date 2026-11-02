const STORAGE_KEY = 'paycheck-tracker-data-v1';

export class LocalStore {
  constructor(storage = globalThis.localStorage) {
    if (!storage) throw new Error('Browser storage is not available.');
    this.storage = storage;
  }

  read() {
    try {
      const saved = JSON.parse(this.storage.getItem(STORAGE_KEY) ?? '{"paychecks":[]}');
      if (!Array.isArray(saved.paychecks)) return { version: 2, paychecks: [] };
      if (saved.version === 2) return saved;
      const migrated = {
        version: 2,
        paychecks: saved.paychecks.map((old) => {
          const paycheck = { ...old, entries: Array.isArray(old.entries) ? old.entries : [] };
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
      return { version: 2, paychecks: [] };
    }
  }

  write(data) {
    try { this.storage.setItem(STORAGE_KEY, JSON.stringify(data)); }
    catch (error) { error.code = 'storageError'; throw error; }
  }
  listPaychecks() { return [...this.read().paychecks].sort((a, b) => b.payDate.localeCompare(a.payDate) || b.id - a.id); }
  getPaycheck(id) { return this.read().paychecks.find((item) => item.id === Number(id)) ?? null; }
  listEntries(paycheckId) {
    return (this.getPaycheck(paycheckId)?.entries ?? []).slice()
      .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt) || b.id - a.id);
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
    data.version = 2;
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
