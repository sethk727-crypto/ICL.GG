/* ============================================================
   ICL.GG — core.js
   Context store, chrome wiring, modals, toasts, endowed-progress
   verification flow, low-power performance guard.
   No dependencies. Everything hangs off window.ICL.
   ============================================================ */
(function () {
  "use strict";

  const $ = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));
  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- Game context (fixed anchor, IA §5) ---------- */

  const CTX_KEY = "icl.context";
  const CTX_META = {
    fps: { label: "Tactical FPS", room: "Combat Room", metric: "ACS" },
    chess: { label: "Classic Chess", room: "Challenger Hall", metric: "ELO" },
  };

  /* storage can throw in private/embedded contexts — degrade quietly */
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch { /* session-only */ } },
  };

  function getContext() {
    const fromQuery = new URLSearchParams(location.search).get("ctx");
    if (fromQuery && CTX_META[fromQuery]) return fromQuery;
    const stored = store.get(CTX_KEY);
    return CTX_META[stored] ? stored : "fps";
  }

  function setContext(ctx, opts) {
    if (!CTX_META[ctx]) return;
    store.set(CTX_KEY, ctx);
    document.documentElement.setAttribute("data-context", ctx);
    $$("[data-ctx-btn]").forEach((b) => {
      b.setAttribute("aria-pressed", String(b.dataset.ctxBtn === ctx));
    });
    if (!(opts && opts.silent)) {
      document.dispatchEvent(new CustomEvent("icl:context", { detail: { ctx } }));
    }
  }

  function wireContextToggle() {
    $$("[data-ctx-btn]").forEach((b) => {
      b.addEventListener("click", () => setContext(b.dataset.ctxBtn));
    });
  }

  /* ---------- Modals ---------- */

  let openVeil = null;

  function modalOpen(id) {
    const veil = typeof id === "string" ? $("#" + id) : id;
    if (!veil) return;
    veil.classList.add("open");
    veil.removeAttribute("aria-hidden");
    openVeil = veil;
    const focusable = $("button, a, input, select, [tabindex]", veil);
    if (focusable) focusable.focus({ preventScroll: true });
    document.body.style.overflow = "hidden";
  }

  function modalClose(veil) {
    veil = veil || openVeil;
    if (!veil) return;
    veil.classList.remove("open");
    veil.setAttribute("aria-hidden", "true");
    if (openVeil === veil) openVeil = null;
    document.body.style.overflow = "";
    veil.dispatchEvent(new CustomEvent("icl:modal-close"));
  }

  function wireModals() {
    document.addEventListener("click", (e) => {
      const opener = e.target.closest("[data-modal-open]");
      if (opener) { modalOpen(opener.dataset.modalOpen); return; }
      const closer = e.target.closest("[data-modal-close]");
      if (closer) { modalClose(closer.closest(".modal-veil")); return; }
      if (e.target.classList && e.target.classList.contains("modal-veil")) {
        modalClose(e.target);
      }
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && openVeil) modalClose(openVeil);
    });
  }

  /* ---------- Toasts ---------- */

  function toast(msg, kind, icon) {
    let rail = $(".toast-rail");
    if (!rail) {
      rail = document.createElement("div");
      rail.className = "toast-rail";
      document.body.appendChild(rail);
    }
    const t = document.createElement("div");
    t.className = "toast" + (kind ? " t-" + kind : "");
    t.setAttribute("role", "status");
    t.innerHTML = `<span class="t-ico">${icon || "◆"}</span><span></span>`;
    t.lastElementChild.textContent = msg;
    rail.appendChild(t);
    setTimeout(() => {
      t.style.transition = "opacity .3s";
      t.style.opacity = "0";
      setTimeout(() => t.remove(), 320);
    }, 3600);
  }

  /* ---------- Endowed-progress verification flow (PRD §3.4, edge-case C)
     Opens a modal checklist whose first steps arrive pre-completed, then
     animates the remaining sync steps before unlocking the CTA. ---------- */

  function verifyFlow(opts) {
    const o = Object.assign(
      {
        title: "Match qualification",
        sub: "Progressive verification — takes about 15 seconds.",
        cta: "Enter lobby",
        steps: [
          { label: "Account linked", sub: "ICL competitive identity", done: true },
          { label: "Anti-cheat record active", sub: "Vanguard / VAC handshake", done: true },
          { label: "Syncing verified skill data", sub: "Riot API • ranked history", ms: 2600 },
          { label: "Fair-play score check", sub: "Reliability 90+ required for staked brackets", ms: 1400 },
        ],
        onDone: null,
      },
      opts || {}
    );

    let veil = $("#icl-verify-veil");
    if (!veil) {
      veil = document.createElement("div");
      veil.id = "icl-verify-veil";
      veil.className = "modal-veil";
      veil.setAttribute("aria-hidden", "true");
      document.body.appendChild(veil);
    }

    const doneCount = o.steps.filter((s) => s.done).length;
    veil.innerHTML = `
      <div class="modal" role="dialog" aria-modal="true" aria-label="${o.title}">
        <div class="modal-head">
          <div>
            <p class="eyebrow">Verification handshake</p>
            <h3>${o.title}</h3>
          </div>
          <button class="modal-x" data-modal-close aria-label="Close">✕</button>
        </div>
        <p style="font-size:14px">${o.sub}</p>
        <div class="verify-list"></div>
        <div class="verify-bar"><i></i></div>
        <div style="display:flex;align-items:center;justify-content:space-between;gap:14px;margin-top:20px;flex-wrap:wrap">
          <span class="badge-cleared" style="visibility:hidden">✔ CLEARED — TRUSTED COMPETITOR</span>
          <button class="btn btn-amber btn-sm" disabled>${o.cta}</button>
        </div>
      </div>`;

    const list = $(".verify-list", veil);
    o.steps.forEach((s, i) => {
      const row = document.createElement("div");
      row.className = "verify-step " + (s.done ? "done" : "pending");
      row.innerHTML = `
        <span class="vs-mark">${s.done ? "✓" : i + 1}</span>
        <span class="vs-body">
          <span class="vs-title">${s.label}</span><br>
          <span class="vs-sub">${s.sub || ""}</span>
        </span>`;
      list.appendChild(row);
    });

    const bar = $(".verify-bar i", veil);
    const badge = $(".badge-cleared", veil);
    const cta = $(".btn-amber", veil);
    const rows = $$(".verify-step", veil);
    let cancelled = false;
    veil.addEventListener("icl:modal-close", () => { cancelled = true; }, { once: true });

    modalOpen(veil);
    bar.style.width = (doneCount / o.steps.length) * 100 + "%";

    let i = doneCount;
    (function next() {
      if (cancelled) return;
      if (i >= o.steps.length) {
        badge.style.visibility = "visible";
        cta.disabled = false;
        cta.focus();
        cta.addEventListener("click", () => {
          modalClose(veil);
          if (o.onDone) o.onDone();
        }, { once: true });
        return;
      }
      const row = rows[i];
      const step = o.steps[i];
      row.classList.remove("pending");
      row.classList.add("active");
      row.querySelector(".vs-mark").innerHTML = `<span class="spin"></span>`;
      const wait = reducedMotion ? 120 : step.ms || 1500;
      setTimeout(() => {
        if (cancelled) return;
        row.classList.remove("active");
        row.classList.add("done");
        row.querySelector(".vs-mark").textContent = "✓";
        const sub = row.querySelector(".vs-sub");
        if (step.doneSub) sub.textContent = step.doneSub;
        i += 1;
        bar.style.width = (i / o.steps.length) * 100 + "%";
        next();
      }, wait);
    })();
  }

  /* ---------- Low-power performance guard (PRD edge-case D)
     Samples frame time; sustained jank over the budget flips the page
     into low-power mode: canvas sims freeze into scoreboards. ---------- */

  const perf = {
    low: false,
    _slow: 0,
    _last: 0,
    _armed: false,
    set(low, why) {
      if (this.low === low) return;
      this.low = low;
      document.body.classList.toggle("low-power", low);
      document.dispatchEvent(new CustomEvent("icl:lowpower", { detail: { low } }));
      toast(
        low
          ? "Performance guard: streams switched to low-power scoreboards" + (why ? " (" + why + ")" : "")
          : "Low-power mode off — live streams restored",
        low ? "warn" : "ok",
        low ? "⚡" : "▶"
      );
    },
    arm() {
      if (this._armed || reducedMotion) return;
      this._armed = true;
      const budget = (window.ICL_CONFIG && ICL_CONFIG.perfBudgetMs) || 40;
      const tick = (now) => {
        if (this._last) {
          const dt = now - this._last;
          if (document.visibilityState === "visible") {
            if (dt > budget) this._slow += 1; else this._slow = Math.max(0, this._slow - 2);
            if (this._slow > 90 && !this.low) this.set(true, "frame budget exceeded");
          }
        }
        this._last = now;
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    },
  };

  /* ---------- Boot ---------- */

  function boot() {
    setContext(getContext(), { silent: true });
    wireContextToggle();
    wireModals();
    perf.arm();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }

  window.ICL = {
    $, $$, reducedMotion, store,
    getContext, setContext, CTX_META,
    modalOpen, modalClose, toast, verifyFlow,
    perf,
    rand: (a, b) => a + Math.random() * (b - a),
    pick: (arr) => arr[(Math.random() * arr.length) | 0],
  };
})();
