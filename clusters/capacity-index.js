/* Progressive enhancement: every route and source is already in the HTML. */
(function () {
  'use strict';
  function matches(row, filters) {
    return (!filters.gpu || row.gpu === filters.gpu) &&
      (!filters.region || row.regions.includes(filters.region)) &&
      (!filters.q || row.text.toLowerCase().includes(filters.q.toLowerCase().trim()));
  }
  function reviewState(due, today) {
    return today > due ? 'Review overdue' : 'Within review window';
  }
  if (typeof module !== 'undefined' && module.exports) { module.exports = { matches, reviewState }; return; }
  const form = document.getElementById('capacity-filters');
  if (!form) return;
  const rows = [...document.querySelectorAll('[data-capacity-row]')];
  const controls = { gpu: form.elements.gpu, region: form.elements.region, q: form.elements.q };
  const result = document.getElementById('capacity-result-count');
  const empty = document.getElementById('capacity-empty');
  const today = new Date().toISOString().slice(0, 10);
  rows.forEach(row => { row.querySelector('[data-review-status]').textContent = reviewState(row.dataset.reviewDue, today); });
  const initial = new URLSearchParams(window.location.search);
  for (const name of ['gpu','region']) {
    const value = initial.get(name) || '';
    if ([...controls[name].options].some(option => option.value === value)) controls[name].value = value;
  }
  controls.q.value = (initial.get('q') || '').slice(0, 120);
  function update(writeURL) {
    const filters = Object.fromEntries(Object.entries(controls).map(([key, input]) => [key, input.value]));
    let visible = 0;
    rows.forEach(row => {
      const show = matches({gpu: row.dataset.gpu, regions: row.dataset.regions.split('|'), text: row.textContent}, filters);
      row.hidden = !show;
      if (show) visible += 1;
    });
    result.textContent = `Showing ${visible} of ${rows.length} documented routes. Free allocation requires confirmation.`;
    empty.hidden = visible !== 0;
    if (writeURL) {
      const url = new URL(window.location.href);
      for (const [key, value] of Object.entries(filters)) { if (value.trim()) url.searchParams.set(key, value.trim()); else url.searchParams.delete(key); }
      history.replaceState(null, '', url);
    }
  }
  form.hidden = false;
  form.addEventListener('input', () => update(true));
  form.addEventListener('change', () => update(true));
  form.addEventListener('submit', event => { event.preventDefault(); update(true); });
  form.addEventListener('reset', () => { setTimeout(() => update(true), 0); });
  update(false);
})();
