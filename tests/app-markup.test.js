import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('category drag controls are connected to the elements used by the app', async () => {
  const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
  for (const id of ['category-drop-help', 'category-drop-zones', 'category-drop-status', 'category-override-label', 'category-preview-label']) {
    assert.match(html, new RegExp(`\\bid=["']${id}["']`), `Missing app element #${id}`);
  }
});
