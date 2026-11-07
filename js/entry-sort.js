export function sortEntries(entries, sortBy, categoryLabel) {
  const sorted = [...entries];
  const dateDescending = (a, b) => String(b.occurredAt ?? '').localeCompare(String(a.occurredAt ?? '')) || b.id - a.id;
  if (sortBy === 'amount-asc') {
    return sorted.sort((a, b) => a.amountMinor - b.amountMinor || dateDescending(a, b));
  }
  if (sortBy === 'amount-desc') {
    return sorted.sort((a, b) => b.amountMinor - a.amountMinor || dateDescending(a, b));
  }
  if (sortBy === 'category') {
    return sorted.sort((a, b) => categoryLabel(a).localeCompare(categoryLabel(b)) || dateDescending(a, b));
  }
  return sorted.sort(dateDescending);
}
