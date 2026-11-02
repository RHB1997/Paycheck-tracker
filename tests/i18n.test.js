import test from 'node:test';
import assert from 'node:assert/strict';
import { translate } from '../js/i18n.js';

test('provides Arabic labels and substitutes localized display values', () => {
  assert.equal(translate('ar', 'addPaycheck'), 'إضافة راتب');
  assert.equal(translate('ar', 'category.food'), 'الطعام والمطاعم');
  assert.equal(translate('ar', 'usdApprox', { amount: '١٫٠٠ US$', date: '٢ نوفمبر ٢٠٢٦' }), '≈ ١٫٠٠ US$ · سعر بتاريخ ٢ نوفمبر ٢٠٢٦');
});

test('falls back to English for missing translations', () => {
  assert.equal(translate('ar', 'amountTooLarge'), 'المبلغ كبير جداً.');
  assert.equal(translate('ar', 'missing-key'), 'missing-key');
});
