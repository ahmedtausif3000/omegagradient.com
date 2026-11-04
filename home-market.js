/* One model for the build-time snapshot and its browser freshness state. */
(function (root, factory) {
  var api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.OmegaPublicMarket = api;
})(typeof window !== "undefined" ? window : this, function () {
  "use strict";
  function escape(value) { return String(value == null ? "" : value).replace(/[&<>"']/g, function (c) { return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]; }); }
  function day(value) { return Number.isFinite(Date.parse(value)) ? new Date(value).toISOString().slice(0, 10) : null; }
  function count(value) { return Number.isInteger(value) && value >= 0 ? value : 0; }
  function money(value) { return typeof value === "number" && Number.isFinite(value) && value > 0 ? "$" + value.toFixed(2) + "/hr" : "On request"; }
  function dateRange(window) {
    var first = day(window && window.oldest), last = day(window && window.newest);
    return first && last ? first === last ? first : first + " – " + last : "Not recorded";
  }
  function model(feed, now) {
    feed = feed || {};
    var observed = feed.observation_window || {};
    var clock = now == null ? Date.now() : Number(now);
    var first = Date.parse(observed.oldest), last = Date.parse(observed.newest);
    var age = clock - first;
    var stale = !Number.isFinite(first) || !Number.isFinite(last) || first > last || last > clock || age > 36 * 3600000 || (observed.undatedRows || 0) > 0;
    return {
      stale: stale,
      status: (stale ? "Historical snapshot" : "Public price snapshot") + " · source observations " + dateRange(observed),
      assembled: day(feed.generated_at) || "Unavailable",
      providers: count(feed.source_count_summary && feed.source_count_summary.registry_supplier_count),
      regions: Array.isArray(feed.region_market) ? feed.region_market : [],
      rows: (feed.gpu_market || []).filter(function (row) { return ["H100","H200","B200","A100","L40S","B300","GB300"].indexOf(row.gpu_family) >= 0; })
    };
  }
  function tickerMarkup(view) {
    var items = view.rows.filter(function (row) { return money(row.median_price_per_gpu_hour) !== "On request"; }).map(function (row) {
      return '<span class="ti"><b>' + escape(row.gpu_family) + '</b> ' + escape(money(row.median_price_per_gpu_hour)) + '</span><span class="sep">·</span>';
    }).join("");
    items += '<span class="ti">' + view.providers + ' PROVIDERS IN REGISTRY</span><span class="sep">·</span>';
    return '<div class="ticker-group">' + items + '</div><div class="ticker-group" aria-hidden="true">' + items + '</div>';
  }
  function rowsMarkup(view) {
    return view.rows.map(function (row) {
      var n = count(row.supply_source_count);
      return '<div class="mrow"><span class="m-gpu">' + escape(row.gpu_family) + '</span><span class="m-price">' + escape(money(row.median_price_per_gpu_hour)) + '</span><span class="m-src">' + (n ? n + (n === 1 ? " provider" : " providers") : "No public rate") + '</span><span class="m-date">' + escape(dateRange(row.observation_window)) + '</span></div>';
    }).join("\n");
  }
  function regionView(region) {
    region = region || {};
    var n = count(region.supply_source_count);
    return { label: region.label || "Region", gpus: (region.gpus || []).join(" · ") || "No located records", description: n ? "Publicly observed GPU offerings. Confirm location, allocation and terms before committing." : "No explicitly located public record in this snapshot. Ask us about your requirement.", sources: n + (n === 1 ? " provider" : " providers"), observed: dateRange(region.observation_window) };
  }
  function apply(document, feed, now) {
    var view = model(feed, now);
    var ticker = document.getElementById("tickerTrack");
    var rows = document.getElementById("homeMarketRows");
    var status = document.getElementById("homeMarketStatus");
    if (ticker) ticker.innerHTML = tickerMarkup(view);
    if (rows) rows.innerHTML = rowsMarkup(view);
    if (status) { status.textContent = view.status + " · assembled " + view.assembled; status.dataset.stale = String(view.stale); }
    document.querySelectorAll(".map-pin").forEach(function (pin) {
      var region = view.regions.find(function (item) { return item.id === pin.dataset.regionId; });
      var r = regionView(region || {label: pin.dataset.region});
      pin.dataset.gpus = r.gpus; pin.dataset.model = r.description; pin.dataset.sources = r.sources; pin.dataset.observed = r.observed;
      pin.setAttribute("aria-label", r.label + ": " + r.sources + ", observations " + r.observed);
    });
    return view;
  }
  return {model:model, tickerMarkup:tickerMarkup, rowsMarkup:rowsMarkup, regionView:regionView, apply:apply, escape:escape};
});
