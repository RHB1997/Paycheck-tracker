import test from 'node:test';
import assert from 'node:assert/strict';
import { convertMinorToUsdMinor, getUsdRateSnapshot, RATE_CACHE_KEY } from '../js/exchange-rates.js';

class MemoryStorage {
  values = new Map();
  getItem(key) { return this.values.get(key) ?? null; }
  setItem(key, value) { this.values.set(key, String(value)); }
}

test('saves the latest published rate with its source update time', async () => {
  const storage = new MemoryStorage();
  const now = Date.UTC(2026, 10, 2, 12);
  let calls = 0;
  const fetcher = async (url) => {
    calls += 1;
    assert.equal(url, 'https://api.frankfurter.dev/v2/rate/iqd/usd');
    return { ok: true, json: async () => ({ base: 'IQD', quote: 'USD', date: '2026-11-02', rate: 0.00076 }) };
  };
  const first = await getUsdRateSnapshot('iqd', { storage, now: () => now, fetcher });
  const second = await getUsdRateSnapshot('IQD', { storage, now: () => now + 1000, fetcher });
  assert.equal(first.usdRate, 0.00076);
  assert.equal(first.usdRateAsOf, new Date('2026-11-02T00:00:00.000Z').toISOString());
  assert.equal(first.usdRateCapturedAt, new Date(now).toISOString());
  assert.notEqual(second.usdRateCapturedAt, first.usdRateCapturedAt);
  assert.equal(second.usdRateAsOf, first.usdRateAsOf);
  assert.equal(calls, 1);
  assert.equal(convertMinorToUsdMinor(1000000, 3, first.usdRate), 76);
  assert.ok(storage.getItem(RATE_CACHE_KEY));
});

test('refreshes a new submission after the cached provider rate expires', async () => {
  const storage = new MemoryStorage();
  let now = Date.UTC(2026, 10, 2, 12);
  let calls = 0;
  const fetcher = async () => ({ ok: true, json: async () => {
    calls += 1;
    return { base: 'IQD', quote: 'USD', date: calls === 1 ? '2026-11-02' : '2026-11-03', rate: calls === 1 ? 0.00076 : 0.00075 };
  } });
  const oldRecord = await getUsdRateSnapshot('IQD', { storage, now: () => now, fetcher });
  now += 60 * 60 * 1000 + 1000;
  const newRecord = await getUsdRateSnapshot('IQD', { storage, now: () => now, fetcher });
  assert.equal(oldRecord.usdRate, 0.00076);
  assert.equal(newRecord.usdRate, 0.00075);
  assert.equal(calls, 2);
});

test('uses one to one USD conversion without a network request', async () => {
  const snapshot = await getUsdRateSnapshot('USD', { now: () => Date.UTC(2026, 0, 1), fetcher: () => { throw new Error('Should not fetch'); } });
  assert.equal(snapshot.usdRate, 1);
  assert.equal(convertMinorToUsdMinor(1234, 2, snapshot.usdRate), 1234);
});
