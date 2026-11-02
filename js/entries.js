export function entryDescription(entry) {
  const note = String(entry?.note ?? '').trim();
  if (note) return note;
  return String(entry?.category ?? '').trim();
}

export function categoryOverridePatch(entry, category) {
  return {
    id: entry.id,
    note: entryDescription(entry),
    category,
    categorySource: 'manual',
  };
}
