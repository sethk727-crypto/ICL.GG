/* ============================================================
   ICL.GG — browse.js
   One directory, three tabs — tournaments (open cup / waiting /
   ARENA states), leagues, recruiting teams. ?tab= deep links
   stand in for the icl.gg/tournaments|leagues|teams routes.
   ============================================================ */
(function () {
  "use strict";
  const { $, $$, reducedMotion, toast, verifyFlow, getContext } = window.ICL;

  /* status: open | live | soon · entry: free | paid */
  const DATA = {
    tournaments: [
      { badge: "CUP", title: "Friday Open Cup", chips: [["STARTS 8:00 PM SHARP", "chip-amber"]], sub: "Fires at 8 PM with whoever is in — 4/8 minimum ignored, walkovers filled by standby queue.", meta: ["5v5 · BO1 → BO3 final", "Single elim", "<b>Free</b>"], fill: [4, 8, "teams joined"], status: "soon", entry: "free", verified: true, cta: "Join cup" },
      { badge: "CUP", title: "Midnight Waiting Cup", chips: [["FIRES AT 8/8", "chip-info"]], sub: "Starts the moment the room fills — join now, get pinged on Discord when the eighth team locks.", meta: ["5v5 · BO3", "Double elim", "<b>$10</b> entry · $640 pool"], fill: [6, 8, "teams — 2 to go"], status: "open", entry: "paid", verified: true, cta: "Claim slot" },
      { badge: "ARN", title: "Saturday ARENA", chips: [["NO JOIN LIMIT", "chip-live"]], sub: "8 PM. Everyone who shows up is shuffled into random 4-player teams. 500 chess players last week — bring anyone.", meta: ["Random teams of 4", "Swiss · 7 rounds", "<b>Free</b>"], fill: [341, 500, "joined · counter live"], status: "open", entry: "free", verified: true, arena: true, cta: "Join arena" },
      { badge: "INV", title: "ICL Invitational Playoffs", chips: [["LIVE NOW", "chip-live"]], sub: "16 verified teams, $12,500 escrowed. Watch every node live in the bracket.", meta: ["5v5 · BO3", "Single elim", "<b>$12,500</b> pool"], fill: [16, 16, "field locked"], status: "live", entry: "paid", verified: true, cta: "Watch bracket", href: "bracket.html" },
      { badge: "CUP", title: "Community Clash #44", chips: [], sub: "Unverified casual bracket — no anti-cheat handshake required.", meta: ["5v5 · BO1", "Single elim", "<b>Free</b>"], fill: [11, 16, "teams joined"], status: "open", entry: "free", verified: false, cta: "Join cup" },
    ],
    leagues: [
      { badge: "LGE", title: "Tactical Premier League", chips: [["SEASON 4 · WEEK 6/10", "chip-amber"]], sub: "Round-robin regular season rolls straight into a playoff bracket — same event, same rosters.", meta: ["14 teams", "RR → single elim", "<b>$25</b>/team · $2,800 pool"], fill: [14, 14, "field locked · waitlist open"], status: "live", entry: "paid", verified: true, cta: "Join waitlist" },
      { badge: "LGE", title: "Open Division League", chips: [["REGISTRATION OPEN", "chip-ok"]], sub: "Entry league with promotion to Premier. Two matches a week, scheduled around your roster's availability.", meta: ["24 team cap", "Swiss · 8 rounds", "<b>Free</b>"], fill: [17, 24, "teams joined"], status: "open", entry: "free", verified: true, cta: "Enter league" },
      { badge: "LGE", title: "Masters Chess Circuit", chips: [["2100+ VERIFIED", "chip-info"]], sub: "Monthly round-robin pods of 8, rated classical. Standings feed the seasonal Candidates bracket.", meta: ["8 per pod", "Round-robin", "<b>$5</b> · $300 pod pool"], fill: [6, 8, "seats in current pod"], status: "open", entry: "paid", verified: true, cta: "Claim seat" },
    ],
    teams: [
      { badge: "SBL", title: "Sableguard", chips: [["RECRUITING · 1 SLOT", "chip-ok"]], sub: "9–4 season, playoffs locked. Trials Tuesday — looking for a fifth who can entry.", meta: ["Immortal+ floor", "NA · evenings", "Avg FP <b>91</b>"], fill: [4, 5, "roster filled"], status: "open", entry: "free", verified: true, cta: "Apply" },
      { badge: "GLC", title: "Glacier", chips: [["RECRUITING · 2 SLOTS", "chip-ok"]], sub: "APAC scrim-heavy squad, 4 nights a week. Fair-play 90+ hard requirement — we show up.", meta: ["Diamond+ floor", "APAC · nightly", "Avg FP <b>96</b>"], fill: [3, 5, "roster filled"], status: "open", entry: "free", verified: true, cta: "Apply" },
      { badge: "NRD", title: "Nordwind Academy", chips: [["TRYOUTS SAT", "chip-amber"]], sub: "Feeder roster for the 13–0 Premier squad. Coached VOD reviews weekly.", meta: ["Ascendant+ floor", "EU · weekends", "Avg FP <b>93</b>"], fill: [5, 7, "extended roster"], status: "soon", entry: "free", verified: true, cta: "Book tryout" },
      { badge: "CHS", title: "Knight Shift (Chess)", chips: [["CLUB · OPEN", "chip-info"]], sub: "Team battles on weekends, shared prep files, blitz nights. 1800+ friendly.", meta: ["1800+ rating", "Global · async", "Avg FP <b>94</b>"], fill: [23, 30, "members"], status: "open", entry: "free", verified: true, cta: "Join club" },
    ],
  };

  let tab = new URLSearchParams(location.search).get("tab");
  if (!DATA[tab]) tab = "tournaments";

  const list = $("#br-list");
  let arenaTimer = 0;

  function render() {
    clearInterval(arenaTimer);
    list.innerHTML = "";
    const q = $("#b-q").value.trim().toLowerCase();
    const entry = $("#b-entry").value;
    const statuses = $$("#b-status .fchip").filter((c) => c.getAttribute("aria-pressed") === "true").map((c) => c.dataset.st);
    const verifiedOnly = $("#b-verified").checked;

    const rows = DATA[tab].filter((r) =>
      statuses.includes(r.status) &&
      (entry === "any" || r.entry === entry) &&
      (!verifiedOnly || r.verified) &&
      (!q || (r.title + " " + r.badge + " " + r.sub).toLowerCase().includes(q)));

    rows.forEach((r) => list.appendChild(card(r)));
    $("#br-count").textContent = `${rows.length} of ${DATA[tab].length} listings match.`;
    if (!rows.length) {
      list.innerHTML = `<div class="panel br-empty">Nothing matches those filters — loosen one, or start your own ${tab.slice(0, -1)}.</div>`;
    }
  }

  function card(r) {
    const el = document.createElement("article");
    el.className = "listing card cut-both" + (r.arena ? " is-arena" : "");
    const pct = Math.min(100, (r.fill[0] / r.fill[1]) * 100);
    el.innerHTML = `
      <span class="li-badge">${r.badge}</span>
      <div class="li-main">
        <div class="li-title">
          <h3>${r.title}</h3>
          ${r.chips.map(([t, c]) => `<span class="chip ${c || ""}">${t}</span>`).join("")}
          ${r.verified ? "" : '<span class="chip">UNVERIFIED</span>'}
        </div>
        <div class="li-meta">${r.meta.map((m) => `<span>${m}</span>`).join("")}</div>
      </div>
      <div class="li-side">
        <div class="li-fill">
          <span class="data"><b class="fill-now" style="color:var(--text-hi)">${r.fill[0]}</b>/${r.fill[1]} ${r.fill[2]}</span>
          <span class="m-track"><span class="m-fill" style="width:${pct}%"></span></span>
        </div>
        <button class="btn btn-amber btn-xs">${r.cta}</button>
      </div>
      <p class="li-sub">${r.sub}</p>`;

    $(".btn-amber", el).addEventListener("click", () => act(r));

    if (r.arena && !reducedMotion) {
      const now = $(".fill-now", el);
      const bar = $(".m-fill", el);
      arenaTimer = setInterval(() => {
        r.fill[0] += (Math.random() * 3) | 0;
        now.textContent = r.fill[0];
        bar.style.width = Math.min(100, (r.fill[0] / r.fill[1]) * 100) + "%";
      }, 2800);
    }
    return el;
  }

  function act(r) {
    if (r.href) { location.href = r.href; return; }
    if (tab === "teams") {
      verifyFlow({
        title: `Apply · ${r.title}`,
        sub: "Captains see your verified rank and fair-play score — nothing self-reported.",
        cta: "Send application",
        steps: [
          { label: "Verified rank attached", sub: "Pulled live from the game API", done: true },
          { label: "Fair-play score attached", sub: "92 — above this roster's floor", done: true },
          { label: "Notifying captain", sub: "Discord DM + in-app", ms: 1400, doneSub: "Delivered" },
        ],
        onDone: () => toast(`Application sent to ${r.title} — captains reply in-app`, "ok", "✉"),
      });
    } else {
      verifyFlow({
        title: `${r.cta} · ${r.title}`,
        sub: "Check-in is automatic once you're verified.",
        cta: "Confirm entry",
        steps: [
          { label: "Account & context locked", sub: "Competitive identity ready", done: true },
          { label: "Anti-cheat record active", sub: "Handshake on file", done: true },
          { label: "Reserving your slot", sub: "Escrow + roster lock", ms: 1600, doneSub: "Slot held for 10 minutes" },
        ],
        onDone: () => toast(`You're in — ${r.title}. Schedule lands on your profile.`, "ok", "⚑"),
      });
    }
  }

  /* Tabs — also the landing spot for /tournaments /leagues /teams routes */
  $$(".br-tab").forEach((b) =>
    b.addEventListener("click", () => {
      tab = b.dataset.tab;
      $$(".br-tab").forEach((x) => x.setAttribute("aria-selected", String(x === b)));
      try { history.replaceState(null, "", "?tab=" + tab); } catch { /* sandboxed */ }
      render();
    }));
  $$(".br-tab").forEach((b) => b.setAttribute("aria-selected", String(b.dataset.tab === tab)));

  $("#b-q").addEventListener("input", render);
  $("#b-entry").addEventListener("change", render);
  $("#b-verified").addEventListener("change", render);
  $$("#b-status .fchip").forEach((c) =>
    c.addEventListener("click", () => {
      c.setAttribute("aria-pressed", String(c.getAttribute("aria-pressed") !== "true"));
      render();
    }));

  document.addEventListener("icl:context", (e) => {
    const link = $("[data-room-link]");
    if (link) link.textContent = e.detail.ctx === "chess" ? "Challenger Hall" : "Combat Room";
  });
  const link = $("[data-room-link]");
  if (link && getContext() === "chess") link.textContent = "Challenger Hall";

  render();
})();
