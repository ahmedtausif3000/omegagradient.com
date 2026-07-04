/* Omega Gradient Compute — shared client (auth, API, toast, sign-in modal). */
(function () {
  const local = ["localhost", "127.0.0.1"].includes(location.hostname);
  const API = (local ? "http://localhost:8787" : "") + "/api/market";
  const TOKEN_KEY = "og_market_token";

  function token() {
    return localStorage.getItem(TOKEN_KEY) || "";
  }

  async function api(path, options = {}) {
    const headers = { "Content-Type": "application/json", ...(options.headers || {}) };
    const t = token();
    if (t) headers.Authorization = "Bearer " + t;
    const response = await fetch(API + path, { ...options, headers });
    let data = {};
    try {
      data = await response.json();
    } catch (_) {}
    if (!response.ok) {
      const error = new Error(data.error || "Request failed (" + response.status + ")");
      error.status = response.status;
      error.data = data;
      throw error;
    }
    return data;
  }

  const money = (cents) => "$" + (cents / 100).toFixed(2);

  let toastTimer;
  function toast(message, isError) {
    let el = document.querySelector(".toast");
    if (!el) {
      el = document.createElement("div");
      el.className = "toast";
      document.body.appendChild(el);
    }
    el.textContent = message;
    el.classList.toggle("err", Boolean(isError));
    el.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove("show"), 4200);
  }

  /* ---- sign-in modal (email → 6-digit code) ---- */
  function buildSignInModal() {
    const overlay = document.createElement("div");
    overlay.className = "overlay";
    overlay.id = "signin-overlay";
    overlay.innerHTML =
      '<div class="modal panel">' +
      "<h2>Sign in to Omega Gradient</h2>" +
      '<p class="modal-sub">Enter your email and we’ll send a one-time code. No password needed.</p>' +
      '<div class="field" id="si-email-field"><label>Email</label><input type="email" id="si-email" placeholder="you@company.com" autocomplete="email"></div>' +
      '<div class="field" id="si-code-field" style="display:none"><label>6-digit code</label><div class="code-inputs"><input type="text" id="si-code" inputmode="numeric" maxlength="6" placeholder="••••••"></div></div>' +
      '<div class="form-error" id="si-error"></div>' +
      '<div class="actions"><button class="btn" id="si-cancel">Cancel</button><button class="btn primary" id="si-submit">Send code</button></div>' +
      "</div>";
    document.body.appendChild(overlay);

    let stage = "email";
    let email = "";
    let onSuccess = null;

    const err = overlay.querySelector("#si-error");
    const submit = overlay.querySelector("#si-submit");

    function reset() {
      stage = "email";
      overlay.querySelector("#si-email-field").style.display = "";
      overlay.querySelector("#si-code-field").style.display = "none";
      submit.textContent = "Send code";
      err.textContent = "";
    }

    overlay.querySelector("#si-cancel").addEventListener("click", () => {
      overlay.classList.remove("open");
      reset();
    });

    submit.addEventListener("click", async () => {
      err.textContent = "";
      submit.disabled = true;
      try {
        if (stage === "email") {
          email = overlay.querySelector("#si-email").value.trim();
          const result = await api("/auth/request", { method: "POST", body: JSON.stringify({ email }) });
          if (!result.ok) throw new Error(result.error || "Could not send code.");
          stage = "code";
          overlay.querySelector("#si-email-field").style.display = "none";
          overlay.querySelector("#si-code-field").style.display = "";
          submit.textContent = "Verify";
          if (result.mockCode) {
            overlay.querySelector("#si-code").value = result.mockCode;
            toast("Dev mode: code auto-filled");
          }
          overlay.querySelector("#si-code").focus();
        } else {
          const code = overlay.querySelector("#si-code").value.trim();
          const result = await api("/auth/verify", { method: "POST", body: JSON.stringify({ email, code }) });
          localStorage.setItem(TOKEN_KEY, result.token);
          overlay.classList.remove("open");
          reset();
          toast("Signed in as " + result.email);
          if (onSuccess) onSuccess();
          document.dispatchEvent(new CustomEvent("og:signed-in"));
        }
      } catch (e) {
        err.textContent = e.message;
      } finally {
        submit.disabled = false;
      }
    });

    return {
      open(callback) {
        onSuccess = callback || null;
        overlay.classList.add("open");
        overlay.querySelector(stage === "email" ? "#si-email" : "#si-code").focus();
      },
    };
  }

  let signInModal = null;
  function requireSignIn(callback) {
    if (!signInModal) signInModal = buildSignInModal();
    if (token()) return callback();
    signInModal.open(callback);
  }

  async function me() {
    try {
      return await api("/me");
    } catch (_) {
      return { signedIn: false };
    }
  }

  function signOut() {
    api("/auth/logout", { method: "POST" }).catch(() => {});
    localStorage.removeItem(TOKEN_KEY);
    location.reload();
  }

  /* ---- credits modal (prepaid balance; card saved for auto-top-up) ---- */
  const CREDIT_OPTIONS = [2500, 5000, 10000, 25000];

  function buildCreditsModal() {
    const overlay = document.createElement("div");
    overlay.className = "overlay";
    overlay.innerHTML =
      '<div class="modal panel">' +
      "<h2>Add credits</h2>" +
      '<p class="modal-sub">Compute is prepaid: usage draws down your balance hourly, and we auto-top-up from your card when it runs low, so instances never stop unexpectedly. Unused credits stay on your account.</p>' +
      '<div class="field"><label>Amount</label><div class="gpu-count-row" id="cr-options">' +
      CREDIT_OPTIONS.map((c, i) => '<button data-cents="' + c + '"' + (i === 0 ? ' class="on"' : "") + ">$" + c / 100 + "</button>").join("") +
      "</div></div>" +
      '<div class="form-error" id="cr-error"></div>' +
      '<div class="actions"><button class="btn" id="cr-cancel">Cancel</button><button class="btn primary" id="cr-buy">Continue to payment</button></div>' +
      "</div>";
    document.body.appendChild(overlay);

    let cents = CREDIT_OPTIONS[0];
    let onSuccess = null;
    overlay.querySelector("#cr-options").addEventListener("click", (e) => {
      const btn = e.target.closest("button");
      if (!btn) return;
      overlay.querySelectorAll("#cr-options button").forEach((b) => b.classList.remove("on"));
      btn.classList.add("on");
      cents = Number(btn.dataset.cents);
    });
    overlay.querySelector("#cr-cancel").addEventListener("click", () => overlay.classList.remove("open"));
    overlay.querySelector("#cr-buy").addEventListener("click", async () => {
      const err = overlay.querySelector("#cr-error");
      const buy = overlay.querySelector("#cr-buy");
      err.textContent = "";
      buy.disabled = true;
      try {
        const result = await api("/billing/credits", { method: "POST", body: JSON.stringify({ amountCents: cents }) });
        if (result.checkoutUrl) {
          location.href = result.checkoutUrl; // hosted Stripe Checkout, returns to console
          return;
        }
        overlay.classList.remove("open");
        toast((result.mock ? "Dev mode: " : "") + "Credits added — $" + (result.creditedCents / 100).toFixed(2));
        if (onSuccess) onSuccess();
        document.dispatchEvent(new CustomEvent("og:credits-changed"));
      } catch (e) {
        err.textContent = e.message;
      } finally {
        buy.disabled = false;
      }
    });
    return {
      open(callback) {
        onSuccess = callback || null;
        overlay.classList.add("open");
      },
    };
  }

  let creditsModal = null;
  function openCredits(callback) {
    if (!creditsModal) creditsModal = buildCreditsModal();
    creditsModal.open(callback);
  }

  window.OG = { api, money, toast, requireSignIn, me, signOut, openCredits, hasToken: () => Boolean(token()) };
})();
