import test from 'node:test';
import assert from 'node:assert/strict';
import { inferCategory, resolveEntryCategory } from '../js/categories.js';

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
  assert.equal(inferCategory('مولدة'), 'utilities');
  assert.equal(inferCategory('اشتراك المولدة'), 'utilities');
});

test('uses context to resolve ambiguous merchant names and descriptions', () => {
  assert.equal(inferCategory('Uber Eats dinner'), 'food');
  assert.equal(inferCategory('Uber ride to work'), 'transport');
  assert.equal(inferCategory('Amazon groceries'), 'food');
  assert.equal(inferCategory('Amazon phone case'), 'shopping');
  assert.equal(inferCategory('monthly generator subscription'), 'utilities');
  assert.equal(inferCategory('Netflix monthly subscription'), 'subscriptions');
  assert.equal(inferCategory('صيدلية ودواء'), 'health');
  assert.equal(inferCategory('دفعت فاتورة الكهرباء'), 'utilities');
});

test('does not classify an empty description', () => {
  assert.equal(inferCategory('   '), 'other');
});

test('supports a saved category override and returns to automatic classification', () => {
  assert.deepEqual(resolveEntryCategory('مولدة', 'expense'), { category: 'utilities', categorySource: 'automatic' });
  assert.deepEqual(resolveEntryCategory('مولدة', 'expense', 'housing'), { category: 'housing', categorySource: 'manual' });
  assert.deepEqual(resolveEntryCategory('مولدة', 'expense', 'auto'), { category: 'utilities', categorySource: 'automatic' });
  assert.deepEqual(resolveEntryCategory('rent', 'saving', 'food'), { category: 'savings', categorySource: 'automatic' });
});
