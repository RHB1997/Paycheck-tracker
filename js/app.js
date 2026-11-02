import { inferCategory, CATEGORIES } from './categories.js';
import { getUsdRateSnapshot, convertMinorToUsdMinor } from './exchange-rates.js';
import { translate } from './i18n.js';
import { formatDate, formatMoney, parseAmountToMinorUnits, summarize } from './money.js';
import { LocalStore } from './storage.js';

const store = new LocalStore();
const $ = (selector) => document.querySelector(selector);
const paycheckDialog = $('#paycheck-dialog');
const entryDialog = $('#entry-dialog');
const confirmDialog = $('#confirm-dialog');
const LANGUAGE_KEY = 'paycheck-tracker-language-v1';
let language = 'en';
try { language = localStorage.getItem(LANGUAGE_KEY) === 'ar' ? 'ar' : 'en'; } catch { /* Use English if browser storage is unavailable. */ }
let selectedId = null;
let editingPaycheckId = null;
let editingEntryId = null;
let pendingDelete = null;

function t(key, values) { return translate(language, key, values); }
function locale() { return language === 'ar' ? 'ar-IQ' : 'en-US'; }
function h(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
}
function cash(amount, code, digits) { return formatMoney(amount, code, digits, locale()); }
function paycheckCash(amount, paycheck) { return cash(amount, paycheck.currencyCode, paycheck.fractionDigits); }
function usdCash(minor) { return Number.isSafeInteger(minor) ? cash(minor, 'USD', 2) : t('usdUnavailable'); }
function recordUsdLabel(record) {
  if (!Number.isSafeInteger(record.usdMinor)) return t('usdUnavailable');
  const amount = cash(record.usdMinor, 'USD', 2);
  if (record.currencyCode === 'USD') return t('usdDirect', { amount });
  const asOf = record.usdRateAsOf ?? record.usdRateCapturedAt;
  return t('usdApprox', { amount, date: asOf ? formatDate(asOf, locale()) : '—' });
}
function categoryName(category, text = '', kind = 'expense') {
  const key = CATEGORIES.includes(category) ? category : inferCategory(text || category, kind);
  return t(`category.${key}`);
}
function translateError(error) {
  if (error.code) return t(error.code, error.values);
  if (error.name === 'QuotaExceededError' || error.name === 'SecurityError') return t('storageError');
  if (/valid amount|Decimal places/i.test(error.message)) return t('invalidAmount');
  if (/too large/i.test(error.message)) return t('amountTooLarge');
  return error.message || t('storageError');
}
function applyLanguage() {
  document.documentElement.lang = language;
  document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
  document.title = language === 'ar' ? 'راتبي — أموالك بصورة أوضح' : 'Paycheck — money, in perspective';
  document.querySelectorAll('[data-i18n]').forEach((element) => {
    element.textContent = t(element.dataset.i18n);
  });
  document.querySelectorAll('[data-i18n-placeholder]').forEach((element) => {
    element.placeholder = t(element.dataset.i18nPlaceholder);
  });
  document.querySelectorAll('[data-i18n-aria-label]').forEach((element) => {
    element.setAttribute('aria-label', t(element.dataset.i18nAriaLabel));
  });
  $('#language-toggle').textContent = language === 'ar' ? 'English' : 'العربية';
  $('#language-toggle').setAttribute('aria-label', language === 'ar' ? 'Switch to English' : 'التبديل إلى العربية');
  $('#today-label').textContent = new Intl.DateTimeFormat(locale(), { month: 'long', year: 'numeric' })
    .format(new Date()).toLocaleUpperCase(language === 'ar' ? 'ar-IQ' : 'en-US');
}

function sumUsd(records) {
  if (!records.length || records.some((record) => !Number.isSafeInteger(record.usdMinor))) return null;
  return records.reduce((total, record) => total + record.usdMinor, 0);
}

function render() {
  const paychecks = store.listPaychecks();
  if (!paychecks.some((item) => item.id === selectedId)) selectedId = paychecks[0]?.id ?? null;
  $('#paycheck-list').innerHTML = paychecks.length ? paychecks.map((item) => {
    const totals = summarize(item, item.entries);
    const name = item.label || t('paycheck');
    return `<div class="paycheck-row ${item.id === selectedId ? 'selected' : ''}" data-select-paycheck="${item.id}" tabindex="0" role="button" aria-label="${h(name)}, ${paycheckCash(totals.payMinor, item)}">
      <span class="paycheck-symbol" aria-hidden="true">▤</span><div class="paycheck-info"><div class="paycheck-name">${h(name)}</div><div class="paycheck-date">${formatDate(item.payDate, locale())}</div></div>
      <div class="paycheck-amount">${paycheckCash(totals.payMinor, item)}<div class="paycheck-net-label">${t('takeHome')}</div><div class="fx-equivalent">${h(recordUsdLabel(item))}</div></div>
      <div class="row-actions"><button class="icon-button" data-menu="paycheck" data-id="${item.id}" aria-label="${h(t('edit'))} ${h(name)}" aria-haspopup="true">···</button></div></div>`;
  }).join('') : `<div class="empty-state"><div class="empty-symbol" aria-hidden="true">＋</div><strong>${t('noPaychecksTitle')}</strong><br>${t('noPaychecksBody')}</div>`;

  const paycheck = store.getPaycheck(selectedId);
  const entries = paycheck ? store.listEntries(paycheck.id) : [];
  const totals = paycheck ? summarize(paycheck, entries) : null;
  $('#add-entry').disabled = !paycheck;
  $('#activity-title').textContent = paycheck ? (paycheck.label || t('paycheckActivity')) : t('recentActivity');
  if (!paycheck) {
    ['pay-total', 'expenses-total', 'savings-total', 'remaining-total'].forEach((id) => { $(`#${id}`).textContent = '—'; });
    ['pay-usd', 'expenses-usd', 'savings-usd', 'remaining-usd'].forEach((id) => { $(`#${id}`).textContent = ''; });
    $('#pay-note').textContent = t('selectPaycheck');
    ['expenses-note', 'savings-note', 'remaining-note'].forEach((id) => { $(`#${id}`).textContent = t('fromSelected'); });
    $('#net-track-fill').style.width = '0%';
    $('#activity-list').innerHTML = `<div class="empty-state"><div class="empty-symbol" aria-hidden="true">⌁</div><strong>${t('activityEmptyTitle')}</strong><br>${t('activityEmptyBody')}</div>`;
    return;
  }
  const expenseEntries = entries.filter((item) => item.kind === 'expense');
  const savingEntries = entries.filter((item) => item.kind === 'saving');
  const expensesUsd = sumUsd(expenseEntries);
  const savingsUsd = sumUsd(savingEntries);
  const remainingUsd = Number.isSafeInteger(paycheck.usdMinor) && Number.isSafeInteger(expensesUsd) && Number.isSafeInteger(savingsUsd)
    ? paycheck.usdMinor - expensesUsd - savingsUsd : null;
  $('#pay-total').textContent = paycheckCash(totals.payMinor, paycheck);
  $('#expenses-total').textContent = paycheckCash(totals.expensesMinor, paycheck);
  $('#savings-total').textContent = paycheckCash(totals.savingsMinor, paycheck);
  $('#remaining-total').textContent = paycheckCash(totals.remainingMinor, paycheck);
  $('#pay-usd').textContent = recordUsdLabel(paycheck);
  $('#expenses-usd').textContent = usdCash(expensesUsd);
  $('#savings-usd').textContent = usdCash(savingsUsd);
  $('#remaining-usd').textContent = usdCash(remainingUsd);
  $('#pay-note').textContent = t('paycheck');
  $('#expenses-note').textContent = `${expenseEntries.length} ${expenseEntries.length === 1 ? t('entry') : t('entries')}`;
  $('#savings-note').textContent = `${savingEntries.length} ${savingEntries.length === 1 ? t('entry') : t('entries')}`;
  $('#remaining-note').textContent = t('fromSelected');
  $('#net-track-fill').style.width = `${totals.payMinor > 0 ? Math.max(0, Math.min(100, totals.remainingMinor / totals.payMinor * 100)) : 0}%`;
  $('#activity-list').innerHTML = entries.length ? entries.map((item) => {
    const saving = item.kind === 'saving';
    const code = item.currencyCode || paycheck.currencyCode;
    const digits = item.fractionDigits ?? paycheck.fractionDigits;
    const description = item.note || categoryName(item.category, item.note, item.kind);
    return `<div class="activity-row"><span class="activity-symbol ${saving ? 'saving' : 'expense'}" aria-hidden="true">${saving ? '⌖' : '↘'}</span>
      <div class="activity-info"><div class="activity-name" dir="auto">${h(description)}</div><div class="activity-meta">${h(categoryName(item.category, item.note, item.kind))} · ${formatDate(item.occurredAt, locale())}</div><div class="fx-equivalent">${h(recordUsdLabel(item))}</div></div>
      <div class="activity-amount ${saving ? 'saving' : 'expense'}">${saving ? '+' : '−'}${cash(item.amountMinor, code, digits)}</div>
      <div class="row-actions"><button class="icon-button" data-menu="entry" data-id="${item.id}" aria-label="${h(t('edit'))} ${h(description)}" aria-haspopup="true">···</button></div></div>`;
  }).join('') : `<div class="empty-state"><div class="empty-symbol" aria-hidden="true">⌁</div><strong>${t('noActivityTitle')}</strong><br>${t('noActivityBody')}</div>`;
}

function openPaycheck(item = null) {
  editingPaycheckId = item?.id ?? null;
  const form = $('#paycheck-form');
  form.reset();
  form.elements.label.value = item?.label ?? '';
  form.elements.payDate.value = item?.payDate ?? new Date().toISOString().slice(0, 10);
  form.elements.currencyCode.value = item?.currencyCode ?? 'USD';
  form.elements.fractionDigits.value = String(item?.fractionDigits ?? 2);
  form.elements.pay.value = item ? (item.payMinor / 10 ** item.fractionDigits).toFixed(item.fractionDigits) : '';
  const currencyLocked = Boolean(item?.entries?.length);
  form.elements.currencyCode.disabled = currencyLocked;
  form.elements.fractionDigits.disabled = currencyLocked;
  $('#currency-lock-hint').hidden = !currencyLocked;
  $('#currency-lock-hint').textContent = currencyLocked ? t('currencyLock') : '';
  $('#paycheck-dialog-title').textContent = t(item ? 'editPaycheckTitle' : 'addPaycheckTitle');
  $('#paycheck-error').textContent = '';
  paycheckDialog.showModal();
}

function updateCategoryPreview() {
  const kind = $('#entry-form').elements.kind.value;
  $('#category-preview').textContent = categoryName(inferCategory($('#entry-form').elements.note.value, kind));
}

function openEntry(item = null) {
  const paycheck = store.getPaycheck(selectedId);
  if (!paycheck) return;
  editingEntryId = item?.id ?? null;
  const form = $('#entry-form');
  form.reset();
  form.elements.kind.value = item?.kind ?? 'expense';
  form.elements.note.value = item?.note ?? '';
  form.elements.amount.value = item ? (item.amountMinor / 10 ** (item.fractionDigits ?? paycheck.fractionDigits)).toFixed(item.fractionDigits ?? paycheck.fractionDigits) : '';
  $('#entry-currency-label').textContent = `(${paycheck.currencyCode})`;
  $('#entry-dialog-title').textContent = t(item ? 'editEntryTitle' : 'addEntryTitle');
  $('#entry-error').textContent = '';
  updateCategoryPreview();
  entryDialog.showModal();
}

function menuFor(button) {
  document.querySelectorAll('.row-menu').forEach((menu) => menu.remove());
  const menu = document.createElement('div');
  menu.className = 'row-menu';
  menu.innerHTML = `<button type="button" data-action="edit">${t('edit')}</button><button type="button" class="delete-action" data-action="delete">${t('menuDelete')}</button>`;
  button.parentElement.append(menu);
  menu.addEventListener('click', (event) => {
    const action = event.target.closest('[data-action]')?.dataset.action;
    if (!action) return;
    const id = Number(button.dataset.id);
    const kind = button.dataset.menu;
    menu.remove();
    if (action === 'edit') kind === 'paycheck' ? openPaycheck(store.getPaycheck(id)) : openEntry(store.listEntries(selectedId).find((entry) => entry.id === id));
    else confirmDelete(kind, id);
  });
}

function confirmDelete(kind, id) {
  pendingDelete = { kind, id, paycheckId: selectedId };
  const isPaycheck = kind === 'paycheck';
  $('#confirm-title').textContent = t(isPaycheck ? 'deletePaycheck' : 'deleteEntry');
  $('#confirm-copy').textContent = t(isPaycheck ? 'deletePaycheckCopy' : 'deleteEntryCopy');
  confirmDialog.showModal();
}

function withSubmitState(form, message, work) {
  const submit = form.querySelector('[type="submit"]');
  const error = form.querySelector('.form-error');
  submit.disabled = true;
  error.textContent = message;
  return work().catch((reason) => { error.textContent = translateError(reason); })
    .finally(() => { submit.disabled = false; if (error.textContent === t('rateLoading')) error.textContent = ''; });
}

$('#language-toggle').addEventListener('click', () => {
  language = language === 'en' ? 'ar' : 'en';
  try { localStorage.setItem(LANGUAGE_KEY, language); } catch { /* Language can still change for this session. */ }
  applyLanguage();
  render();
  if (paycheckDialog.open) {
    $('#paycheck-dialog-title').textContent = t(editingPaycheckId ? 'editPaycheckTitle' : 'addPaycheckTitle');
    $('#currency-lock-hint').textContent = editingPaycheckId && store.getPaycheck(editingPaycheckId)?.entries.length ? t('currencyLock') : '';
  }
  if (entryDialog.open) { $('#entry-dialog-title').textContent = t(editingEntryId ? 'editEntryTitle' : 'addEntryTitle'); updateCategoryPreview(); }
});
$('#add-paycheck').addEventListener('click', () => openPaycheck());
$('#add-paycheck-inline').addEventListener('click', () => openPaycheck());
$('#add-entry').addEventListener('click', () => openEntry());
$('#entry-form').elements.kind.addEventListener('change', updateCategoryPreview);
$('#entry-form').elements.note.addEventListener('input', updateCategoryPreview);
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
$('#activity-list').addEventListener('click', (event) => { const button = event.target.closest('[data-menu]'); if (button) menuFor(button); });
document.addEventListener('click', (event) => { if (!event.target.closest('.row-actions')) document.querySelectorAll('.row-menu').forEach((menu) => menu.remove()); });
document.querySelectorAll('[data-close]').forEach((button) => button.addEventListener('click', () => $(`#${button.dataset.close}`).close()));

$('#paycheck-form').addEventListener('submit', (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const digits = Number(form.elements.fractionDigits.value);
  const currencyCode = form.elements.currencyCode.value.trim().toUpperCase();
  let payMinor;
  try { payMinor = parseAmountToMinorUnits(form.elements.pay.value, digits); }
  catch (error) { $('#paycheck-error').textContent = translateError(error); return; }
  if (!/^[A-Z]{3}$/.test(currencyCode)) { $('#paycheck-error').textContent = t('invalidCurrency'); return; }
  withSubmitState(form, t('rateLoading'), async () => {
    const rate = await getUsdRateSnapshot(currencyCode, { storage: store.storage });
    const values = {
      ...(editingPaycheckId ? { id: editingPaycheckId } : {}), label: form.elements.label.value.trim(),
      payDate: form.elements.payDate.value, currencyCode, fractionDigits: digits, payMinor,
      usdRate: rate.usdRate, usdMinor: convertMinorToUsdMinor(payMinor, digits, rate.usdRate),
      usdRateAsOf: rate.usdRateAsOf, usdRateCapturedAt: rate.usdRateCapturedAt,
    };
    selectedId = store.savePaycheck(values);
    paycheckDialog.close(); render();
  });
});

$('#entry-form').addEventListener('submit', (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const paycheck = store.getPaycheck(selectedId);
  let amountMinor;
  try { amountMinor = parseAmountToMinorUnits(form.elements.amount.value, paycheck.fractionDigits); }
  catch (error) { $('#entry-error').textContent = translateError(error); return; }
  if (amountMinor <= 0) { $('#entry-error').textContent = t('invalidAmount'); return; }
  const kind = form.elements.kind.value;
  const description = form.elements.note.value.trim();
  if (!description) { $('#entry-error').textContent = t('descriptionRequired'); return; }
  withSubmitState(form, t('rateLoading'), async () => {
    const rate = await getUsdRateSnapshot(paycheck.currencyCode, { storage: store.storage });
    store.saveEntry(selectedId, {
      ...(editingEntryId ? { id: editingEntryId } : {}), kind, category: inferCategory(description, kind),
      note: description, amountMinor, currencyCode: paycheck.currencyCode, fractionDigits: paycheck.fractionDigits,
      usdRate: rate.usdRate, usdMinor: convertMinorToUsdMinor(amountMinor, paycheck.fractionDigits, rate.usdRate),
      usdRateAsOf: rate.usdRateAsOf, usdRateCapturedAt: rate.usdRateCapturedAt,
    });
    entryDialog.close(); render();
  });
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

applyLanguage();
render();
