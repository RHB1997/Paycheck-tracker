const CACHE_KEY = 'paycheck-tracker-rate-cache-v2';
const ENDPOINT = 'https://api.frankfurter.dev/v2/rate/';
const CACHE_TTL_MS = 60 * 60 * 1000;

function readCache(storage) {
  try { return JSON.parse(storage?.getItem(CACHE_KEY) ?? '{}'); }
  catch { return {}; }
}

function writeCache(storage, cache) {
  try { storage?.setItem(CACHE_KEY, JSON.stringify(cache)); }
  catch { /* A failed cache write must not invalidate a successful rate response. */ }
}

function failure(code, values = {}) {
  const error = new Error(code);
  error.code = code;
  error.values = values;
  return error;
}

export async function getUsdRateSnapshot(currencyCode, {
  fetcher = globalThis.fetch,
  storage = globalThis.localStorage,
  now = Date.now,
} = {}) {
  const code = String(currencyCode).trim().toUpperCase();
  const capturedAt = new Date(now()).toISOString();
  if (code === 'USD') return { usdRate: 1, usdRateAsOf: capturedAt, usdRateCapturedAt: capturedAt };
  if (!/^[A-Z]{3}$/.test(code)) throw failure('invalidCurrency');

  const cache = readCache(storage);
  const cached = cache[code];
  if (cached && cached.expiresAt > now() && Number.isFinite(cached.usdRate)) {
    return { usdRate: cached.usdRate, usdRateAsOf: cached.usdRateAsOf, usdRateCapturedAt: capturedAt };
  }
  if (typeof fetcher !== 'function') throw failure('rateNetworkError');

  let response;
  try { response = await fetcher(`${ENDPOINT}${encodeURIComponent(code.toLowerCase())}/usd`); }
  catch { throw failure('rateNetworkError'); }
  if (!response.ok) throw failure('rateHttpError');
  let data;
  try { data = await response.json(); }
  catch { throw failure('invalidRate', { code }); }
  const usdRate = data?.rate;
  if (!Number.isFinite(usdRate) || usdRate <= 0 || data?.base?.toUpperCase() !== code || data?.quote?.toUpperCase() !== 'USD') {
    throw failure('invalidRate', { code });
  }
  const rateDate = typeof data.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(data.date) ? new Date(`${data.date}T00:00:00.000Z`) : null;
  if (!rateDate || Number.isNaN(rateDate.valueOf())) {
    throw failure('ratePrecisionError');
  }
  const snapshot = {
    usdRate,
    usdRateAsOf: rateDate.toISOString(),
    usdRateCapturedAt: capturedAt,
  };
  cache[code] = { ...snapshot, expiresAt: now() + CACHE_TTL_MS };
  writeCache(storage, cache);
  return snapshot;
}

export function convertMinorToUsdMinor(amountMinor, fractionDigits, usdRate) {
  if (!Number.isSafeInteger(amountMinor) || !Number.isFinite(usdRate) || usdRate <= 0) {
    throw new TypeError('Amount or exchange rate is invalid.');
  }
  return Math.round((amountMinor / (10 ** fractionDigits)) * usdRate * 100);
}

export function convertRemainingToUsdMinor(paycheck, remainingMinor) {
  if (!Number.isSafeInteger(remainingMinor)) return null;
  const usdRate = paycheck.currencyCode === 'USD' ? 1 : paycheck.usdRate;
  if (Number.isFinite(usdRate) && usdRate > 0) {
    return convertMinorToUsdMinor(remainingMinor, paycheck.fractionDigits, usdRate);
  }
  if (Number.isSafeInteger(paycheck.usdMinor) && Number.isSafeInteger(paycheck.payMinor) && paycheck.payMinor !== 0) {
    return Math.round(paycheck.usdMinor * remainingMinor / paycheck.payMinor);
  }
  return null;
}

export { CACHE_KEY as RATE_CACHE_KEY, ENDPOINT as RATE_ENDPOINT };
