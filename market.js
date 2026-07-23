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
      '<p class="modal-sub" id="si-sub">Enter your email and we’ll send a one-time code. No password needed.</p>' +
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

    const sub = overlay.querySelector("#si-sub");
    const EMAIL_SUB = "Enter your email and we’ll send a one-time code. No password needed.";

    function reset() {
      stage = "email";
      overlay.querySelector("#si-email-field").style.display = "";
      overlay.querySelector("#si-code-field").style.display = "none";
      submit.textContent = "Send code";
      sub.textContent = EMAIL_SUB;
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
          sub.textContent = "We sent a 6-digit code to " + email + ". It expires in 15 minutes.";
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
    api, money, toast, requireSignIn, me, signOut, openCredits,
    timeAgo, fmtDuration, sshKeygenSupported, generateSshKey, downloadText,
    hasToken: () => Boolean(token()),
  };
})();
