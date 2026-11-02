import test from 'node:test';
import assert from 'node:assert/strict';
import { inferCategory } from '../js/categories.js';

test('categorizes common expenses from English or Arabic descriptions', () => {
  assert.equal(inferCategory('Monthly rent to landlord'), 'housing');
  assert.equal(inferCategory('coffee and groceries'), 'food');
  assert.equal(inferCategory('Taxi to the airport'), 'transport');
  assert.equal(inferCategory('فاتورة الكهرباء'), 'utilities');
  assert.equal(inferCategory('دواء من الصيدلية'), 'health');
});

test('uses savings as the category for saving entries and Other as the fallback', () => {
  assert.equal(inferCategory('emergency fund', 'saving'), 'savings');
  assert.equal(inferCategory('misc payment'), 'other');
});
