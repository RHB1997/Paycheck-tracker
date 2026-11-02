export function entryDescription(entry) {
  const note = String(entry?.note ?? '').trim();
  if (note) return note;
  return String(entry?.category ?? '').trim();
}
