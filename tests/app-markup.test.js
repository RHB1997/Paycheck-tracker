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
