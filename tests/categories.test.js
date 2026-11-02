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

test('recognizes common merchants and phrases without matching inside unrelated words', () => {
  assert.equal(inferCategory('Uber ride'), 'transport');
  assert.equal(inferCategory('Carrefour groceries'), 'food');
  assert.equal(inferCategory('Electricity bill'), 'utilities');
  assert.equal(inferCategory('Amazon shoes'), 'shopping');
  assert.equal(inferCategory('Doctor appointment'), 'health');
  assert.equal(inferCategory('care package'), 'other');
});

test('normalizes Arabic diacritics and common alef variants', () => {
  assert.equal(inferCategory('إِيجَار الشقة'), 'housing');
  assert.equal(inferCategory('فاتورة الكِهرباء'), 'utilities');
});
