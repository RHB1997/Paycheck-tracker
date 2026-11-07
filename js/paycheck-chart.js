export function paycheckHistoryPoints(paychecks) {
  return paychecks
    .filter((paycheck) => Number.isSafeInteger(paycheck.usdMinor) && paycheck.usdMinor >= 0)
    .slice()
    .sort((a, b) => String(a.payDate).localeCompare(String(b.payDate)) || a.id - b.id);
}

export function renderPaycheckHistoryChart(paychecks, { money, date, emptyMessage, chartLabel }) {
  const points = paycheckHistoryPoints(paychecks);
  if (!points.length) return `<div class="history-chart-empty">${emptyMessage}</div>`;

  const width = 760;
  const height = 250;
  const left = 92;
  const right = 20;
  const top = 18;
  const bottom = 34;
  const plotWidth = width - left - right;
  const plotHeight = height - top - bottom;
  const maximum = Math.max(1, ...points.map((point) => point.usdMinor));
  const ceiling = maximum * 1.12;
  const coords = points.map((point, index) => ({
    x: points.length === 1 ? left + plotWidth / 2 : left + index / (points.length - 1) * plotWidth,
    y: top + (1 - point.usdMinor / ceiling) * plotHeight,
    point,
  }));
  const line = coords.map(({ x, y }, index) => `${index ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
  const area = `${line} L${coords.at(-1).x.toFixed(1)},${(top + plotHeight).toFixed(1)} L${coords[0].x.toFixed(1)},${(top + plotHeight).toFixed(1)} Z`;
  const grid = Array.from({ length: 5 }, (_, index) => {
    const fraction = index / 4;
    const y = top + fraction * plotHeight;
    const value = Math.round(ceiling * (1 - fraction));
    return `<line class="history-grid-line" x1="${left}" y1="${y}" x2="${width - right}" y2="${y}"/><text class="history-axis-label" x="${left - 10}" y="${y + 4}" text-anchor="end">${money(value)}</text>`;
  }).join('');
  const labelIndexes = [...new Set([0, Math.floor((points.length - 1) / 2), points.length - 1])];
  const labels = labelIndexes.map((index) => {
    const { x } = coords[index];
    return `<text class="history-date-label" x="${x}" y="${height - 8}" text-anchor="middle">${date(points[index].payDate)}</text>`;
  }).join('');
  const dots = coords.map(({ x, y, point }) => `<circle class="history-point" cx="${x}" cy="${y}" r="4"><title>${date(point.payDate)} · ${money(point.usdMinor)}</title></circle>`).join('');

  return `<svg class="history-chart-svg" viewBox="0 0 ${width} ${height}" role="img" aria-label="${chartLabel(points.length)}">
    ${grid}<path class="history-area" d="${area}"/><path class="history-line" d="${line}"/>${dots}${labels}
  </svg>`;
}
