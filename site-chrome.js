/* Acquisition v1. Only public origins transmit; form fields never enter analytics. */
(function (window, document) {
  "use strict";
  if (window.OmegaAcquisition) return;
  var VERSION = 1, SESSION_MS = 30 * 60 * 1000, FIRST_MS = 90 * 86400000;
  var FIRST_KEY = "og_acquisition_first_v1", SESSION_KEY = "og_acquisition_session_v1";
  var production = window.location.protocol === "https:" && /^(www\.)?omegagradient\.com$/.test(window.location.hostname);
  var names = new Set(["site_page_view", "site_navigation_click", "cluster_brief_start", "cluster_brief_submit", "capacity_request_start", "capacity_request_submit", "procurement_checklist_print", "tool_open", "tool_compare", "tool_print", "shortlist_click", "capacity_index_filter", "capacity_index_shortlist"]);
  var utms = ["utm_source", "utm_medium", "utm_campaign", "utm_content"];
  function token(value, max) {
    var s = String(value || "").trim();
    return /^[a-zA-Z0-9][a-zA-Z0-9._~:+-]*$/.test(s) && !/\d{7,}/.test(s) ? s.slice(0, max || 120) : "";
  }
  function id() { return window.crypto.randomUUID(); }
  function validId(value) { return /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(String(value || "")); }
  function normalizeGpuModel(value) {
    var model = String(value || "").trim().toUpperCase();
    if (model === "GB200" || model === "GB300") model += " NVL72";
    return ["H100", "H200", "B200", "B300", "GB200 NVL72", "GB300 NVL72", "A100", "MI300X", "MI355X"].includes(model) ? model : "";
  }
  function siteUrl(value) {
    try {
      var u = new URL(value, window.location.href);
      if (!/^(www\.)?omegagradient\.com$/.test(u.hostname) || !/^\/[a-zA-Z0-9/_.-]*$/.test(u.pathname)) return "https://omegagradient.com/";
      return "https://omegagradient.com" + u.pathname;
    } catch (_) { return "https://omegagradient.com/"; }
  }
  function origin(value) {
    try { var u = new URL(value); return /^https?:$/.test(u.protocol) ? u.origin : ""; } catch (_) { return ""; }
  }
  function owned(value) { try { return /(^|\.)omegagradient\.com$/.test(new URL(value).hostname); } catch (_) { return false; } }
  var canonical = document.querySelector('link[rel="canonical"]');
  var pageUrl = siteUrl(canonical ? canonical.href : window.location.href);
  function read(storageName, key) { try { return JSON.parse(window[storageName].getItem(key) || "null"); } catch (_) { return null; } }
  function write(storageName, key, value) { try { window[storageName].setItem(key, JSON.stringify(value)); } catch (_) {} }
  function touch() {
    var params = new URLSearchParams(window.location.search), ref = origin(document.referrer);
    if (owned(ref)) ref = "";
    var t = { landing_page: pageUrl, referrer: ref, observed_at: new Date().toISOString() };
    utms.forEach(function (key) { t[key] = token(params.get(key)); });
    var host = ref ? new URL(ref).hostname : "";
    var ai = /(^|\.)(chatgpt\.com|chat\.openai\.com|claude\.ai|perplexity\.ai|copilot\.microsoft\.com)$/.test(host);
    var search = /(^|\.)(google\.[a-z.]+|bing\.com|duckduckgo\.com|search\.yahoo\.com)$/.test(host);
    t.source = t.utm_source || host || "direct_unknown";
    t.medium = t.utm_medium || (t.utm_source ? "campaign" : ai ? "ai_referral" : search ? "organic_search" : host ? "referral" : "unknown");
    t.evidence = t.utm_source ? "utm" : host ? "referrer" : "unknown";
    return t;
  }
  var now = Date.now(), current = touch();
  var first = read("localStorage", FIRST_KEY);
  if (!first || first.version !== VERSION || !first.touch || !first.visitor_id || now - first.created_at > FIRST_MS) {
    first = { version: VERSION, created_at: now, visitor_id: id(), touch: current };
    write("localStorage", FIRST_KEY, first);
  }
  var session = read("sessionStorage", SESSION_KEY);
  // New campaign/external arrival starts a session. Same-site navigation retains the acquisition source.
  if (!session || session.version !== VERSION || !session.touch || !session.session_id || now - session.last_seen > SESSION_MS || current.evidence !== "unknown") {
    session = { version: VERSION, session_id: id(), touch: current, last_seen: now };
  }
  session.last_seen = now;
  write("sessionStorage", SESSION_KEY, session);
  function snapshot() {
    return JSON.parse(JSON.stringify({ version: VERSION, visitor_id: first.visitor_id, session_id: session.session_id, first_touch: first.touch, session_touch: session.touch }));
  }
  function eventPayload(name, fields) {
    if (!names.has(name)) return null;
    var a = snapshot(), t = a.session_touch;
    var p = { event_id: id(), event_type: name, source_url: pageUrl, referrer: t.referrer, content_asset_id: new URL(pageUrl).pathname, visitor_id: a.visitor_id, session_id: a.session_id, acquisition_source: t.source, acquisition_medium: t.medium, attribution_evidence: t.evidence, landing_page: t.landing_page };
    utms.forEach(function (key) { p[key] = t[key] || ""; });
    ["tool", "form_type", "navigation_area", "navigation_link", "conversion_id"].forEach(function (key) { var v = key === "conversion_id" ? (validId((fields || {})[key]) ? fields[key] : "") : token((fields || {})[key], 120); if (v) p[key] = v; });
    return p;
  }
  function track(name, fields) {
    var p = eventPayload(name, fields);
    if (!p || !production) return false;
    session.last_seen = Date.now(); write("sessionStorage", SESSION_KEY, session);
    var body = JSON.stringify(p), endpoint = "https://track.omegagradient.com/g/events";
    try { if (window.navigator.sendBeacon && window.navigator.sendBeacon(endpoint, new Blob([body], { type: "text/plain;charset=UTF-8" }))) return true; } catch (_) {}
    window.fetch(endpoint, { method: "POST", body: body, keepalive: true, credentials: "omit" }).catch(function () {});
    return true;
  }
  function formPayload(payload, formType) {
    var copy = Object.assign({}, payload), a = snapshot();
    a.form_type = token(formType) || "capacity_request";
    copy.page_url = pageUrl;
    copy.attribution = a;
    var query = new URLSearchParams(window.location.search);
    copy.capacity_context = {};
    ["gpu_model", "capacity_record", "source_asset"].forEach(function (key) { var value = query.get(key) || (payload.capacity_context || {})[key] || ""; copy.capacity_context[key] = key === "gpu_model" ? normalizeGpuModel(value) : token(value); });
    // Voluntary source is a separate enum, not acquisition evidence or an analytics property.
    var discovery = String(copy.discovery_source || "");
    copy.discovery_source = ["search_engine", "chatgpt", "claude", "perplexity", "colleague_referral", "directory", "other"].includes(discovery) ? discovery : "";
    return copy;
  }
  async function submitCapacity(payload, formType, endpoint) {
    if (!production) throw new Error("Preview mode: requests are not sent. Use the production site when it is ready.");
    var target = new URL(endpoint || "/api/capacity-request", window.location.href);
    if (target.origin !== window.location.origin || target.pathname !== "/api/capacity-request") throw new Error("Invalid capacity form endpoint");
    var response = await window.fetch(target.href, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(formPayload(payload, formType)) });
    var result = await response.json().catch(function () { return {}; });
    if (!response.ok || result.ok !== true || !validId(result.id || result.conversion_id)) throw new Error(result.error || "Submission failed");
    result.id = result.id || result.conversion_id;
    track(formType === "reserved_cluster" ? "cluster_brief_submit" : "capacity_request_submit", { form_type: formType, conversion_id: result.id });
    return result;
  }
  window.OmegaAcquisition = { track: track, snapshot: snapshot, formPayload: formPayload, submitCapacity: submitCapacity, normalizeGpuModel: normalizeGpuModel, isProduction: production };
  track("site_page_view");
})(window, document);

(function () {
  "use strict";

  var header = document.querySelector("[data-og-site-header]");
  var nav = document.getElementById("og-global-nav");
  var toggle = header ? header.querySelector(".og-nav-toggle") : null;

  function closeNav() {
    if (!nav || !toggle) return;
    nav.classList.remove("is-open");
    toggle.setAttribute("aria-expanded", "false");
    toggle.setAttribute("aria-label", "Open navigation");
  }

  if (nav && toggle) {
    toggle.addEventListener("click", function () {
      var open = nav.classList.toggle("is-open");
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
      toggle.setAttribute("aria-label", open ? "Close navigation" : "Open navigation");
    });

    nav.querySelectorAll("a").forEach(function (link) {
      link.addEventListener("click", closeNav);
    });

    nav.querySelectorAll("details").forEach(function (details) {
      details.addEventListener("toggle", function () {
        if (!details.open) return;
        nav.querySelectorAll("details").forEach(function (other) {
          if (other !== details) other.open = false;
        });
      });
    });
  }

  document.addEventListener("click", function (event) {
    if (!header || header.contains(event.target)) return;
    closeNav();
    header.querySelectorAll("details[open]").forEach(function (details) { details.open = false; });
  });

  document.addEventListener("keydown", function (event) {
    if (event.key !== "Escape") return;
    closeNav();
    if (header) header.querySelectorAll("details[open]").forEach(function (details) { details.open = false; });
  });

  document.querySelectorAll("[data-og-year]").forEach(function (node) {
    node.textContent = String(new Date().getFullYear());
  });

  var footerWordmarks = Array.from(document.querySelectorAll("[data-og-footer-wordmark]"));
  if (footerWordmarks.length) {
    var reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var wordmarkFrame = 0;

    function revealFooterWordmarks() {
      wordmarkFrame = 0;
      footerWordmarks.forEach(function (wordmark) {
        var fill = wordmark.querySelector("[data-og-footer-wordmark-fill]");
        var footer = wordmark.closest("footer");
        if (!fill || !footer) return;

        var progress = 1;
        if (!reducedMotion) {
          var rect = footer.getBoundingClientRect();
          var viewportHeight = window.innerHeight || document.documentElement.clientHeight;
          var travel = Math.max(1, rect.height - viewportHeight * 0.25);
          progress = Math.max(0, Math.min(1, (viewportHeight * 0.75 - rect.top) / travel));
        }
        fill.style.clipPath = "inset(0% " + ((1 - progress) * 100).toFixed(3) + "% 0% 0%)";
        wordmark.dataset.ogReveal = progress.toFixed(3);
      });
    }

    function requestWordmarkReveal() {
      if (wordmarkFrame) return;
      wordmarkFrame = window.requestAnimationFrame(revealFooterWordmarks);
    }

    revealFooterWordmarks();
    window.addEventListener("scroll", requestWordmarkReveal, { passive: true });
    window.addEventListener("resize", requestWordmarkReveal);
    window.addEventListener("load", requestWordmarkReveal, { once: true });
  }

  document.addEventListener("click", function (event) {
    var link = event.target.closest("a[data-og-link]");
    if (!link) return;
    window.OmegaAcquisition.track("site_navigation_click", {
      navigation_area: link.dataset.ogArea || "unknown",
      navigation_link: link.dataset.ogLink || "unknown"
    });
  });
})();
