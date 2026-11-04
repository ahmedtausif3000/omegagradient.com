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
  const idempotencyKey = () =>
    (crypto.randomUUID ? crypto.randomUUID() : "og-" + Date.now() + "-" + Array.from(crypto.getRandomValues(new Uint32Array(4))).join("-"));

  let toastTimer;
  function toast(message, isError) {
    let el = document.querySelector(".toast");
    if (!el) {
      el = document.createElement("div");
      el.className = "toast";
      el.setAttribute("role", "status");
      el.setAttribute("aria-live", "polite");
      document.body.appendChild(el);
    }
    const toastHost = document.querySelector("dialog.overlay[open]") || document.body;
    if (el.parentNode !== toastHost) toastHost.appendChild(el);
    el.textContent = message;
    el.classList.toggle("err", Boolean(isError));
    el.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove("show"), 4200);
  }

  /* Native dialogs provide top-layer rendering, inert backgrounds, and Tab containment. */
  let dialogSequence = 0;
  function createDialog(dialog, options = {}) {
    const heading = dialog.querySelector("h2");
    if (heading) {
      if (!heading.id) heading.id = "og-dialog-title-" + (++dialogSequence);
      dialog.setAttribute("aria-labelledby", heading.id);
    }
    dialog.setAttribute("aria-modal", "true");
    const description = dialog.querySelector(".modal-sub");
    if (description) {
      if (!description.id) description.id = "og-dialog-description-" + (++dialogSequence);
      dialog.setAttribute("aria-describedby", description.id);
    }
    let returnFocus = null;
    let previousOverflow = "";
    let active = false;
    function finish() {
      if (!active) return;
      active = false;
      document.body.style.overflow = previousOverflow;
      if (returnFocus && returnFocus.isConnected && !returnFocus.closest("[inert]")) returnFocus.focus();
      if (options.onClose) options.onClose();
    }
    function close() {
      if (!dialog.open) return;
      dialog.close();
      finish();
    }
    dialog.addEventListener("close", () => { if (!dialog.open) finish(); });
    dialog.addEventListener("cancel", (event) => {
      event.preventDefault();
      close();
    });
    return {
      open() {
        if (dialog.open) return;
        returnFocus = document.activeElement;
        previousOverflow = document.body.style.overflow;
        dialog.showModal();
        active = true;
        document.body.style.overflow = "hidden";
        const target = options.initialFocus && dialog.querySelector(options.initialFocus);
        if (target) target.focus();
      },
      close,
    };
  }

  /* ---- sign-in modal (email → 6-digit code) ---- */
  function buildSignInModal() {
    const overlay = document.createElement("dialog");
    overlay.className = "overlay";
    overlay.id = "signin-overlay";
    overlay.innerHTML =
      '<form class="modal panel" id="signin-form">' +
      "<h2>Sign in to Omega Gradient</h2>" +
      '<p class="modal-sub" id="si-sub">Enter your email and we’ll send a one-time code. No password needed.</p>' +
      '<div class="field" id="si-email-field"><label for="si-email">Email</label><input type="email" id="si-email" required placeholder="you@company.com" autocomplete="email"></div>' +
      '<div class="field" id="si-code-field" style="display:none"><label for="si-code">6-digit code</label><div class="code-inputs"><input type="text" id="si-code" inputmode="numeric" autocomplete="one-time-code" pattern="[0-9]{6}" required disabled maxlength="6" placeholder="••••••"></div></div>' +
      '<div class="form-error" id="si-error" role="alert"></div>' +
      '<div class="actions"><button type="button" class="btn" id="si-cancel">Cancel</button><button type="submit" class="btn primary" id="si-submit">Send code</button></div>' +
      "</form>";
    document.body.appendChild(overlay);

    let stage = "email";
    let email = "";
    let onSuccess = null;
    let attempt = 0;

    const err = overlay.querySelector("#si-error");
    const submit = overlay.querySelector("#si-submit");

    const sub = overlay.querySelector("#si-sub");
    const EMAIL_SUB = "Enter your email and we’ll send a one-time code. No password needed.";
    const dialog = createDialog(overlay, { initialFocus: "#si-email", onClose: reset });

    function reset() {
      attempt++;
      stage = "email";
      overlay.querySelector("#si-email-field").style.display = "";
      overlay.querySelector("#si-code-field").style.display = "none";
      overlay.querySelector("#si-email").disabled = false;
      overlay.querySelector("#si-code").disabled = true;
      overlay.querySelector("#si-code").value = "";
      submit.textContent = "Send code";
      sub.textContent = EMAIL_SUB;
      err.textContent = "";
    }

    overlay.querySelector("#si-cancel").addEventListener("click", () => {
      dialog.close();
    });

    overlay.querySelector("#signin-form").addEventListener("submit", async (event) => {
      event.preventDefault();
      if (submit.disabled) return;
      const currentAttempt = attempt;
      err.textContent = "";
      submit.disabled = true;
      try {
        if (stage === "email") {
          email = overlay.querySelector("#si-email").value.trim();
          const result = await api("/auth/request", { method: "POST", body: JSON.stringify({ email }) });
          if (currentAttempt !== attempt) return;
          if (!result.ok) throw new Error(result.error || "Could not send code.");
          stage = "code";
          overlay.querySelector("#si-email").disabled = true;
          overlay.querySelector("#si-code").disabled = false;
          overlay.querySelector("#si-email-field").style.display = "none";
          overlay.querySelector("#si-code-field").style.display = "";
          submit.textContent = "Verify";
          sub.textContent = "We sent a 6-digit code to " + email + ". It expires in 15 minutes.";
          if (result.mockCode) {
            overlay.querySelector("#si-code").value = result.mockCode;
            toast("Dev mode: code auto-filled");
          }
          overlay.querySelector("#si-code").focus();
        } else {
          const code = overlay.querySelector("#si-code").value.trim();
          const result = await api("/auth/verify", { method: "POST", body: JSON.stringify({ email, code }) });
          if (currentAttempt !== attempt) return;
          localStorage.setItem(TOKEN_KEY, result.token);
          dialog.close();
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
        dialog.open();
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

  /* ---- required buyer profile + versioned policy acceptance ------------ */
  function buildOnboardingModal() {
    const overlay = document.createElement("dialog");
    overlay.className = "overlay";
    overlay.id = "onboarding-overlay";
    overlay.innerHTML =
      '<form class="modal panel onboarding-modal" id="onboarding-form">' +
      '<h2>Complete account setup</h2>' +
      '<p class="modal-sub">We need a minimal identity and workload profile before accepting funds or deploying compute.</p>' +
      '<div class="onboarding-grid">' +
      '<div class="field"><label for="ob-name">Legal name</label><input id="ob-name" maxlength="100" autocomplete="name"></div>' +
      '<div class="field"><label for="ob-org">Organization <span>(optional)</span></label><input id="ob-org" maxlength="120" autocomplete="organization"></div>' +
      '<div class="field"><label for="ob-country">Country code</label><input id="ob-country" maxlength="2" placeholder="US" autocomplete="country"></div>' +
      '<div class="field"><label for="ob-phone">Phone <span>(optional)</span></label><input id="ob-phone" maxlength="30" autocomplete="tel"></div>' +
      '</div>' +
      '<div class="field"><label for="ob-use">Intended workload</label><textarea id="ob-use" maxlength="500" rows="3" placeholder="Training, inference, fine-tuning, development…"></textarea></div>' +
      '<div id="ob-policies" class="onboarding-policies"></div>' +
      '<div class="form-error" id="ob-error" role="alert"></div>' +
      '<div class="actions"><button type="button" class="btn" id="ob-signout">Sign out</button><button type="submit" class="btn primary" id="ob-submit">Accept and continue</button></div>' +
      '</form>';
    document.body.appendChild(overlay);
    const dialog = createDialog(overlay, { initialFocus: "#ob-name" });
    let onSuccess = null;
    const policyNames = { terms: "Terms of Service", aup: "Acceptable Use Policy", privacy: "Privacy Notice", refund: "Refund Policy" };

    overlay.querySelector("#ob-signout").addEventListener("click", signOut);
    overlay.querySelector("#onboarding-form").addEventListener("submit", async (event) => {
      event.preventDefault();
      const submit = overlay.querySelector("#ob-submit");
      const error = overlay.querySelector("#ob-error");
      if (submit.disabled) return;
      error.textContent = "";
      submit.disabled = true;
      try {
        const accepted = {};
        overlay.querySelectorAll("[data-policy]").forEach((input) => { accepted[input.dataset.policy + "Accepted"] = input.checked; });
        await api("/onboarding", {
          method: "POST",
          body: JSON.stringify({
            legalName: overlay.querySelector("#ob-name").value,
            organizationName: overlay.querySelector("#ob-org").value,
            countryCode: overlay.querySelector("#ob-country").value,
            phone: overlay.querySelector("#ob-phone").value,
            intendedUse: overlay.querySelector("#ob-use").value,
            ...accepted,
          }),
        });
        dialog.close();
        toast("Account setup complete");
        document.dispatchEvent(new CustomEvent("og:onboarding-complete"));
        if (onSuccess) onSuccess();
      } catch (e) {
        error.textContent = e.message;
      } finally {
        submit.disabled = false;
      }
    });

    return {
      async open(callback, currentProfile) {
        onSuccess = callback || null;
        const profile = currentProfile || (await me());
        const urls = profile.policyUrls || {};
        const versions = profile.policyVersions || {};
        overlay.querySelector("#ob-policies").innerHTML = Object.keys(policyNames).map((policy) =>
          '<label class="check-row"><input type="checkbox" data-policy="' + policy + '"> I accept the ' +
          (urls[policy] ? '<a href="' + urls[policy] + '" target="_blank" rel="noopener">' + policyNames[policy] + '</a>' : policyNames[policy]) +
          ' <span>(' + (versions[policy] || "current") + ')</span></label>'
        ).join("");
        dialog.open();
      },
    };
  }

  let onboardingModal = null;
  async function ensureOnboarding(callback) {
    const profile = await me();
    if (!profile.signedIn) return requireSignIn(() => ensureOnboarding(callback));
    if (profile.onboardingComplete) return callback();
    if (!onboardingModal) onboardingModal = buildOnboardingModal();
    onboardingModal.open(callback, profile);
  }

  function signOut() {
    api("/auth/logout", { method: "POST" }).catch(() => {});
    localStorage.removeItem(TOKEN_KEY);
    location.reload();
  }

  /* ---- credits modal (prepaid balance; card saved for auto-top-up) ---- */
  const CREDIT_OPTIONS = [2500, 5000, 10000, 25000];

  function buildCreditsModal() {
    const overlay = document.createElement("dialog");
    overlay.className = "overlay";
    overlay.innerHTML =
      '<form class="modal panel" id="credits-form">' +
      "<h2>Add credits</h2>" +
      '<p class="modal-sub">Compute is prepaid: usage draws down your balance hourly, and we auto-top-up from your card when it runs low, so instances never stop unexpectedly. Unused credits stay on your account.</p>' +
      '<fieldset class="field"><legend>Amount</legend><div class="gpu-count-row" id="cr-options">' +
      CREDIT_OPTIONS.map((c, i) => '<button type="button" data-cents="' + c + '" aria-pressed="' + (i === 0) + '"' + (i === 0 ? ' class="on"' : "") + ">$" + c / 100 + "</button>").join("") +
      "</div></fieldset>" +
      '<div class="form-error" id="cr-error" role="alert"></div>' +
      '<div class="actions"><button type="button" class="btn" id="cr-cancel">Cancel</button><button type="submit" class="btn primary" id="cr-buy">Continue to payment</button></div>' +
      "</form>";
    document.body.appendChild(overlay);
    const dialog = createDialog(overlay, { initialFocus: "#cr-options button.on" });

    let cents = CREDIT_OPTIONS[0];
    let onSuccess = null;
    overlay.querySelector("#cr-options").addEventListener("click", (e) => {
      const btn = e.target.closest("button");
      if (!btn) return;
      overlay.querySelectorAll("#cr-options button").forEach((b) => { b.classList.remove("on"); b.setAttribute("aria-pressed", "false"); });
      btn.classList.add("on");
      btn.setAttribute("aria-pressed", "true");
      cents = Number(btn.dataset.cents);
    });
    overlay.querySelector("#cr-cancel").addEventListener("click", () => dialog.close());
    overlay.querySelector("#credits-form").addEventListener("submit", async (event) => {
      event.preventDefault();
      const err = overlay.querySelector("#cr-error");
      const buy = overlay.querySelector("#cr-buy");
      if (buy.disabled) return;
      err.textContent = "";
      buy.disabled = true;
      try {
        const result = await api("/billing/credits", {
          method: "POST",
          headers: { "Idempotency-Key": idempotencyKey() },
          body: JSON.stringify({ amountCents: cents }),
        });
        if (result.checkoutUrl) {
          location.href = result.checkoutUrl; // hosted Stripe Checkout, returns to console
          return;
        }
        dialog.close();
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
        dialog.open();
      },
    };
  }

  let creditsModal = null;
  function openCredits(callback) {
    ensureOnboarding(() => {
      if (!creditsModal) creditsModal = buildCreditsModal();
      creditsModal.open(callback);
    });
  }

  /* ---- time formatting ---- */
  function timeAgo(iso) {
    const s = Math.max(0, (Date.now() - new Date(iso)) / 1000);
    if (s < 60) return "just now";
    if (s < 3600) return Math.floor(s / 60) + "m ago";
    if (s < 86400) return Math.floor(s / 3600) + "h ago";
    return Math.floor(s / 86400) + "d ago";
  }

  function fmtDuration(seconds) {
    if (seconds == null) return "";
    const s = Math.max(0, Math.floor(seconds));
    if (s < 90) return s + "s";
    if (s < 5400) return Math.round(s / 60) + " min";
    const h = Math.floor(s / 3600);
    const m = Math.round((s % 3600) / 60);
    return h + "h" + (m ? " " + m + "m" : "");
  }

  /* ---- in-browser SSH keypair (Ed25519 via WebCrypto, OpenSSH formats) ---- */
  function sshStr(bytes) {
    const len = new Uint8Array(4);
    new DataView(len.buffer).setUint32(0, bytes.length);
    const out = new Uint8Array(4 + bytes.length);
    out.set(len, 0);
    out.set(bytes, 4);
    return out;
  }
  const ascii = (s) => new TextEncoder().encode(s);
  function concatBytes(parts) {
    const total = parts.reduce((n, p) => n + p.length, 0);
    const out = new Uint8Array(total);
    let o = 0;
    for (const p of parts) { out.set(p, o); o += p.length; }
    return out;
  }
  function b64(bytes) {
    let bin = "";
    for (const b of bytes) bin += String.fromCharCode(b);
    return btoa(bin);
  }

  function sshKeygenSupported() {
    return Boolean(window.crypto && crypto.subtle && crypto.subtle.generateKey);
  }

  // Returns { publicKey: "ssh-ed25519 AAAA... comment", privateKeyPem: "-----BEGIN OPENSSH..." }.
  // Throws if the browser can't do Ed25519 (caller should hide the feature).
  async function generateSshKey(comment) {
    const pair = await crypto.subtle.generateKey("Ed25519", true, ["sign", "verify"]);
    const pub = new Uint8Array(await crypto.subtle.exportKey("raw", pair.publicKey));
    // Ed25519 PKCS8 wraps the 32-byte seed as its trailing OCTET STRING.
    const pkcs8 = new Uint8Array(await crypto.subtle.exportKey("pkcs8", pair.privateKey));
    const seed = pkcs8.slice(-32);

    const keyType = ascii("ssh-ed25519");
    const publicBlob = concatBytes([sshStr(keyType), sshStr(pub)]);
    const publicLine = "ssh-ed25519 " + b64(publicBlob) + " " + (comment || "omega-gradient");

    // openssh-key-v1, cipher/kdf "none", one key. Private section is padded to the
    // 8-byte block size with 1,2,3... per the spec.
    const check = new Uint8Array(4);
    crypto.getRandomValues(check);
    let priv = concatBytes([
      check, check,
      sshStr(keyType), sshStr(pub),
      sshStr(concatBytes([seed, pub])),
      sshStr(ascii(comment || "omega-gradient")),
    ]);
    const pad = [];
    for (let i = 1; priv.length % 8 !== 0; i++) { pad.push(i); priv = concatBytes([priv, new Uint8Array([i])]); }
    const blob = concatBytes([
      ascii("openssh-key-v1\0"),
      sshStr(ascii("none")), sshStr(ascii("none")), sshStr(new Uint8Array(0)),
      new Uint8Array([0, 0, 0, 1]),
      sshStr(publicBlob),
      sshStr(priv),
    ]);
    const body = b64(blob).replace(/(.{70})/g, "$1\n");
    const privateKeyPem =
      "-----BEGIN OPENSSH PRIVATE KEY-----\n" + body + (body.endsWith("\n") ? "" : "\n") + "-----END OPENSSH PRIVATE KEY-----\n";
    return { publicKey: publicLine, privateKeyPem };
  }

  function downloadText(filename, text) {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([text], { type: "application/octet-stream" }));
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  }

  window.OG = {
    api, money, toast, createDialog, requireSignIn, ensureOnboarding, me, signOut, openCredits,
    timeAgo, fmtDuration, sshKeygenSupported, generateSshKey, downloadText, idempotencyKey,
    hasToken: () => Boolean(token()),
  };
})();
