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

  document.querySelectorAll("[data-print-checklist]").forEach(function (button) {
    button.addEventListener("click", function () {
      trackEvent("procurement_checklist_print");
      window.print();
    });
  });

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

    var controller = ("AbortController" in window) ? new AbortController() : null;
    var timer = controller ? setTimeout(function () { controller.abort(); }, 15000) : null;
    try {
      var response = await fetch(form.dataset.endpoint || "/api/capacity-request", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
        signal: controller ? controller.signal : undefined
      });
      var result = await response.json().catch(function () { return {}; });
      if (!response.ok || !result.ok) throw new Error(result.error || "Submission failed");
      trackEvent("cluster_brief_submit");
      form.reset();
      setStatus(result.message || "Requirements received. Omega Gradient will follow up directly.", "success");
    } catch (error) {
      trackEvent("cluster_brief_submit_failed");
      showEmailFallback(payload);
    } finally {
      if (timer) clearTimeout(timer);
      if (submit) {
        submit.disabled = false;
        submit.textContent = defaultText;
      }
    }
  });

  // If the request endpoint fails, keep the lead: the form stays filled in and the
  // buyer gets a pre-filled email containing the full brief.
  function showEmailFallback(payload) {
    if (!status) return;
    var address = "tausif@omegagradient.com";
    var body = [
      "Name: " + payload.full_name,
      "Company: " + payload.company,
      "Email: " + payload.email,
      "Phone: " + (payload.phone || "Not specified"),
      "",
      payload.requirements
    ].join("\n").slice(0, 1800);
    var link = document.createElement("a");
    link.href = "mailto:" + address +
      "?subject=" + encodeURIComponent("Reserved cluster brief: " + (payload.company || payload.full_name)) +
      "&body=" + encodeURIComponent(body);
    link.textContent = "Email the brief to " + address;
    link.style.textDecoration = "underline";
    link.style.color = "inherit";
    setStatus("The form could not be sent just now, but your brief is still filled in. ", "error");
    status.appendChild(link);
    status.appendChild(document.createTextNode(" and we'll follow up directly."));
  }
})();
