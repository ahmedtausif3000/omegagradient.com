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

  var trackingEndpoint = "https://track.omegagradient.com/g/events";
  document.addEventListener("click", function (event) {
    var link = event.target.closest("a[data-og-link]");
    if (!link) return;
    var canonical = document.querySelector('link[rel="canonical"]');
    var payload = JSON.stringify({
      event_type: "site_navigation_click",
      source_url: canonical ? canonical.href : window.location.href.split("#")[0],
      navigation_area: link.dataset.ogArea || "unknown",
      navigation_link: link.dataset.ogLink || "unknown"
    });
    if (navigator.sendBeacon) {
      navigator.sendBeacon(trackingEndpoint, new Blob([payload], { type: "text/plain;charset=UTF-8" }));
    }
  });
})();
