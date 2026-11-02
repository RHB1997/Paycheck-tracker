import test from 'node:test';
import assert from 'node:assert/strict';
import { formatDate, formatMoney, parseAmountToMinorUnits, summarize } from '../js/money.js';

test('parses decimal input into exact integer minor units', () => {
  assert.equal(parseAmountToMinorUnits('1,234.56', 2), 123456);
  assert.equal(parseAmountToMinorUnits('12.345', 3), 12345);
  assert.equal(parseAmountToMinorUnits('72', 0), 72);
  assert.equal(parseAmountToMinorUnits('١٬٢٣٤٫٥٦', 2), 123456);
  assert.equal(parseAmountToMinorUnits('۱۲٫۳۴', 2), 1234);
});

test('rejects invalid precision and malformed amount strings', () => {
  assert.throws(() => parseAmountToMinorUnits('2.001', 2), /valid amount/);
  assert.throws(() => parseAmountToMinorUnits('-1.00', 2), /valid amount/);
  assert.throws(() => parseAmountToMinorUnits('1.2', 0), /valid amount/);
  assert.throws(() => parseAmountToMinorUnits('1', 4), /between 0 and 3/);
});

test('formats a currency at the paycheck decimal precision', () => {
  assert.match(formatMoney(123456, 'USD', 2), /1,234\.56/);
  assert.match(formatMoney(123456, 'IQD', 3), /123\.456/);
  assert.match(formatMoney(123456, 'IQD', 3, 'ar-IQ'), /١٢٣/);
  assert.match(formatDate('2026-11-02', 'ar-IQ'), /٢٠٢٦/);
});

test('summary deducts expenses and savings from the amount received and keeps overages negative', () => {
  const paycheck = { payMinor: 500000 };
  assert.deepEqual(summarize(paycheck, [
    { kind: 'expense', amountMinor: 200000 },
    { kind: 'saving', amountMinor: 50000 },
  ]), { payMinor: 500000, expensesMinor: 200000, savingsMinor: 50000, remainingMinor: 250000 });
  assert.equal(summarize({ payMinor: 10000 }, [
    { kind: 'expense', amountMinor: 12000 },
  ]).remainingMinor, -2000);
});
