/* ============================================================
   ICL.GG — onboarding.js
   Straight-line PLG flow (PRD §3): single-field entry →
   game context → instant lobby value → deferred OAuth →
   endowed-progress qualification. A visible timer keeps the
   "30 seconds" promise honest.
   ============================================================ */
(function () {
  "use strict";
  const { $, $$, reducedMotion, setContext, toast } = window.ICL;

  /* ---------- Timer (the 30-second promise) ---------- */
  const t0 = Date.now();
  setInterval(() => {
    const s = ((Date.now() - t0) / 1000) | 0;
    $("#ob-timer").textContent = `⏱ ${(s / 60) | 0}:${String(s % 60).padStart(2, "0")}`;
  }, 1000);

  /* ---------- Step navigation ---------- */
  let ctx = "fps";
  const intent = new URLSearchParams(location.search).get("intent") || "play";

  function goto(n) {
    $$(".ob-step").forEach((s) => { s.hidden = s.id !== "step-" + n; });
    $$("#ob-rail li").forEach((li) => {
      const k = +li.dataset.step;
      li.classList.toggle("is-done", k < n);
      li.classList.toggle("is-on", k === n);
    });
    const step = $("#step-" + n);
    const h = $(".ob-h1", step);
    if (h) h.setAttribute("tabindex", "-1"), h.focus({ preventScroll: true });
    window.scrollTo({ top: 0, behavior: reducedMotion ? "auto" : "smooth" });
    if (n === 3) renderPreview();
    if (n === 5) runQualification();
  }

  /* ---------- Step 1: single-field entry / SSO ---------- */
  $("#email-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const email = $("#ob-email").value.trim();
    const ok = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);
    $("#ob-err").hidden = ok;
    if (!ok) { $("#ob-email").focus(); return; }
    toast("Magic link sent to " + email + " — you can keep going meanwhile", "ok", "✉");
    goto(2);
  });
  $("#google-btn").addEventListener("click", () => {
    toast("Signed in with Google", "ok", "✓");
    goto(2);
  });

  /* ---------- Step 2: game context ---------- */
  $$(".game-card[data-pick]").forEach((c) =>
    c.addEventListener("click", () => {
      ctx = c.dataset.pick;
      setContext(ctx); // instant re-theme — the visible payoff
      goto(3);
    }));

  /* ---------- Step 3: instant value ---------- */
  const PREVIEWS = {
    fps: {
      title: "Your Combat Room is already live.",
      sub: "These lobbies match your region right now. No profile grinding first — the pool comes to you.",
      rows: [
        ["TRM", "Tremor", "NA · 5v5 COMP", "IMMORTAL+", "3/5"],
        ["QSR", "Quasar", "NA · WAGER", "IMMORTAL+", "4/5"],
        ["CPR", "Copperhead", "NA · SCRIM", "DIAMOND+", "1/5"],
      ],
    },
    chess: {
      title: "Your Challenger Hall is already live.",
      sub: "Open challenges at your level, waiting. Accept one the moment your rating syncs.",
      rows: [
        ["2234", "Vesperov", "5+3 BLITZ · RATED", "FP 97", "OPEN"],
        ["2190", "Oktava", "15+10 RAPID · RATED", "FP 93", "OPEN"],
        ["2118", "Copernic", "3+2 BLITZ · RATED", "FP 90", "OPEN"],
      ],
    },
  };
  const ORG_NOTE = {
    organize: "Organizer tools unlock right after this — brackets, seeding, and payouts included.",
    "start-team": "Team creation unlocks right after this — set your rank floor and open tryouts.",
  };

  function renderPreview() {
    const p = PREVIEWS[ctx];
    $("#s3-title").textContent = p.title;
    $("#s3-sub").textContent = ORG_NOTE[intent] ? p.sub + " " + ORG_NOTE[intent] : p.sub;
    const list = $("#preview-list");
    list.innerHTML = "";
    p.rows.forEach(([tag, name, meta, chip, slots]) => {
      const row = document.createElement("div");
      row.className = "pv-row";
      row.innerHTML = `<span class="pv-tag">${tag}</span><span class="pv-name">${name}</span>
        <span class="chip chip-ctx">${chip}</span><span class="pv-meta">${meta}</span>
        <span class="chip chip-ok">✔</span><span class="pv-meta">${slots}</span>`;
      list.appendChild(row);
    });
  }
  $("#s3-next").addEventListener("click", () => goto(4));

  /* ---------- Step 4: OAuth handshake (deferred barrier) ---------- */
  $$(".o-btn").forEach((b) =>
    b.addEventListener("click", () => {
      const row = b.closest(".oauth-row");
      b.textContent = "Linking…";
      setTimeout(() => {
        row.classList.add("is-linked");
        b.textContent = "✓ Linked";
        toast(row.dataset.svc + " linked — server-verified", "ok", "✓");
      }, reducedMotion ? 100 : 900);
    }));
  $("#s4-next").addEventListener("click", () => goto(5));
  $("#s4-skip").addEventListener("click", () => {
    toast("Skipped — you can link platforms from any lobby later", "", "→");
    goto(5);
  });

  /* ---------- Step 5: endowed-progress qualification ---------- */
  let ran = false;
  function runQualification() {
    if (ran) return;
    ran = true;
    const linked = $$(".oauth-row.is-linked").length;
    const steps = [
      { label: "Account created", sub: "Magic link on its way", done: true },
      { label: "Game context locked", sub: ctx === "chess" ? "Classic Chess" : "Tactical FPS", done: true },
      {
        label: linked ? "Platforms linked" : "Platforms — deferred",
        sub: linked ? linked + " service" + (linked > 1 ? "s" : "") + " verified" : "Link before staked brackets",
        done: true,
      },
      { label: "Syncing skill data", sub: ctx === "chess" ? "Chess.com rating history (~15s)" : "Riot ranked history (~15s)", ms: 2600 },
      { label: "Anti-cheat & fair-play record", sub: "Issuing your trust badge", ms: 1500 },
    ];
    const list = $("#s5-list");
    list.innerHTML = "";
    steps.forEach((s, i) => {
      const row = document.createElement("div");
      row.className = "verify-step " + (s.done ? "done" : "pending");
      row.innerHTML = `<span class="vs-mark">${s.done ? "✓" : i + 1}</span>
        <span class="vs-body"><span class="vs-title">${s.label}</span><br><span class="vs-sub">${s.sub}</span></span>`;
      list.appendChild(row);
    });
    const rows = $$(".verify-step", list);
    const bar = $("#s5-bar");
    let i = steps.filter((s) => s.done).length;
    bar.style.width = (i / steps.length) * 100 + "%";
    (function next() {
      if (i >= steps.length) {
        $("#s5-done").hidden = false;
        $(".ob-sub", $("#step-5")).hidden = true;
        $("#step-5 .ob-h1").textContent = "You're cleared for verified play.";
        return;
      }
      const row = rows[i];
      row.classList.replace("pending", "active");
      row.querySelector(".vs-mark").innerHTML = '<span class="spin"></span>';
      setTimeout(() => {
        row.classList.replace("active", "done");
        row.querySelector(".vs-mark").textContent = "✓";
        i += 1;
        bar.style.width = (i / steps.length) * 100 + "%";
        next();
      }, reducedMotion ? 120 : steps[i].ms || 1400);
    })();
  }
})();
