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
      observedRange: dateRange(observed),
      assembled: day(feed.generated_at) || "Unavailable",
      providers: count(feed.source_count_summary && feed.source_count_summary.registry_supplier_count),
      regions: Array.isArray(feed.region_market) ? feed.region_market : [],
      historyWindow: feed.history_window || null,
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
  /* Daily medians [date, $/GPU-hr] drawn on a date axis spanning the history window. */
  function cleanSeries(history) {
    return (Array.isArray(history) ? history : []).filter(function (point) {
      return Array.isArray(point) && day(point[0]) && typeof point[1] === "number" && Number.isFinite(point[1]) && point[1] > 0;
    }).map(function (point) { return [day(point[0]), Number(point[1].toFixed(2))]; }).sort(function (a, b) { return a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0; });
  }
  var SPARK_W = 160, SPARK_H = 36, PAD = 4;
  function sparkGeometry(points, win) {
    var t0 = Date.parse((win && win.start) || points[0][0]), t1 = Date.parse((win && win.end) || points[points.length - 1][0]);
    if (!(t1 > t0)) { t0 = Date.parse(points[0][0]); t1 = t0 + 86400000; }
    var values = points.map(function (p) { return p[1]; });
    var lo = Math.min.apply(null, values), hi = Math.max.apply(null, values);
    if (hi - lo < 0.01) { lo -= 0.5; hi += 0.5; }
    return points.map(function (p) {
      var x = PAD + (Date.parse(p[0]) - t0) / (t1 - t0) * (SPARK_W - 2 * PAD);
      var y = PAD + (hi - p[1]) / (hi - lo) * (SPARK_H - 2 * PAD);
      return [Number(Math.min(SPARK_W - PAD, Math.max(PAD, x)).toFixed(1)), Number(y.toFixed(1))];
    });
  }
  function trendMarkup(row, win) {
    var points = cleanSeries(row.history);
    if (!points.length) return '<span class="m-trend m-trend-empty">No public rate in window</span>';
    var xy = sparkGeometry(points, win);
    var first = points[0], last = points[points.length - 1];
    var change = (last[1] - first[1]) / first[1] * 100;
    var dir = Math.abs(change) < 0.5 ? "flat" : change > 0 ? "up" : "down";
    var changeText = (change > 0 ? "+" : change < 0 ? "\u2212" : "") + Math.abs(change).toFixed(Math.abs(change) < 10 ? 1 : 0) + "%";
    var changeTitle = "Change since " + first[0];
    // A series younger than two weeks has no meaningful trend yet.
    if ((Date.parse(last[0]) - Date.parse(first[0])) / 86400000 < 14) { dir = "new"; changeText = "new"; changeTitle = "Public rate first observed " + first[0]; }
    var line = xy.map(function (p, i) { return (i ? "L" : "M") + p[0] + "," + p[1]; }).join(" ");
    var end = xy[xy.length - 1];
    var area = xy.length > 1 ? '<path class="spark-area" d="' + line + " L" + end[0] + "," + SPARK_H + " L" + xy[0][0] + "," + SPARK_H + ' Z"/>' : "";
    var label = row.gpu_family + " median per GPU-hour, " + points.length + " daily points from " + first[0] + " ($" + first[1].toFixed(2) + ") to " + last[0] + " ($" + last[1].toFixed(2) + ")";
    var data = points.map(function (p, i) { return p[0] + "|" + p[1] + "|" + xy[i][0] + "|" + xy[i][1]; }).join(";");
    return '<span class="m-trend" data-trend="' + escape(data) + '">' +
      '<svg class="spark" viewBox="0 0 ' + SPARK_W + " " + SPARK_H + '" preserveAspectRatio="none" role="img" aria-label="' + escape(label) + '">' + area +
      '<path class="spark-line" d="' + line + '"/><circle class="spark-end" cx="' + end[0] + '" cy="' + end[1] + '" r="2.4"/><circle class="spark-hover" r="3" cx="-10" cy="-10"/></svg>' +
      '<em class="m-chg ' + dir + '" title="' + escape(changeTitle) + '">' + escape(changeText) + '</em><span class="spark-tip" aria-hidden="true"></span></span>';
  }
  function rowsMarkup(view) {
    return view.rows.map(function (row) {
      return '<div class="mrow"><span class="m-gpu">' + escape(row.gpu_family) + '</span><span class="m-price">' + escape(money(row.median_price_per_gpu_hour)) + '</span>' + trendMarkup(row, view.historyWindow) + '</div>';
    }).join("\n");
  }
  /* Hover/touch readout: nearest daily point to the pointer. */
  function bindTrends(document) {
    document.querySelectorAll(".m-trend[data-trend]").forEach(function (cell) {
      if (cell.dataset.bound) return;
      cell.dataset.bound = "1";
      var points = cell.dataset.trend.split(";").map(function (part) { var f = part.split("|"); return { date: f[0], price: Number(f[1]), x: Number(f[2]), y: Number(f[3]) }; });
      var svg = cell.querySelector("svg"), dot = cell.querySelector(".spark-hover"), tip = cell.querySelector(".spark-tip");
      if (!svg || !dot || !tip) return;
      function show(event) {
        var box = svg.getBoundingClientRect();
        if (!box.width) return;
        var x = (event.clientX - box.left) / box.width * SPARK_W;
        var best = points[0];
        points.forEach(function (p) { if (Math.abs(p.x - x) < Math.abs(best.x - x)) best = p; });
        dot.setAttribute("cx", best.x); dot.setAttribute("cy", best.y);
        tip.textContent = best.date + " \u00b7 $" + best.price.toFixed(2) + "/hr";
        tip.style.left = (best.x / SPARK_W * box.width + (box.left - cell.getBoundingClientRect().left)) + "px";
        cell.classList.add("is-active");
      }
      function hide() { cell.classList.remove("is-active"); dot.setAttribute("cx", -10); }
      svg.addEventListener("pointermove", show);
      svg.addEventListener("pointerdown", show);
      svg.addEventListener("pointerleave", hide);
    });
  }
  /* Dated, quotable sentence for the homepage FAQ (visible text and FAQPage schema). */
  function faqPricesText(view) {
    var priced = view.rows.filter(function (row) { return money(row.median_price_per_gpu_hour) !== "On request"; });
    var unpriced = view.rows.filter(function (row) { return money(row.median_price_per_gpu_hour) === "On request"; });
    if (!priced.length) return "No included public rate was available in the " + view.assembled + " price snapshot.";
    var parts = priced.map(function (row) { return row.gpu_family + " " + money(row.median_price_per_gpu_hour).replace("/hr", ""); });
    var list = parts.length > 1 ? parts.slice(0, -1).join(", ") + " and " + parts[parts.length - 1] : parts[0];
    var text = "In the public price snapshot assembled " + view.assembled + " (source observations " + view.observedRange + "), median provider-average rates were " + list + " per GPU-hour";
    if (unpriced.length) text += "; " + unpriced.map(function (row) { return row.gpu_family; }).join(" and ") + " had no included public rate";
    return text + ". These are dated public list-price observations across the monitored registry, not quotes or allocations.";
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
    if (rows) { rows.innerHTML = rowsMarkup(view); bindTrends(document); }
    if (status) { status.textContent = view.status + " · assembled " + view.assembled; status.dataset.stale = String(view.stale); }
    document.querySelectorAll(".map-pin").forEach(function (pin) {
      var region = view.regions.find(function (item) { return item.id === pin.dataset.regionId; });
      var r = regionView(region || {label: pin.dataset.region});
      pin.dataset.gpus = r.gpus; pin.dataset.model = r.description; pin.dataset.sources = r.sources; pin.dataset.observed = r.observed;
      pin.setAttribute("aria-label", r.label + ": " + r.sources + ", observations " + r.observed);
    });
    return view;
  }
  return {model:model, tickerMarkup:tickerMarkup, rowsMarkup:rowsMarkup, trendMarkup:trendMarkup, bindTrends:bindTrends, faqPricesText:faqPricesText, regionView:regionView, apply:apply, escape:escape};
});
