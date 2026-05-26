/* ============================================================
   Omega Gradient — interactions
   Live market feed · world map · drawer · scroll motion
   ============================================================ */

const mapPins = [...document.querySelectorAll(".map-pin")];
const mapRegion = document.querySelector("#mapRegion");
const mapGpus = document.querySelector("#mapGpus");
const mapModel = document.querySelector("#mapModel");
const mapSignal = document.querySelector("#mapSignal");
const mapConfidence = document.querySelector("#mapConfidence");
const gpuMarketCards = document.querySelector("#gpuMarketCards");
const heroFeedRows = document.querySelector("#heroFeedRows");
const heroFeedFreshness = document.querySelector("#heroFeedFreshness");
const feedFreshness = document.querySelector("#feedFreshness");
const feedSignalCount = document.querySelector("#feedSignalCount");
const gpuDrawer = document.querySelector("#gpuDrawer");
const drawerClose = document.querySelector("#drawerClose");
const drawerTitle = document.querySelector("#drawerTitle");
const drawerMetrics = document.querySelector("#drawerMetrics");
const drawerAvailability = document.querySelector("#drawerAvailability");
const drawerModels = document.querySelector("#drawerModels");
const drawerCta = document.querySelector("#drawerCta");

let publicMarketFeed = window.OMEGA_GPU_MARKET || null;

/* ---- formatting helpers --------------------------------------------- */
function money(value) {
  if (value === null || value === undefined) return "Quote";
  return `$${Number(value).toFixed(2)}`;
}

function pluralizeGpu(value) {
  if (/s$/i.test(value)) return value;
  return `${value}s`;
}

function priceRange(row) {
  if (row.min_price_per_gpu_hour === null || row.max_price_per_gpu_hour === null) {
    return "Price source pending";
  }
  if (row.min_price_per_gpu_hour === row.max_price_per_gpu_hour) {
    return `${money(row.min_price_per_gpu_hour)}/GPU-hr observed`;
  }
  return `${money(row.min_price_per_gpu_hour)}-${money(row.max_price_per_gpu_hour)}/GPU-hr observed`;
}

function marketBadge(label) {
  const badge = document.createElement("span");
  badge.className = "market-badge";
  badge.textContent = label;
  return badge;
}

function liveLabel(text) {
  return `<i></i>${text}`;
}

/* ---- world map ------------------------------------------------------ */
function activatePin(pin) {
  mapPins.forEach((item) => item.classList.toggle("active", item === pin));
  const region = publicMarketFeed?.region_market?.find((item) => item.id === pin.dataset.regionId);
  const gpus = region?.gpus?.length
    ? region.gpus.map(pluralizeGpu).join(", ")
    : pin.dataset.gpus;

  mapRegion.textContent = region?.label || pin.dataset.region;
  mapGpus.textContent = gpus;
  mapModel.textContent = region?.channel_summary || pin.dataset.model;
  if (mapSignal) mapSignal.textContent = region ? `${region.supply_source_count} sources` : "Pending";
  if (mapConfidence) mapConfidence.textContent = region?.confidence || "Pending";
}

mapPins.forEach((pin) => {
  pin.addEventListener("pointerenter", () => activatePin(pin));
  pin.addEventListener("focus", () => activatePin(pin));
  pin.addEventListener("click", () => activatePin(pin));
});

/* ---- supply-network routes between map nodes ------------------------ */
/* Region pairs that form the visible compute-supply mesh. */
const ROUTE_EDGES = [
  ["us-west", "us-central"], ["us-central", "us-east"], ["us-east", "canada"],
  ["us-west", "canada"], ["us-east", "uk"], ["us-east", "brazil"],
  ["uk", "germany"], ["uk", "france"], ["germany", "france"], ["france", "spain"],
  ["germany", "nordics"], ["uk", "nordics"], ["germany", "india"],
  ["us-west", "japan"], ["japan", "taiwan"], ["taiwan", "hong-kong"],
  ["hong-kong", "singapore"], ["singapore", "india"], ["singapore", "malaysia"],
  ["singapore", "indonesia"], ["hong-kong", "philippines"], ["singapore", "australia"],
  ["india", "malaysia"], ["japan", "hong-kong"],
];

const ROUTE_COLORS = [
  "rgba(85, 240, 213, 0.62)",
  "rgba(169, 139, 255, 0.54)",
  "rgba(147, 255, 186, 0.52)",
];

const SVG_NS = "http://www.w3.org/2000/svg";

function buildRoutes() {
  const svg = document.querySelector("#mapRoutes");
  if (!svg) return;

  /* viewBox units — must match the SVG viewBox + the map stage */
  const vbWidth = 1000;
  const vbHeight = 520;

  /* read each pin's CSS-percentage position into viewBox coordinates */
  const pos = {};
  for (const pin of mapPins) {
    const x = parseFloat(pin.style.getPropertyValue("--x"));
    const y = parseFloat(pin.style.getPropertyValue("--y"));
    if (Number.isFinite(x) && Number.isFinite(y)) {
      pos[pin.dataset.regionId] = { x: (x / 100) * vbWidth, y: (y / 100) * vbHeight };
    }
  }

  svg.replaceChildren();

  ROUTE_EDGES.forEach(([fromId, toId], index) => {
    const a = pos[fromId];
    const b = pos[toId];
    if (!a || !b) return;

    /* curved connector — control point bowed off the midpoint */
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const len = Math.hypot(dx, dy) || 1;
    let nx = -dy / len;
    let ny = dx / len;
    if (ny > 0) { nx = -nx; ny = -ny; } /* always bow toward the top */
    const bow = len * 0.14;
    const cx = (a.x + b.x) / 2 + nx * bow;
    const cy = (a.y + b.y) / 2 + ny * bow;
    const d =
      `M${a.x.toFixed(1)} ${a.y.toFixed(1)} ` +
      `Q${cx.toFixed(1)} ${cy.toFixed(1)} ${b.x.toFixed(1)} ${b.y.toFixed(1)}`;

    /* faint static line so the connection reads between dash gaps */
    const base = document.createElementNS(SVG_NS, "path");
    base.setAttribute("class", "route-link");
    base.setAttribute("d", d);
    svg.append(base);

    /* animated dashed flow on top */
    const flow = document.createElementNS(SVG_NS, "path");
    flow.setAttribute("class", "route");
    flow.setAttribute("d", d);
    flow.style.stroke = ROUTE_COLORS[index % ROUTE_COLORS.length];
    flow.style.animationDuration = `${(3 + (index % 5) * 0.45).toFixed(2)}s`;
    svg.append(flow);
  });

  /* a small node dot at every connected region */
  const connected = new Set(ROUTE_EDGES.flat());
  for (const id of connected) {
    const point = pos[id];
    if (!point) continue;
    const node = document.createElementNS(SVG_NS, "circle");
    node.setAttribute("class", "route-node");
    node.setAttribute("cx", point.x.toFixed(1));
    node.setAttribute("cy", point.y.toFixed(1));
    node.setAttribute("r", "2");
    svg.append(node);
  }
}

/* ---- hero live feed preview ----------------------------------------- */
function renderHeroFeed(feed) {
  if (!heroFeedRows || !feed?.gpu_market?.length) return;

  heroFeedRows.replaceChildren();
  for (const row of feed.gpu_market.slice(0, 4)) {
    const el = document.createElement("div");
    el.className = "hero-feed-row";
    const price = row.average_price_per_gpu_hour === null
      ? "Quote"
      : `${money(row.average_price_per_gpu_hour)}/hr`;
    const tag = row.supply_source_count
      ? `${row.supply_source_count} sources`
      : "Forming";
    el.innerHTML = `
      <span class="hf-name">${row.gpu_family}</span>
      <span class="hf-price">${price}</span>
      <span class="hf-tag">${tag}</span>
    `;
    heroFeedRows.append(el);
  }
}

/* ---- market snapshot cards ------------------------------------------ */
function renderGpuCards(feed) {
  if (!gpuMarketCards || !feed?.gpu_market?.length) return;

  gpuMarketCards.replaceChildren();
  for (const row of feed.gpu_market) {
    const card = document.createElement("button");
    card.className = "gpu-card";
    card.type = "button";
    card.dataset.gpuFamily = row.gpu_family;

    const sourceCount = row.supply_source_count
      ? `${row.supply_source_count} supply sources`
      : "Supply sources forming";

    const availabilityLabels = row.availability_mix.slice(0, 3).map((item) => item.label);
    const badges = document.createElement("div");
    badges.className = "badge-row";
    for (const label of availabilityLabels) badges.append(marketBadge(label));
    badges.append(marketBadge(row.confidence));

    card.innerHTML = `
      <span>${sourceCount}</span>
      <h3>${row.gpu_family}</h3>
      <div class="gpu-price">
        <strong>${money(row.average_price_per_gpu_hour)}${row.average_price_per_gpu_hour === null ? "" : "/hr"}</strong>
        <small>${priceRange(row)}</small>
      </div>
      <p>${row.deployment_models.slice(0, 2).join(" + ")}</p>
    `;
    card.append(badges);
    card.addEventListener("click", () => openGpuDrawer(row));
    gpuMarketCards.append(card);
  }
}

function renderFeedStatus(feed) {
  if (!feed) return;
  if (feedFreshness) feedFreshness.innerHTML = liveLabel(feed.freshness_label);
  if (heroFeedFreshness) heroFeedFreshness.innerHTML = liveLabel(feed.freshness_label);
  if (feedSignalCount) {
    feedSignalCount.textContent =
      `${feed.source_count_summary.registry_supplier_count} suppliers monitored with ` +
      `${feed.source_count_summary.public_price_sources} public price sources`;
  }

  /* keep the hero stat consistent with the feed */
  const supplierStat = document.querySelector('[data-count]');
  if (supplierStat && feed.source_count_summary?.registry_supplier_count) {
    supplierStat.dataset.count = feed.source_count_summary.registry_supplier_count;
  }
}

/* ---- gpu drawer ----------------------------------------------------- */
function metric(label, value) {
  return `<div><dt>${label}</dt><dd>${value}</dd></div>`;
}

function openGpuDrawer(row) {
  if (!gpuDrawer || !drawerTitle || !drawerMetrics || !drawerAvailability || !drawerModels) return;

  drawerTitle.textContent = `${row.gpu_family} market source`;
  drawerMetrics.innerHTML = `
    ${metric("Average", `${money(row.average_price_per_gpu_hour)}${row.average_price_per_gpu_hour === null ? "" : "/GPU-hr"}`)}
    ${metric("Observed range", row.min_price_per_gpu_hour === null ? "Quote required" : `${money(row.min_price_per_gpu_hour)}-${money(row.max_price_per_gpu_hour)}`)}
    ${metric("Supply sources", row.supply_source_count)}
    ${metric("Confidence", row.confidence)}
  `;

  drawerAvailability.replaceChildren();
  if (row.availability_mix.length) {
    for (const item of row.availability_mix) {
      drawerAvailability.append(marketBadge(`${item.label}: ${item.count}`));
    }
  } else {
    drawerAvailability.append(marketBadge("Availability under review"));
  }

  drawerModels.replaceChildren();
  for (const model of row.deployment_models) {
    const item = document.createElement("li");
    item.textContent = model;
    drawerModels.append(item);
  }

  if (drawerCta) drawerCta.href = `#contact?gpu=${encodeURIComponent(row.gpu_family)}`;
  if (typeof gpuDrawer.showModal === "function") gpuDrawer.showModal();
  else gpuDrawer.setAttribute("open", "");
}

function closeGpuDrawer() {
  if (!gpuDrawer) return;
  if (typeof gpuDrawer.close === "function") gpuDrawer.close();
  else gpuDrawer.removeAttribute("open");
}

drawerClose?.addEventListener("click", closeGpuDrawer);
gpuDrawer?.addEventListener("click", (event) => {
  if (event.target === gpuDrawer) closeGpuDrawer();
});
window.addEventListener("keydown", (event) => {
  if (event.key === "Escape") closeGpuDrawer();
});

/* ---- load the public market feed ------------------------------------ */
async function loadMarketFeed() {
  if (!publicMarketFeed) {
    try {
      const response = await fetch("./data/public_gpu_market.json", { cache: "no-store" });
      if (response.ok) publicMarketFeed = await response.json();
    } catch {
      publicMarketFeed = null;
    }
  }

  if (!publicMarketFeed) {
    if (feedFreshness) feedFreshness.innerHTML = liveLabel("Feed unavailable");
    if (heroFeedFreshness) heroFeedFreshness.innerHTML = liveLabel("Feed unavailable");
    if (feedSignalCount) feedSignalCount.textContent = "Refresh scheduled daily";
    return;
  }

  renderFeedStatus(publicMarketFeed);
  renderHeroFeed(publicMarketFeed);
  renderGpuCards(publicMarketFeed);
  runCountUps();
  const activePin = document.querySelector(".map-pin.active") || mapPins[0];
  if (activePin) activatePin(activePin);
}

/* ---- scroll reveal -------------------------------------------------- */
function initReveal() {
  const items = [...document.querySelectorAll("[data-reveal]")];

  /* stagger siblings that share a parent */
  const seen = new Map();
  for (const el of items) {
    const parent = el.parentElement;
    const index = seen.get(parent) || 0;
    el.style.setProperty("--reveal-delay", `${Math.min(index, 5) * 70}ms`);
    seen.set(parent, index + 1);
  }

  if (!("IntersectionObserver" in window)) {
    items.forEach((el) => el.classList.add("is-visible"));
    return;
  }

  const observer = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      }
    }
  }, { threshold: 0.12, rootMargin: "0px 0px -8% 0px" });

  items.forEach((el) => observer.observe(el));
}

/* ---- stat count-up -------------------------------------------------- */
function animateCount(el) {
  const target = Number(el.dataset.count);
  const suffix = el.dataset.countSuffix || "";
  if (!Number.isFinite(target)) return;

  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduce) {
    el.textContent = `${target}${suffix}`;
    return;
  }

  const duration = 1100;
  const start = performance.now();
  function tick(now) {
    const p = Math.min((now - start) / duration, 1);
    const eased = 1 - Math.pow(1 - p, 3);
    el.textContent = `${Math.round(target * eased)}${suffix}`;
    if (p < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

let countsDone = false;
function runCountUps() {
  if (countsDone) return;
  const counters = [...document.querySelectorAll("[data-count]")];
  if (!counters.length) return;

  if (!("IntersectionObserver" in window)) {
    counters.forEach(animateCount);
    countsDone = true;
    return;
  }

  const observer = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (entry.isIntersecting) {
        animateCount(entry.target);
        observer.unobserve(entry.target);
      }
    }
  }, { threshold: 0.6 });

  counters.forEach((el) => observer.observe(el));
  countsDone = true;
}

/* ---- header shrink on scroll ---------------------------------------- */
function initHeader() {
  const header = document.querySelector("#siteHeader");
  if (!header) return;
  const onScroll = () => header.classList.toggle("scrolled", window.scrollY > 24);
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });
}

/* ---- capacity request ----------------------------------------------- */
const THANK_YOU_MESSAGE = "Thanks for your submission. We will get back to you shortly.";

function setFormStatus(statusEl, message, tone = "neutral") {
  if (!statusEl) return;
  statusEl.textContent = message;
  statusEl.dataset.tone = tone;
}

function initCapacityForm() {
  const form = document.querySelector("#capacityForm");
  if (!form) return;
  const statusEl = document.querySelector("#capacityFormStatus");
  const submitButton = form.querySelector('button[type="submit"]');
  const defaultButtonText = submitButton?.textContent || "Start sourcing";

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const data = new FormData(form);
    const endpoint = form.dataset.endpoint || "/api/capacity-request";
    const payload = {
      full_name: data.get("full-name") || "",
      company: data.get("company") || "",
      email: data.get("email") || "",
      phone: data.get("phone") || "",
      need: data.get("need") || "",
      requirements: data.get("requirements") || "",
      website: data.get("website") || "",
      page_url: window.location.href
    };

    if (submitButton) {
      submitButton.disabled = true;
      submitButton.textContent = "Submitting...";
    }
    setFormStatus(statusEl, "Submitting your request...", "neutral");

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload)
      });
      const result = await response.json().catch(() => ({}));

      if (!response.ok || !result.ok) {
        throw new Error(result.error || "Submission failed");
      }

      form.reset();
      setFormStatus(statusEl, result.message || THANK_YOU_MESSAGE, "success");
      statusEl?.focus?.();
    } catch (error) {
      setFormStatus(
        statusEl,
        "Something went wrong. Please try again in a moment.",
        "error"
      );
      console.error("capacity request failed", error);
    } finally {
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent = defaultButtonText;
      }
    }
  });
}

/* ---- init ----------------------------------------------------------- */
const yearEl = document.querySelector("#footerYear");
if (yearEl) yearEl.textContent = new Date().getFullYear();

initHeader();
initReveal();
runCountUps();
buildRoutes();
loadMarketFeed();
initCapacityForm();
