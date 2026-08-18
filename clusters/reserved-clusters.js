(function () {
  "use strict";

  var nav = document.querySelector(".primary-nav");
  var toggle = document.querySelector(".nav-toggle");
  if (nav && toggle) {
    toggle.addEventListener("click", function () {
      var open = nav.classList.toggle("open");
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
      toggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
    });
    nav.querySelectorAll("a").forEach(function (link) {
      link.addEventListener("click", function () {
        nav.classList.remove("open");
        toggle.setAttribute("aria-expanded", "false");
      });
    });
  }

  document.querySelectorAll("[data-year]").forEach(function (node) {
    node.textContent = String(new Date().getFullYear());
  });

  var trackingEndpoint = "https://track.omegagradient.com/g/events";
  var canonicalNode = document.querySelector('link[rel="canonical"]');
  var canonicalUrl = canonicalNode ? canonicalNode.href : window.location.href.split("#")[0];
  var sourcePath = "/";
  var referrerOrigin = "";
  try { sourcePath = new URL(canonicalUrl, window.location.origin).pathname; } catch (_) {}
  try { referrerOrigin = document.referrer ? new URL(document.referrer).origin : ""; } catch (_) {}

  function trackEvent(eventType) {
    var params = new URLSearchParams(window.location.search);
    var payload = JSON.stringify({
      event_type: eventType,
      source_url: canonicalUrl,
      referrer: referrerOrigin,
      utm_source: params.get("utm_source") || "",
      utm_medium: params.get("utm_medium") || "",
      utm_campaign: params.get("utm_campaign") || "",
      utm_content: params.get("utm_content") || "",
      content_asset_id: sourcePath
    });

    if (navigator.sendBeacon) {
      var queued = navigator.sendBeacon(trackingEndpoint, new Blob([payload], { type: "text/plain;charset=UTF-8" }));
      if (queued) return;
    }
    fetch(trackingEndpoint, {
      method: "POST",
      body: payload,
      keepalive: true,
      credentials: "omit"
    }).catch(function () {});
  }

  trackEvent("reserved_page_view");

  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var revealNodes = document.querySelectorAll("[data-reveal]");
  if (reduced || !("IntersectionObserver" in window)) {
    revealNodes.forEach(function (node) { node.classList.add("visible"); });
  } else {
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("visible");
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.08 });
    revealNodes.forEach(function (node) { observer.observe(node); });
  }

  var form = document.querySelector("#clusterRequestForm");
  if (!form) return;
  var status = document.querySelector("#clusterRequestStatus");
  var submit = form.querySelector('button[type="submit"]');
  var defaultText = submit ? submit.textContent : "Send requirements";
  var briefStarted = false;

  form.addEventListener("focusin", function (event) {
    if (briefStarted || !event.target.matches("input, select, textarea") || event.target.name === "website") return;
    briefStarted = true;
    trackEvent("cluster_brief_start");
  });

  function setStatus(message, tone) {
    if (!status) return;
    status.textContent = message;
    status.dataset.tone = tone || "neutral";
  }

  form.addEventListener("submit", async function (event) {
    event.preventDefault();
    if (!form.checkValidity()) {
      setStatus("Please complete the required fields.", "error");
      form.reportValidity();
      return;
    }

    var data = new FormData(form);
    if (data.get("website")) return;
    var details = [
      "GPU: " + (data.get("gpu") || "Not specified"),
      "Count: " + (data.get("gpu-count") || "Not specified"),
      "Region: " + (data.get("region") || "Flexible"),
      "Start: " + (data.get("start-date") || "Not specified"),
      "Term: " + (data.get("term") || "Not specified"),
      "Workload: " + (data.get("workload") || "Not specified"),
      "Requirements: " + (data.get("requirements") || "None supplied")
    ].join("\n");

    var payload = {
      full_name: data.get("full-name") || "",
      company: data.get("company") || "",
      email: data.get("email") || "",
      phone: data.get("phone") || "",
      need: "Reserved GPU cluster",
      requirements: details,
      website: data.get("website") || "",
      page_url: window.location.href
    };

    if (submit) {
      submit.disabled = true;
      submit.textContent = "Submitting...";
    }
    setStatus("Submitting your cluster brief...", "neutral");

    try {
      var response = await fetch(form.dataset.endpoint || "/api/capacity-request", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload)
      });
      var result = await response.json().catch(function () { return {}; });
      if (!response.ok || !result.ok) throw new Error(result.error || "Submission failed");
      trackEvent("cluster_brief_submit");
      form.reset();
      setStatus(result.message || "Requirements received. Omega Gradient will follow up directly.", "success");
    } catch (error) {
      setStatus("The form could not be submitted. Email tausif@omegagradient.com instead.", "error");
    } finally {
      if (submit) {
        submit.disabled = false;
        submit.textContent = defaultText;
      }
    }
  });
})();
