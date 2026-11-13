import { calculateQuote, compareQuotes } from './quote-comparator-calc.mjs';

const form = document.getElementById('quote-form');
const editors = document.getElementById('quote-editors');
const sheet = document.getElementById('decision-sheet');
const errors = document.getElementById('validation-errors');
const status = document.getElementById('result-status');
const printButton = document.getElementById('print-sheet');
const exampleStatus = document.getElementById('example-status');
let exampleMode = false;
let toolOpened = false;
const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
const cash = value => value === null ? 'Not specified' : new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);
const decimal = value => value === null ? 'Not specified' : new Intl.NumberFormat('en-US', { maximumFractionDigits: 4 }).format(value);
const rateText = value => value === null ? 'Not specified' : `$${new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 }).format(value)}`;
const track = name => window.OmegaAcquisition?.track(name, { tool: 'reserved_quote_comparator' });
const openTool = () => { if (!toolOpened) { toolOpened = true; track('tool_open'); } };

function field(prefix, key, label, { type = 'text', value = '', options, help = '', wide = false, placeholder = '', step = 'any', min = '0', required = false } = {}) {
  const id = `${prefix}-${key}`;
  const control = options ? `<select id="${id}" name="${id}" ${help ? `aria-describedby="${id}-help"` : ''}>${options.map(([v, text]) => `<option value="${v}"${v === value ? ' selected' : ''}>${esc(text)}</option>`).join('')}</select>`
    : `<input id="${id}" name="${id}" type="${type}" value="${esc(value)}" ${type === 'number' ? `min="${min}" step="${step}" inputmode="decimal"` : ''} ${type === 'text' ? 'maxlength="120"' : ''} ${placeholder ? `placeholder="${esc(placeholder)}"` : ''} ${help ? `aria-describedby="${id}-help"` : ''} ${required ? 'required' : ''} autocomplete="off">`;
  return `<div class="qc-field${wide ? ' qc-field-wide' : ''}"><label for="${id}">${esc(label)}${required ? ' *' : ''}</label>${control}${help ? `<small id="${id}-help">${esc(help)}</small>` : ''}</div>`;
}
function editor(prefix, name) {
  const f = (key, label, options) => field(prefix, key, label, options);
  const fees = [['setup', 'One-time fees due at start', 'USD once'], ['storage', 'Storage', 'USD / month'], ['network', 'Network / transfer allowance', 'USD / month'], ['support', 'Support / management', 'USD / month']].map(([key, label, unit]) => `<div class="qc-fee"><span class="qc-fee-title">${label}</span>${f(`${key}-status`, `${label}: status`, { options: [['unknown', 'Not specified'], ['included', 'Included / no extra charge'], ['extra', 'Additional charge']] })}${f(`${key}-amount`, unit, { type: 'number' })}</div>`).join('');
  return `<section class="qc-editor" aria-labelledby="${prefix}-title"><div class="qc-editor-head"><h3 id="${prefix}-title">${name}</h3><span>${prefix === 'a' ? '01' : '02'} / USD</span></div><div class="qc-fields">
    ${f('quantity', 'GPU count', { type: 'number', step: '1', min: '1', required: true })}
    ${f('rate', 'USD per GPU-hour', { type: 'number', help: 'Leave blank if unquoted; a node-hour price must be divided by GPUs per node.' })}
    ${f('termLength', 'Reserved term length', { type: 'number', min: '.0001', required: true })}
    ${f('termUnit', 'Term unit', { options: [['months', 'Planning months'], ['hours', 'Exact reserved hours']] })}
    ${f('hoursPerMonth', 'Planning hours per month', { type: 'number', value: '730', min: '.0001', required: true, help: 'Used to convert months, or prorate monthly fees for an exact-hour term.' })}
    ${f('monthlyRounding', 'Monthly extras billed by', { options: [['prorated', 'Prorated planning months'], ['whole', 'Whole started months']], help: 'Confirm the provider rule. This does not round GPU compute hours.' })}
  </div><details open><summary>Infrastructure &amp; delivery</summary><div class="qc-fields">
    ${f('sku', 'GPU model / form factor', { placeholder: 'e.g. H200 SXM' })}${f('fabric', 'Inter-node fabric', { placeholder: 'e.g. 400G InfiniBand' })}
    ${f('location', 'Region / site', { placeholder: 'Same actual region or site' })}${f('start', 'Target start date', { type: 'date' })}
  </div></details><details open><summary>Additional fees</summary><div class="qc-fields">${fees}</div></details><details open><summary>Payment terms &amp; refundable deposit</summary><div class="qc-fields">
    ${f('paymentMode', 'GPU compute due at signing', { wide: true, options: [['unknown', 'Not specified'], ['none', 'None / compute billed in arrears'], ['first_month', 'First planning month in advance'], ['full', 'Entire GPU term prepaid'], ['percent', 'Custom % of GPU term prepaid'], ['amount', 'Custom USD GPU payment']], help: 'Choose one schedule. It includes any initial compute invoice; do not add that invoice again.' })}
    ${f('paymentValue', 'Custom prepayment value (% or USD)', { type: 'number', wide: true })}
    ${f('recurringPayment', 'Monthly extras due at signing', { wide: true, options: [['unknown', 'Not specified'], ['arrears', 'None / billed in arrears'], ['advance', 'First billed month in advance'], ['full', 'Entire term of monthly extras prepaid']] })}
    ${f('depositStatus', 'Refundable deposit', { options: [['unknown', 'Not specified'], ['none', 'Confirmed none'], ['amount', 'Known refundable amount']] })}
    ${f('depositAmount', 'Deposit amount (USD)', { type: 'number', help: 'Cash tied up, not an expense. Financing cost and refund timing are excluded.' })}
  </div></details></section>`;
}

editors.innerHTML = editor('a', 'Quote A') + editor('b', 'Quote B');
const input = (prefix, key) => form.elements.namedItem(`${prefix}-${key}`);
const val = (prefix, key) => input(prefix, key).value;
function readQuote(prefix) {
  return {
    ...Object.fromEntries(['quantity', 'rate', 'termLength', 'termUnit', 'hoursPerMonth', 'monthlyRounding', 'sku', 'fabric', 'location', 'start', 'recurringPayment'].map(key => [key, val(prefix, key)])),
    fees: Object.fromEntries(['setup', 'storage', 'network', 'support'].map(key => [key, { status: val(prefix, `${key}-status`), amount: val(prefix, `${key}-amount`) }])),
    computePayment: { mode: val(prefix, 'paymentMode'), value: val(prefix, 'paymentValue') },
    deposit: { status: val(prefix, 'depositStatus'), amount: val(prefix, 'depositAmount') }
  };
}
function syncDisabledFields() {
  for (const prefix of ['a', 'b']) {
    for (const key of ['setup', 'storage', 'network', 'support']) input(prefix, `${key}-amount`).disabled = val(prefix, `${key}-status`) !== 'extra';
    input(prefix, 'depositAmount').disabled = val(prefix, 'depositStatus') !== 'amount';
    const paymentMode = val(prefix, 'paymentMode');
    input(prefix, 'paymentValue').disabled = !['percent', 'amount'].includes(paymentMode);
    const label = document.querySelector(`label[for="${prefix}-paymentValue"]`);
    label.textContent = paymentMode === 'percent' ? 'Compute prepayment (% of GPU term)' : 'Compute payment due at signing (USD)';
    if (paymentMode === 'percent') input(prefix, 'paymentValue').max = '100';
    else input(prefix, 'paymentValue').removeAttribute('max');
  }
}
function invalidateSheet() {
  sheet.replaceChildren();
  printButton.disabled = true;
  status.textContent = 'Inputs changed. Compare quotes to refresh the decision sheet.';
  errors.hidden = true;
}
form.addEventListener('input', () => { openTool(); syncDisabledFields(); invalidateSheet(); });
form.addEventListener('change', () => { openTool(); syncDisabledFields(); invalidateSheet(); });

function summaryCard(name, result) {
  return `<article><h4>${name}</h4><div class="qc-metric"><span>${result.expenseComplete ? 'Total term commitment · expenses' : 'Known expense subtotal · incomplete'}</span><strong>${cash(result.knownCommitment)}</strong><small>${result.expenseComplete ? 'Includes stated extras; excludes refundable deposit.' : `Unspecified: ${esc(result.unknownExpense.join(', '))}. These are not assumed free.`}</small></div><div class="qc-metric"><span>${result.upfrontComplete ? 'Cash due at signing' : 'Known upfront cash · incomplete'}</span><strong>${cash(result.knownUpfront)}</strong><small>${result.upfrontComplete ? 'Includes the refundable deposit. Prepayment is counted once.' : `Unspecified: ${esc(result.unknownUpfront.join(', '))}.`}</small></div><div class="qc-metric"><span>${result.expenseComplete ? 'Cost per reserved GPU-hour' : 'Known subtotal per reserved GPU-hour'}</span><strong>${rateText(result.normalizedRate)}</strong><small>${decimal(result.gpuHours)} reserved GPU-hours in the denominator.</small></div></article>`;
}
function table(caption, rows) {
  return `<div class="qc-table-wrap" role="region" tabindex="0" aria-label="${esc(caption)}"><table class="qc-table"><caption>${esc(caption)}</caption><thead><tr><th scope="col">Component</th><th scope="col">Quote A</th><th scope="col">Quote B</th></tr></thead><tbody>${rows.map(([title, a, b]) => `<tr><th scope="row">${esc(title)}</th><td>${esc(a)}</td><td>${esc(b)}</td></tr>`).join('')}</tbody></table></div>`;
}
function renderDecision(a, b, ra, rb) {
  const comparison = compareQuotes(a, b, ra, rb);
  const fee = (quote, result, key) => quote.fees[key].status === 'unknown' ? 'Not specified' : quote.fees[key].status === 'included' ? 'Confirmed included / no extra charge' : `${cash(result.fees[key])}${key === 'setup' ? ' once' : ' / month'}`;
  const paymentName = { unknown: 'Not specified', none: 'None / billed in arrears', first_month: 'First planning month in advance', full: 'Entire GPU term prepaid', percent: 'Custom percent of GPU term', amount: 'Custom USD GPU payment' };
  const recurringName = { unknown: 'Not specified', arrears: 'None / billed in arrears', advance: 'First billed month in advance', full: 'Entire term prepaid' };
  const inputsTable = table('Capacity and term assumptions', [
    ['GPU model / form factor', a.sku || 'Not specified', b.sku || 'Not specified'], ['Inter-node fabric', a.fabric || 'Not specified', b.fabric || 'Not specified'], ['Region / site', a.location || 'Not specified', b.location || 'Not specified'], ['Target start date', a.start || 'Not specified', b.start || 'Not specified'], ['GPU count', decimal(ra.quantity), decimal(rb.quantity)],
    ['Entered reserved term', `${a.termLength} ${a.termUnit}`, `${b.termLength} ${b.termUnit}`], ['Hours per planning month', decimal(ra.hoursPerMonth), decimal(rb.hoursPerMonth)], ['Reserved term hours', decimal(ra.hours), decimal(rb.hours)], ['Reserved GPU-hours', decimal(ra.gpuHours), decimal(rb.gpuHours)], ['Monthly fee billing', a.monthlyRounding === 'whole' ? 'Whole started months' : 'Prorated planning months', b.monthlyRounding === 'whole' ? 'Whole started months' : 'Prorated planning months'], ['Months billed for recurring extras', decimal(ra.billedMonths), decimal(rb.billedMonths)]
  ]);
  const financials = table('Expense and cash breakdown', [
    ['Quoted USD per GPU-hour', rateText(ra.rate), rateText(rb.rate)], ['GPU compute for the full term', cash(ra.computeCost), cash(rb.computeCost)],
    ...['setup', 'storage', 'network', 'support'].map(key => [{ setup: 'One-time fees due at start', storage: 'Storage', network: 'Network', support: 'Support' }[key], fee(a, ra, key), fee(b, rb, key)]),
    ['Known extra expenses for the term', cash(ra.extraCost), cash(rb.extraCost)],
    ['GPU compute payment schedule', `${paymentName[a.computePayment.mode]}${['percent', 'amount'].includes(a.computePayment.mode) ? ` (${a.computePayment.mode === 'percent' ? `${a.computePayment.value}%` : cash(Number(a.computePayment.value))})` : ''}`, `${paymentName[b.computePayment.mode]}${['percent', 'amount'].includes(b.computePayment.mode) ? ` (${b.computePayment.mode === 'percent' ? `${b.computePayment.value}%` : cash(Number(b.computePayment.value))})` : ''}`],
    ['GPU compute cash due at signing', cash(ra.computeUpfront), cash(rb.computeUpfront)], ['Recurring fee payment schedule', recurringName[a.recurringPayment], recurringName[b.recurringPayment]], ['Known recurring cash due at signing', cash(ra.recurringUpfront), cash(rb.recurringUpfront)], ['Refundable deposit · excluded from expenses', cash(ra.deposit), cash(rb.deposit)]
  ]);
  const sensitivity = table('Sensitivity · unchanged capacity and term', [
    ['If another $1,000 / month is excluded', `Add ${cash(ra.monthlySensitivity)} to term expenses`, `Add ${cash(rb.monthlySensitivity)} to term expenses`],
    ['If another $1,000 one-time fee is excluded', 'Add $1,000 to term expenses', 'Add $1,000 to term expenses'],
    ...ra.effectiveRates.map((entry, index) => [`${entry.utilization * 100}% useful utilization · USD / useful GPU-hour`, `${rateText(entry.rate)}${ra.expenseComplete ? '' : ' (known costs only)'}`, `${rateText(rb.effectiveRates[index].rate)}${rb.expenseComplete ? '' : ' (known costs only)'}`])
  ]);
  const warningHtml = comparison.warnings.length ? `<aside class="qc-warning"><h3>Resolve these before comparing value</h3><ul>${comparison.warnings.map(warning => `<li>${esc(warning)}</li>`).join('')}</ul></aside>` : `<p class="qc-help">The entered configurations and cost fields align. This checks entered terms; it does not verify the provider, delivery, performance, or capacity.</p>`;
  const difference = comparison.costDifference !== null ? `<p><strong>Full-term expense difference:</strong> ${comparison.costDifference === 0 ? 'The entered term expenses are equal.' : `Quote ${comparison.costDifference > 0 ? 'A' : 'B'} costs ${cash(Math.abs(comparison.costDifference))} more over its entered term.`} ${comparison.warnings.length ? 'Resolve the differences and unknown terms above before treating this as a like-for-like comparison.' : 'Payment timing and delivery evidence still matter.'}</p>` : '';
  sheet.innerHTML = `<header class="qc-sheet-header"><h3>Omega Gradient / Reserved GPU decision sheet</h3><p>Calculated ${esc(new Date().toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' }))} · All amounts USD · User-entered terms</p><p>omegagradient.com/clusters/quote-comparator.html</p></header>${exampleMode ? '<p class="qc-example"><strong>ILLUSTRATIVE EXAMPLE — NOT A MARKET QUOTE.</strong> Invented starting figures; any subsequent edits are unverified user inputs.</p>' : ''}<div class="qc-summary">${summaryCard('Quote A', ra)}${summaryCard('Quote B', rb)}</div>${warningHtml}${inputsTable}${financials}${sensitivity}<div class="qc-sheet-notes">${difference}<p><strong>Calculation:</strong> GPU count × reserved hours × quoted GPU-hour rate + one-time fees + monthly extras × billed months. Normalized cost divides these expenses by all reserved GPU-hours. Unknown charges are not assumed zero; displayed subtotals have no implied upper bound.</p><p><strong>Cash treatment:</strong> GPU payment at signing + one-time fees due at start + recurring fees paid in advance + refundable deposit. GPU and recurring prepayments are portions of term expenses, not additional expenses. Refund timing, deposit financing costs, taxes, overages, currency changes, and exit charges are excluded unless entered as fees.</p><p><strong>Planning assumptions:</strong> Months use the entered hours-per-month figure. Exact-hour terms can prorate monthly fees or round them to whole started months. First-month advance payments are capped at the term. Actual start/end times, provider rounding, billing dates, and resource acceptance must be confirmed. No conclusion about live availability or supplier quality is made.</p></div>`;
  printButton.disabled = false;
  status.textContent = 'Decision sheet updated. Review the assumptions and missing terms before choosing a provider.';
}

form.addEventListener('submit', event => {
  event.preventDefault(); openTool();
  const a = readQuote('a'); const b = readQuote('b');
  const ra = calculateQuote(a); const rb = calculateQuote(b);
  const messages = [...ra.errors.map(error => `Quote A: ${error}`), ...rb.errors.map(error => `Quote B: ${error}`)];
  if (messages.length) {
    invalidateSheet();
    errors.innerHTML = `<h3>Check these inputs</h3><ul>${messages.map(message => `<li>${esc(message)}</li>`).join('')}</ul>`;
    errors.hidden = false; errors.focus();
    status.textContent = 'The decision sheet could not be calculated. Review the input errors above.';
    return;
  }
  errors.hidden = true;
  renderDecision(a, b, ra, rb);
  track('tool_compare');
  document.getElementById('results-title').focus({ preventScroll: true });
  document.getElementById('results-title').scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
});

document.getElementById('load-example').addEventListener('click', () => {
  openTool(); form.reset();
  exampleMode = true; exampleStatus.hidden = false;
  for (const prefix of ['a', 'b']) {
    const values = { quantity: '64', rate: prefix === 'a' ? '2.20' : '2.00', termLength: '6', termUnit: 'months', hoursPerMonth: '730', monthlyRounding: 'prorated', sku: 'H200 SXM', fabric: '400G InfiniBand', location: 'Same example region', start: '2026-11-01', 'setup-status': 'extra', 'setup-amount': '5000', 'storage-status': 'extra', 'storage-amount': '3000', 'network-status': 'included', 'support-status': prefix === 'a' ? 'included' : 'extra', 'support-amount': prefix === 'a' ? '' : '12000', paymentMode: prefix === 'a' ? 'first_month' : 'full', recurringPayment: 'advance', depositStatus: 'amount', depositAmount: '10000' };
    for (const [key, value] of Object.entries(values)) input(prefix, key).value = value;
  }
  syncDisabledFields(); form.requestSubmit();
});
document.getElementById('clear-quotes').addEventListener('click', () => {
  form.reset(); exampleMode = false; exampleStatus.hidden = true;
  syncDisabledFields(); invalidateSheet();
  status.textContent = 'Inputs cleared. Enter your own quotes to build a new decision sheet.';
  input('a', 'quantity').focus();
});
printButton.addEventListener('click', () => { if (printButton.disabled) return; track('tool_print'); window.print(); });
document.getElementById('shortlist-link').addEventListener('click', () => track('shortlist_click'));
syncDisabledFields();
