import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('category drag controls are connected to the elements used by the app', async () => {
  const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
  for (const id of ['category-drop-help', 'category-drop-zones', 'category-drop-status', 'category-override-label', 'category-preview-label']) {
    assert.match(html, new RegExp(`\\bid=["']${id}["']`), `Missing app element #${id}`);
  }
});

test('money inputs use grouped decimal text fields and currency is limited to USD and IQD', async () => {
  const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
  assert.match(html, /<select name="currencyCode">\s*<option value="USD"/);
  assert.match(html, /<option value="IQD"/);
  assert.doesNotMatch(html, /<input name="currencyCode"/);
  assert.match(html, /<input name="pay" type="text" inputmode="decimal"/);
  assert.match(html, /<input name="amount" type="text" inputmode="decimal"/);
  assert.match(html, /id="export-backup"/);
  assert.match(html, /id="import-backup"/);
});

test('exposes a labeled entry sort menu in the activity heading', async () => {
  const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
  assert.match(html, /<label for="activity-sort"/);
  assert.match(html, /id="activity-sort"/);
  for (const value of ['date-desc', 'amount-desc', 'amount-asc', 'category']) {
    assert.match(html, new RegExp(`option value="${value}"`));
  }
  assert.match(html, /activity-heading-actions[\s\S]*id="activity-sort"/);
});

test('keeps quick action IDs unique and includes the history and summary dashboard sections', async () => {
  const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
  for (const id of ['add-paycheck', 'add-entry', 'export-backup', 'import-backup', 'paycheck-history-chart', 'summary-section-title']) {
    assert.equal((html.match(new RegExp(`id="${id}"`, 'g')) ?? []).length, 1, `Expected exactly one #${id}`);
  }
  assert.match(html, /class="template-top"[\s\S]*class="panel history-panel"/);
  assert.match(html, /class="quick-action-buttons"[\s\S]*id="add-paycheck"[\s\S]*id="add-entry"/);
  assert.match(html, /data-i18n="summaryTotals"/);
  assert.match(html, /data-i18n="accountBreakdowns"/);
});
