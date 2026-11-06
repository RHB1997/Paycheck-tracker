export function parseAmountToMinorUnits(value, fractionDigits = 2) {
  const entered = String(value).trim()
    .replace(/[٠-٩]/g, (digit) => String(digit.charCodeAt(0) - 0x0660))
    .replace(/[۰-۹]/g, (digit) => String(digit.charCodeAt(0) - 0x06f0))
    .replace(/٫/g, '.')
    .replace(/٬/g, ',');
  if (!Number.isInteger(fractionDigits) || fractionDigits < 0 || fractionDigits > 3) {
    const error = new RangeError('Decimal places must be between 0 and 3.');
    error.code = 'invalidAmount';
    throw error;
  }
  const pattern = /^(?:\d+|\d{1,3}(?:,\d{3})+)(?:\.(\d+))?$/;
  const match = entered.match(pattern);
  if (!match || (match[1] && (match[1].length > fractionDigits || (fractionDigits === 0 && /[1-9]/.test(match[1]))))) {
    const error = new TypeError('Enter a valid amount.');
    error.code = 'invalidAmount';
    throw error;
  }
  const text = entered.replace(/,/g, '');
  const [whole, fraction = ''] = text.split('.');
  const scale = 10 ** fractionDigits;
  const minor = Number(whole) * scale + Number((fraction + '0'.repeat(fractionDigits)).slice(0, fractionDigits) || 0);
  if (!Number.isSafeInteger(minor)) {
    const error = new RangeError('Amount is too large.');
    error.code = 'amountTooLarge';
    throw error;
  }
  return minor;
}

export function formatMoneyInput(value, fractionDigits = 2) {
  if (!Number.isInteger(fractionDigits) || fractionDigits < 0 || fractionDigits > 3) return String(value ?? '');
  const normalized = String(value ?? '')
    .replace(/[٠-٩]/g, (digit) => String(digit.charCodeAt(0) - 0x0660))
    .replace(/[۰-۹]/g, (digit) => String(digit.charCodeAt(0) - 0x06f0))
    .replace(/[٫.]/g, '.')
    .replace(/,/g, '');
  const filtered = normalized.replace(/[^0-9.]/g, '');
  const point = filtered.indexOf('.');
  const hasDecimal = fractionDigits > 0 && point >= 0;
  let whole = (point >= 0 ? filtered.slice(0, point) : filtered).replace(/\D/g, '');
  let fraction = hasDecimal ? filtered.slice(point + 1).replace(/\D/g, '').slice(0, fractionDigits) : '';
  whole = whole.replace(/^0+(?=\d)/, '');
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  if (!grouped && !hasDecimal) return '';
  return `${grouped || '0'}${hasDecimal ? `.${fraction}` : ''}`;
}

export function defaultFractionDigitsForCurrency(currencyCode) {
  return String(currencyCode).toUpperCase() === 'IQD' ? 0 : 2;
}

export function formatMoney(minor, currencyCode = 'USD', fractionDigits = 2, locale = 'en-US') {
  return new Intl.NumberFormat(locale, {
    style: 'currency', currency: currencyCode,
    minimumFractionDigits: fractionDigits, maximumFractionDigits: fractionDigits,
  }).format(minor / (10 ** fractionDigits));
}

export function formatDate(date, locale = 'en-US') {
  const value = String(date);
  const parsed = value.length === 10 ? new Date(`${value}T12:00:00Z`) : new Date(value);
  return new Intl.DateTimeFormat(locale, { month: 'short', day: 'numeric', year: 'numeric' }).format(parsed);
}

export function summarize(paycheck, entries = []) {
  const expensesMinor = entries.filter((item) => item.kind === 'expense').reduce((sum, item) => sum + item.amountMinor, 0);
  const savingsMinor = entries.filter((item) => item.kind === 'saving').reduce((sum, item) => sum + item.amountMinor, 0);
  return { payMinor: paycheck.payMinor, expensesMinor, savingsMinor,
    remainingMinor: paycheck.payMinor - expensesMinor - savingsMinor };
}
