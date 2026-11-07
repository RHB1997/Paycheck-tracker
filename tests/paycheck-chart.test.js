import test from 'node:test';
import assert from 'node:assert/strict';
import { paycheckHistoryPoints, renderPaycheckHistoryChart } from '../js/paycheck-chart.js';

const labels = { money: (value) => `$${value}`, date: (value) => value, emptyMessage: 'No history yet.', chartLabel: (count) => `${count} points` };

test('builds paycheck history from saved USD snapshots in date order without mutating records', () => {
  const records = [
    { id: 2, payDate: '2026-02-01', usdMinor: 20000 },
    { id: 1, payDate: '2026-01-01', usdMinor: 15000 },
    { id: 3, payDate: '2026-03-01', usdMinor: null },
  ];
  assert.deepEqual(paycheckHistoryPoints(records).map((record) => record.id), [1, 2]);
  assert.match(renderPaycheckHistoryChart(records, labels), /<svg[^>]*role="img"/);
  assert.match(renderPaycheckHistoryChart(records, labels), /2026-01-01/);
  assert.equal(records[0].payDate, '2026-02-01');
});

test('shows a helpful empty state when there is no saved USD history', () => {
  assert.equal(renderPaycheckHistoryChart([{ id: 1, payDate: '2026-01-01', usdMinor: null }], labels), '<div class="history-chart-empty">No history yet.</div>');
});
