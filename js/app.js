import { formatDate, formatMoney, parseAmountToMinorUnits, summarize } from './money.js';
import { LocalStore } from './storage.js';

const store = new LocalStore();
const $ = (selector) => document.querySelector(selector);
const paycheckDialog = $('#paycheck-dialog');
const entryDialog = $('#entry-dialog');
const confirmDialog = $('#confirm-dialog');
let selectedId = null;
let editingPaycheckId = null;
let editingEntryId = null;
let pendingDelete = null;

$('#today-label').textContent = new Intl.DateTimeFormat(undefined, { month: 'long', year: 'numeric' }).format(new Date()).toUpperCase();

function h(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
}

function cash(amount, paycheck) { return formatMoney(amount, paycheck.currencyCode, paycheck.fractionDigits); }

function render() {
  const paychecks = store.listPaychecks();
  if (!paychecks.some((item) => item.id === selectedId)) selectedId = paychecks[0]?.id ?? null;
  $('#paycheck-list').innerHTML = paychecks.length ? paychecks.map((item) => {
    const totals = summarize(item, item.entries);
    return `<div class="paycheck-row ${item.id === selectedId ? 'selected' : ''}" data-select-paycheck="${item.id}" tabindex="0" role="button" aria-label="View ${h(item.label || 'Paycheck')}, ${cash(totals.netMinor, item)}">
      <span class="paycheck-symbol" aria-hidden="true">▤</span><div class="paycheck-info"><div class="paycheck-name">${h(item.label || 'Paycheck')}</div><div class="paycheck-date">${formatDate(item.payDate)}</div></div>
      <div class="paycheck-amount">${cash(totals.netMinor, item)}<div class="paycheck-net-label">take-home</div></div>
      <div class="row-actions"><button class="icon-button" data-menu="paycheck" data-id="${item.id}" aria-label="Options for ${h(item.label || 'Paycheck')}" aria-haspopup="true">···</button></div></div>`;
  }).join('') : `<div class="empty-state"><div class="empty-symbol" aria-hidden="true">＋</div><strong>Start with a paycheck</strong><br>Add your gross pay and tax withheld to get started.</div>`;

  const paycheck = store.getPaycheck(selectedId);
  const entries = paycheck ? store.listEntries(paycheck.id) : [];
  const totals = paycheck ? summarize(paycheck, entries) : null;
  $('#add-entry').disabled = !paycheck;
  $('#activity-title').textContent = paycheck ? (paycheck.label || 'Paycheck activity') : 'Recent activity';
  if (!paycheck) {
    ['net-total', 'tax-total', 'expenses-total', 'savings-total'].forEach((id) => { $(`#${id}`).textContent = '—'; });
    $('#net-note').textContent = 'Select a paycheck to see your summary';
    ['tax-note', 'expenses-note', 'savings-note'].forEach((id) => { $(`#${id}`).textContent = 'From your selected paycheck'; });
    $('#net-track-fill').style.width = '0%';
    $('#activity-list').innerHTML = '<div class="empty-state"><div class="empty-symbol" aria-hidden="true">⌁</div><strong>Your activity will show up here</strong><br>Add a paycheck, then record expenses and savings.</div>';
    return;
  }
  $('#net-total').textContent = cash(totals.netMinor, paycheck);
  $('#tax-total').textContent = cash(totals.taxWithheldMinor, paycheck);
  $('#expenses-total').textContent = cash(totals.expensesMinor, paycheck);
  $('#savings-total').textContent = cash(totals.savingsMinor, paycheck);
  $('#net-note').textContent = `${cash(totals.grossMinor, paycheck)} gross pay`;
  $('#tax-note').textContent = `${totals.grossMinor ? Math.round(totals.taxWithheldMinor / totals.grossMinor * 100) : 0}% of gross pay`;
  $('#expenses-note').textContent = `${entries.filter((item) => item.kind === 'expense').length} ${entries.filter((item) => item.kind === 'expense').length === 1 ? 'entry' : 'entries'}`;
  $('#savings-note').textContent = `Remaining ${cash(totals.remainingMinor, paycheck)}`;
  $('#net-track-fill').style.width = `${totals.grossMinor ? Math.min(100, totals.netMinor / totals.grossMinor * 100) : 0}%`;
  $('#activity-list').innerHTML = entries.length ? entries.map((item) => {
    const saving = item.kind === 'saving';
    return `<div class="activity-row"><span class="activity-symbol ${saving ? 'saving' : 'expense'}" aria-hidden="true">${saving ? '⌖' : '↘'}</span>
      <div class="activity-info"><div class="activity-name">${h(item.note || item.category)}</div><div class="activity-meta">${h(item.category)} · ${formatDate(item.occurredAt)}</div></div>
      <div class="activity-amount ${saving ? 'saving' : 'expense'}">${saving ? '+' : '−'}${cash(item.amountMinor, paycheck)}</div>
      <div class="row-actions"><button class="icon-button" data-menu="entry" data-id="${item.id}" aria-label="Options for ${h(item.category)}" aria-haspopup="true">···</button></div></div>`;
  }).join('') : '<div class="empty-state"><div class="empty-symbol" aria-hidden="true">⌁</div><strong>No activity just yet</strong><br>Add your expenses and savings as you go.</div>';
}

function openPaycheck(item = null) {
  editingPaycheckId = item?.id ?? null;
  const form = $('#paycheck-form');
  form.reset();
  form.elements.label.value = item?.label ?? '';
  form.elements.payDate.value = item?.payDate ?? new Date().toISOString().slice(0, 10);
  form.elements.currencyCode.value = item?.currencyCode ?? 'USD';
  form.elements.fractionDigits.value = item?.fractionDigits ?? '2';
  form.elements.gross.value = item ? (item.grossMinor / 10 ** item.fractionDigits).toFixed(item.fractionDigits) : '';
  form.elements.tax.value = item ? (item.taxWithheldMinor / 10 ** item.fractionDigits).toFixed(item.fractionDigits) : '0';
  $('#paycheck-dialog-title').textContent = item ? 'Edit paycheck' : 'Add a paycheck';
  $('#paycheck-error').textContent = '';
  paycheckDialog.showModal();
}

function openEntry(item = null) {
  const paycheck = store.getPaycheck(selectedId);
  if (!paycheck) return;
  editingEntryId = item?.id ?? null;
  const form = $('#entry-form');
  form.reset();
  form.elements.kind.value = item?.kind ?? 'expense';
  form.elements.category.value = item?.category ?? '';
  form.elements.note.value = item?.note ?? '';
  form.elements.amount.value = item ? (item.amountMinor / 10 ** paycheck.fractionDigits).toFixed(paycheck.fractionDigits) : '';
  $('#entry-currency-label').textContent = `(${paycheck.currencyCode})`;
  $('#entry-dialog-title').textContent = item ? 'Edit entry' : 'Add an entry';
  $('#entry-error').textContent = '';
  entryDialog.showModal();
}

function menuFor(button) {
  document.querySelectorAll('.row-menu').forEach((menu) => menu.remove());
  const menu = document.createElement('div');
  menu.className = 'row-menu';
  menu.innerHTML = '<button type="button" data-action="edit">Edit</button><button type="button" class="delete-action" data-action="delete">Delete</button>';
  button.parentElement.append(menu);
  menu.addEventListener('click', (event) => {
    const action = event.target.closest('[data-action]')?.dataset.action;
    if (!action) return;
    const id = Number(button.dataset.id);
    const kind = button.dataset.menu;
    menu.remove();
    if (action === 'edit') kind === 'paycheck' ? openPaycheck(store.getPaycheck(id)) : openEntry(store.listEntries(selectedId).find((item) => item.id === id));
    else confirmDelete(kind, id);
  });
}

function confirmDelete(kind, id) {
  pendingDelete = { kind, id, paycheckId: selectedId };
  const isPaycheck = kind === 'paycheck';
  $('#confirm-title').textContent = isPaycheck ? 'Delete this paycheck?' : 'Delete this entry?';
  $('#confirm-copy').textContent = isPaycheck ? 'This also removes its expense and savings entries from this browser.' : 'This entry will be removed from the selected paycheck.';
  confirmDialog.showModal();
}

$('#add-paycheck').addEventListener('click', () => openPaycheck());
$('#add-paycheck-inline').addEventListener('click', () => openPaycheck());
$('#add-entry').addEventListener('click', () => openEntry());
$('#paycheck-list').addEventListener('click', (event) => {
  const menuButton = event.target.closest('[data-menu]');
  if (menuButton) { event.stopPropagation(); menuFor(menuButton); return; }
  const row = event.target.closest('[data-select-paycheck]');
  if (row) { selectedId = Number(row.dataset.selectPaycheck); render(); }
});
$('#paycheck-list').addEventListener('keydown', (event) => {
  if ((event.key === 'Enter' || event.key === ' ') && event.target.matches('[data-select-paycheck]')) {
    event.preventDefault(); selectedId = Number(event.target.dataset.selectPaycheck); render();
  }
});
$('#activity-list').addEventListener('click', (event) => {
  const button = event.target.closest('[data-menu]');
  if (button) menuFor(button);
});
document.addEventListener('click', (event) => {
  if (!event.target.closest('.row-actions')) document.querySelectorAll('.row-menu').forEach((menu) => menu.remove());
});
document.querySelectorAll('[data-close]').forEach((button) => button.addEventListener('click', () => $(`#${button.dataset.close}`).close()));

$('#paycheck-form').addEventListener('submit', (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const digits = Number(form.elements.fractionDigits.value);
  const currencyCode = form.elements.currencyCode.value.trim().toUpperCase();
  try {
    if (!/^[A-Z]{3}$/.test(currencyCode)) throw new TypeError('Enter a 3-letter currency code.');
    const grossMinor = parseAmountToMinorUnits(form.elements.gross.value, digits);
    const taxWithheldMinor = parseAmountToMinorUnits(form.elements.tax.value, digits);
    if (taxWithheldMinor > grossMinor) throw new TypeError('Tax withheld cannot exceed gross pay.');
    const id = store.savePaycheck({ ...(editingPaycheckId ? { id: editingPaycheckId } : {}),
      label: form.elements.label.value.trim(), payDate: form.elements.payDate.value, currencyCode,
      fractionDigits: digits, grossMinor, taxWithheldMinor });
    selectedId = id;
    paycheckDialog.close(); render();
  } catch (error) { $('#paycheck-error').textContent = error.message; }
});

$('#entry-form').addEventListener('submit', (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const paycheck = store.getPaycheck(selectedId);
  try {
    const category = form.elements.category.value.trim();
    if (!category) throw new TypeError('Enter a category.');
    const amountMinor = parseAmountToMinorUnits(form.elements.amount.value, paycheck.fractionDigits);
    if (amountMinor <= 0) throw new TypeError('Enter an amount greater than zero.');
    store.saveEntry(selectedId, { ...(editingEntryId ? { id: editingEntryId } : {}), kind: form.elements.kind.value,
      category, note: form.elements.note.value.trim(), amountMinor });
    entryDialog.close(); render();
  } catch (error) { $('#entry-error').textContent = error.message; }
});

$('#confirm-delete').addEventListener('click', (event) => {
  event.preventDefault();
  if (!pendingDelete) return;
  if (pendingDelete.kind === 'paycheck') store.deletePaycheck(pendingDelete.id);
  else store.deleteEntry(pendingDelete.paycheckId, pendingDelete.id);
  if (pendingDelete.kind === 'paycheck' && selectedId === pendingDelete.id) selectedId = null;
  pendingDelete = null;
  confirmDialog.close(); render();
});

render();
