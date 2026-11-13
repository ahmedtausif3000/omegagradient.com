// Pure financial arithmetic. No storage, network, or browser dependencies.
const FEE_NAMES = { setup: 'One-time fees', storage: 'Storage', network: 'Network', support: 'Support' };
const MONEY_LIMIT = Number.MAX_SAFE_INTEGER / 100;
const money = value => Math.round((value + Number.EPSILON) * 100) / 100;
const missing = value => value === '' || value === null || value === undefined;

export function calculateQuote(quote) {
  const errors = [];
  const unknownExpense = [];
  const unknownUpfront = [];
  function number(value, name, { required = true, positive = false, integer = false } = {}) {
    if (missing(value)) {
      if (required) errors.push(`${name} is required.`);
      return null;
    }
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed < 0 || (positive && parsed === 0) || (integer && !Number.isInteger(parsed))) {
      errors.push(`${name} must be a ${positive ? 'positive' : 'non-negative'} ${integer ? 'whole number' : 'number'}.`);
      return null;
    }
    if (parsed > MONEY_LIMIT) { errors.push(`${name} exceeds the calculator's supported range.`); return null; }
    return parsed;
  }
  const quantity = number(quote.quantity, 'GPU count', { positive: true, integer: true });
  const termLength = number(quote.termLength, 'Term length', { positive: true });
  const hoursPerMonth = number(quote.hoursPerMonth, 'Planning hours per month', { positive: true });
  const rate = number(quote.rate, 'GPU-hour rate', { required: false });
  if (missing(quote.rate)) unknownExpense.push('GPU-hour rate');
  if (!['months', 'hours'].includes(quote.termUnit)) errors.push('Choose a term unit.');
  if (!['prorated', 'whole'].includes(quote.monthlyRounding)) errors.push('Choose how monthly fees are billed.');
  if (quote.start && (!/^\d{4}-\d{2}-\d{2}$/.test(quote.start) || Number.isNaN(Date.parse(quote.start)) || new Date(quote.start).toISOString().slice(0, 10) !== quote.start)) errors.push('Start date must be a valid calendar date.');
  const hours = termLength !== null && hoursPerMonth !== null ? termLength * (quote.termUnit === 'months' ? hoursPerMonth : 1) : null;
  const equivalentMonths = hours !== null && hoursPerMonth !== null ? hours / hoursPerMonth : null;
  const billedMonths = equivalentMonths !== null ? (quote.monthlyRounding === 'whole' ? Math.ceil(equivalentMonths) : equivalentMonths) : null;
  const gpuHours = quantity !== null && hours !== null ? quantity * hours : null;
  const computeCost = rate !== null && gpuHours !== null ? money(rate * gpuHours) : null;
  const fees = {};
  for (const [key, name] of Object.entries(FEE_NAMES)) {
    const fee = quote.fees?.[key] || { status: 'unknown' };
    if (fee.status === 'included') fees[key] = 0;
    else if (fee.status === 'extra') fees[key] = number(fee.amount, `${name} amount`);
    else if (fee.status === 'unknown') { fees[key] = null; unknownExpense.push(name); }
    else { fees[key] = null; errors.push(`Choose a status for ${name.toLowerCase()}.`); }
  }
  const monthlyFees = ['storage', 'network', 'support'].reduce((sum, key) => sum + (fees[key] ?? 0), 0);
  const recurringCost = billedMonths !== null ? money(monthlyFees * billedMonths) : null;
  const extraCost = money((fees.setup ?? 0) + (recurringCost ?? 0));
  const knownCommitment = money((computeCost ?? 0) + extraCost);
  const expenseComplete = unknownExpense.length === 0;
  const payment = quote.computePayment || { mode: 'unknown' };
  let computeUpfront = null;
  if (payment.mode === 'none') computeUpfront = 0;
  else if (payment.mode === 'full') computeUpfront = computeCost;
  else if (payment.mode === 'first_month') computeUpfront = rate !== null && quantity !== null && hours !== null && hoursPerMonth !== null ? money(rate * quantity * Math.min(hours, hoursPerMonth)) : null;
  else if (payment.mode === 'percent') {
    const percent = number(payment.value, 'Compute prepayment percentage');
    if (percent !== null && percent > 100) errors.push('Compute prepayment percentage cannot exceed 100%.');
    computeUpfront = percent !== null && computeCost !== null ? money(computeCost * percent / 100) : null;
  } else if (payment.mode === 'amount') {
    computeUpfront = number(payment.value, 'Compute payment due at signing');
    if (computeUpfront !== null && computeCost !== null && computeUpfront > computeCost) errors.push('Compute payment due at signing exceeds total GPU compute charges. Put refundable security in the deposit field.');
  } else if (payment.mode !== 'unknown') errors.push('Choose a compute payment schedule.');
  if (computeUpfront === null) unknownUpfront.push('GPU compute payment at signing');
  let recurringUpfront = null;
  if (quote.recurringPayment === 'arrears') recurringUpfront = 0;
  else if (['advance', 'full'].includes(quote.recurringPayment)) {
    recurringUpfront = billedMonths !== null ? money(monthlyFees * (quote.recurringPayment === 'full' ? billedMonths : Math.min(1, billedMonths))) : null;
    if (['storage', 'network', 'support'].some(key => fees[key] === null)) unknownUpfront.push('Unspecified recurring charges');
  } else if (quote.recurringPayment !== 'unknown') errors.push('Choose when recurring fees are paid.');
  if (recurringUpfront === null) unknownUpfront.push('Recurring fee payment schedule');
  if (fees.setup === null) unknownUpfront.push('One-time fees due at start');
  let deposit = null;
  if (quote.deposit?.status === 'none') deposit = 0;
  else if (quote.deposit?.status === 'amount') deposit = number(quote.deposit.amount, 'Refundable deposit');
  else if (quote.deposit?.status !== 'unknown' && quote.deposit?.status !== undefined) errors.push('Choose a refundable deposit status.');
  if (deposit === null) unknownUpfront.push('Refundable deposit');
  const knownUpfront = money((computeUpfront ?? 0) + (recurringUpfront ?? 0) + (fees.setup ?? 0) + (deposit ?? 0));
  for (const value of [hours, gpuHours, computeCost, recurringCost, knownCommitment, knownUpfront]) {
    if (value !== null && (!Number.isFinite(value) || value > MONEY_LIMIT)) { errors.push('The calculated amount exceeds the supported range; use a smaller comparison.'); break; }
  }
  return {
    valid: errors.length === 0, errors, quantity, rate, hours, hoursPerMonth, billedMonths, gpuHours,
    computeCost, fees, monthlyFees, recurringCost, extraCost, knownCommitment,
    expenseComplete, unknownExpense, computeUpfront, recurringUpfront, deposit, knownUpfront,
    upfrontComplete: unknownUpfront.length === 0, unknownUpfront,
    normalizedRate: gpuHours > 0 ? knownCommitment / gpuHours : null,
    monthlySensitivity: billedMonths !== null ? money(1000 * billedMonths) : null,
    effectiveRates: [0.5, 0.75, 1].map(utilization => ({ utilization, rate: gpuHours > 0 ? knownCommitment / (gpuHours * utilization) : null }))
  };
}

export function compareQuotes(a, b, first = calculateQuote(a), second = calculateQuote(b)) {
  const warnings = [];
  const normalize = value => String(value || '').trim().toLowerCase().replace(/\s+/g, ' ');
  for (const [field, name] of [['sku', 'GPU model / form factor'], ['fabric', 'Inter-node fabric'], ['location', 'Region / site'], ['start', 'Start date']]) {
    if (!normalize(a[field]) || !normalize(b[field])) warnings.push(`${name} is unspecified in at least one quote; equivalence is unconfirmed.`);
    else if (normalize(a[field]) !== normalize(b[field])) warnings.push(`${name} differs. These offers may serve different requirements.`);
  }
  if (first.quantity !== second.quantity) warnings.push('GPU counts differ; total commitments cover different capacity.');
  if (first.hours !== second.hours) warnings.push('Term hours differ; total commitments cover different durations.');
  if (a.termUnit !== b.termUnit || Number(a.termLength) !== Number(b.termLength) || Number(a.hoursPerMonth) !== Number(b.hoursPerMonth)) warnings.push('Term or month assumptions differ; confirm the actual contracted start and end times.');
  if (a.monthlyRounding !== b.monthlyRounding) warnings.push('Monthly fee billing assumptions differ.');
  if (!first.expenseComplete || !second.expenseComplete) warnings.push('Unspecified costs make this an incomplete expense comparison. No cheapest complete quote is identified.');
  if (!first.upfrontComplete || !second.upfrontComplete) warnings.push('Cash due at signing remains incomplete until payment terms and deposits are specified.');
  return { warnings, comparable: first.valid && second.valid && first.expenseComplete && second.expenseComplete && warnings.length === 0, costDifference: first.valid && second.valid && first.expenseComplete && second.expenseComplete ? money(first.knownCommitment - second.knownCommitment) : null };
}
