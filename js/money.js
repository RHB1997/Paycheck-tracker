export function parseAmountToMinorUnits(value, fractionDigits = 2) {
  const entered = String(value).trim();
  if (!Number.isInteger(fractionDigits) || fractionDigits < 0 || fractionDigits > 3) {
    throw new RangeError('Decimal places must be between 0 and 3.');
  }
  const pattern = /^(?:\d+|\d{1,3}(?:,\d{3})+)(?:\.(\d+))?$/;
  const match = entered.match(pattern);
  if (!match || (match[1] && (match[1].length > fractionDigits || (fractionDigits === 0 && /[1-9]/.test(match[1]))))) {
    throw new TypeError('Enter a valid amount.');
  }
  const text = entered.replace(/,/g, '');
  const [whole, fraction = ''] = text.split('.');
  const scale = 10 ** fractionDigits;
  const minor = Number(whole) * scale + Number((fraction + '0'.repeat(fractionDigits)).slice(0, fractionDigits) || 0);
  if (!Number.isSafeInteger(minor)) throw new RangeError('Amount is too large.');
  return minor;
}

export function formatMoney(minor, currencyCode = 'USD', fractionDigits = 2) {
  return new Intl.NumberFormat(undefined, {
    style: 'currency', currency: currencyCode,
    minimumFractionDigits: fractionDigits, maximumFractionDigits: fractionDigits,
  }).format(minor / (10 ** fractionDigits));
}

export function formatDate(date) {
  return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
    .format(new Date(`${date}T12:00:00`));
}

export function summarize(paycheck, entries = []) {
  const expensesMinor = entries.filter((item) => item.kind === 'expense').reduce((sum, item) => sum + item.amountMinor, 0);
  const savingsMinor = entries.filter((item) => item.kind === 'saving').reduce((sum, item) => sum + item.amountMinor, 0);
  const netMinor = paycheck.grossMinor - paycheck.taxWithheldMinor;
  return { grossMinor: paycheck.grossMinor, taxWithheldMinor: paycheck.taxWithheldMinor, netMinor,
    expensesMinor, savingsMinor, remainingMinor: netMinor - expensesMinor - savingsMinor };
}
