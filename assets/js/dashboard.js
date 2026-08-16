/* ============================================================
   ICL.GG — dashboard.js
   Combat Room lobbies + Challenger Hall queue: live filtering,
   join flows through the endowed-progress verification overlay,
   majority-rules reshuffle vote, context swapping.
   ============================================================ */
(function () {
  "use strict";
  const { $, $$, toast, verifyFlow, getContext } = window.ICL;

  /* ================= Data ================= */

  /* rank: 0 any · 1 plat · 2 diamond · 3 immortal */
  const LOBBIES = [
    { tag: "OBS", name: "Obsidian", rec: "11–2", region: "EU", mode: "scrim", rank: 3, rankLabel: "IMMORTAL+", slots: 4, fp: 94, acs: 261, verified: true, wr: 71 },
    { tag: "TRM", name: "Tremor", rec: "10–3", region: "NA", mode: "comp", rank: 3, rankLabel: "IMMORTAL+", slots: 3, fp: 91, acs: 254, verified: true, wr: 66 },
    { tag: "QSR", name: "Quasar", rec: "8–5", region: "NA", mode: "wager", rank: 3, rankLabel: "IMMORTAL+", slots: 4, fp: 89, acs: 247, verified: true, wr: 58 },
    { tag: "MNT", name: "Mantle", rec: "8–5", region: "EU", mode: "comp", rank: 2, rankLabel: "DIAMOND+", slots: 2, fp: 90, acs: 231, verified: true, wr: 61 },
    { tag: "GLC", name: "Glacier", rec: "6–7", region: "APAC", mode: "comp", rank: 3, rankLabel: "IMMORTAL+", slots: 4, fp: 96, acs: 258, verified: true, wr: 55 },
    { tag: "CPR", name: "Copperhead", rec: "7–6", region: "NA", mode: "scrim", rank: 2, rankLabel: "DIAMOND+", slots: 1, fp: 87, acs: 236, verified: true, wr: 63 },
    { tag: "PYR", name: "Pyrelight", rec: "6–7", region: "EU", mode: "comp", rank: 1, rankLabel: "PLAT+", slots: 3, fp: 82, acs: 214, verified: false, wr: 49 },
    { tag: "DRK", name: "Darkwater", rec: "7–6", region: "APAC", mode: "wager", rank: 3, rankLabel: "IMMORTAL+", slots: 2, fp: 93, acs: 250, verified: true, wr: 60 },
  ];

  const CHALLENGES = [
    { name: "Vesperov", elo: 2234, tc: "blitz", tcLabel: "5+3 Blitz", rated: true, fp: 97, acc: 95.1 },
    { name: "Oktava", elo: 2190, tc: "rapid", tcLabel: "15+10 Rapid", rated: true, fp: 93, acc: 93.8 },
    { name: "Copernic", elo: 2118, tc: "blitz", tcLabel: "3+2 Blitz", rated: true, fp: 90, acc: 92.4 },
    { name: "Darya", elo: 2087, tc: "classical", tcLabel: "90+30 Classical", rated: true, fp: 95, acc: 94.6 },
    { name: "Fenwick", elo: 2051, tc: "rapid", tcLabel: "10+0 Rapid", rated: false, fp: 88, acc: 91.2 },
    { name: "Glinka", elo: 1943, tc: "bullet", tcLabel: "1+0 Bullet", rated: true, fp: 91, acc: 90.7 },
    { name: "Pyotr", elo: 2166, tc: "blitz", tcLabel: "5+0 Blitz", rated: true, fp: 84, acc: 93.1 },
  ];

  /* ================= FPS · Combat Room ================= */

  function lobbyCard(l) {
    const el = document.createElement("article");
    el.className = "lobby card cut-both";
    const pips = Array.from({ length: 5 }, (_, i) =>
      `<span class="slot${i < l.slots ? " full" : ""}"></span>`).join("");
    const modeLabel = { comp: "5v5 COMPETITIVE", scrim: "TEAM SCRIM", wager: "WAGER MATCH" }[l.mode];
    el.innerHTML = `
      <div class="lobby-top"><span class="ttag">${l.tag}</span><h3>${l.name}</h3><span class="rec">${l.rec}</span></div>
      <div class="lobby-meta">
        <span class="chip chip-ctx">${l.rankLabel}</span>
        <span class="chip">${l.region} · ${modeLabel}</span>
        ${l.verified ? '<span class="chip chip-ok">✔ CLEARED</span>' : '<span class="chip">UNVERIFIED</span>'}
      </div>
      <div class="lobby-line">
        <span>SLOTS <span class="slot-pips">${pips}</span> ${l.slots}/5</span>
        <span>AVG ACS <b style="color:var(--text-hi)">${l.acs}</b></span>
        <span class="fairplay${l.fp < 85 ? " fp-low" : ""}">FP <span class="fp-val">${l.fp}</span></span>
      </div>
      <div class="lobby-actions">
        <span class="voice data">🎧 Discord voice linked</span>
        <button class="btn btn-amber btn-xs">Join lobby</button>
      </div>`;
    $(".btn-amber", el).addEventListener("click", () => joinLobby(l));
    return el;
  }

  function joinLobby(l) {
    verifyFlow({
      title: `Join lobby · ${l.tag} ${l.name}`,
      sub: "Progressive verification — you only do this once per game.",
      cta: "Enter lobby",
      steps: [
        { label: "Discord linked", sub: "Voice channel ready: #" + l.tag.toLowerCase() + "-scrim", done: true },
        { label: "Anti-cheat record active", sub: "Vanguard / VAC handshake", done: true },
        { label: "Syncing verified rank", sub: "Riot API · competitive history (~15s)", ms: 2600, doneSub: "Immortal 2 verified — no smurf flags" },
        { label: "Lobby handshake", sub: "Captain auto-accepts verified Immortal+", ms: 1200, doneSub: "Slot reserved" },
      ],
      onDone: () => toast(`Joined ${l.name} — Discord voice opened`, "ok", "🎧"),
    });
  }

  function renderLobbies() {
    const grid = $("#lobby-grid");
    grid.innerHTML = "";
    const rankFloor = +$("#f-rank").value;
    const regions = $$("#f-region .fchip").filter((c) => c.getAttribute("aria-pressed") === "true").map((c) => c.dataset.region);
    const mode = $("#f-mode").value;
    const needVerified = $("#f-verified").checked;
    const needFair = $("#f-fair").checked;
    const needWr = $("#f-winrate").checked;

    const list = LOBBIES.filter((l) =>
      l.rank >= rankFloor &&
      regions.includes(l.region) &&
      (mode === "any" || l.mode === mode) &&
      (!needVerified || l.verified) &&
      (!needFair || l.fp >= 85) &&
      (!needWr || l.wr >= 55));

    list.forEach((l) => grid.appendChild(lobbyCard(l)));
    $("#fps-count").textContent = `${list.length} of ${LOBBIES.length} lobbies match your filters.`;
    if (!list.length) {
      grid.innerHTML = `<div class="panel" style="padding:26px;text-align:center;color:var(--text-low)">
        No lobbies match. Loosen a filter — or <b style="color:var(--amber)">create one</b> and let verified players come to you.</div>`;
    }
  }

  ["#f-rank", "#f-mode"].forEach((s) => $(s).addEventListener("change", renderLobbies));
  ["#f-verified", "#f-fair", "#f-winrate"].forEach((s) => $(s).addEventListener("change", renderLobbies));
  $$("#f-region .fchip").forEach((c) => c.addEventListener("click", () => {
    c.setAttribute("aria-pressed", String(c.getAttribute("aria-pressed") !== "true"));
    renderLobbies();
  }));

  $("#create-lobby").addEventListener("click", () =>
    verifyFlow({
      title: "Create lobby",
      sub: "Your lobby inherits your verification — joiners are screened automatically.",
      cta: "Open lobby",
      steps: [
        { label: "Captain authority confirmed", sub: "You can post results for teammates", done: true },
        { label: "Anti-cheat record active", sub: "Vanguard / VAC handshake", done: true },
        { label: "Provisioning Discord voice", sub: "#sbl-scrim · auto-invites on join", ms: 1600, doneSub: "Voice channel live" },
      ],
      onDone: () => toast("Lobby open — visible to verified Immortal+ now", "ok", "＋"),
    }));

  /* Reshuffle vote (majority of 7) */
  let votes = 3, voted = false;
  function paintVote() {
    $("#vote-count").textContent = `${votes} / 7`;
    $("#vote-fill").style.width = (votes / 7) * 100 + "%";
  }
  $("#vote-yes").addEventListener("click", () => {
    if (voted) return;
    voted = true;
    votes += 1;
    paintVote();
    if (votes >= 4) toast("Majority reached — reshuffle queued for after this series", "ok", "⇄");
    else toast("Vote recorded — " + (4 - votes) + " more for majority", "", "🗳");
  });
  $("#vote-no").addEventListener("click", () => {
    if (voted) return;
    voted = true;
    toast("Vote recorded — keeping current teams", "", "🗳");
  });

  /* ================= Chess · Challenger Hall ================= */

  function chalRow(c) {
    const el = document.createElement("article");
    el.className = "chal card cut-both";
    el.innerHTML = `
      <span class="c-ava">${c.name.slice(0, 2).toUpperCase()}</span>
      <span class="c-name">${c.name}</span>
      <span class="c-elo data">${c.elo}</span>
      <span class="c-meta">
        <span class="chip chip-ctx">${c.tcLabel.toUpperCase()}</span>
        ${c.rated ? '<span class="chip chip-amber">RATED</span>' : '<span class="chip">CASUAL</span>'}
        <span class="chip chip-ok">✔ ${c.acc}% ACC</span>
        <span class="fairplay${c.fp < 85 ? " fp-low" : ""}">FP <span class="fp-val">${c.fp}</span></span>
      </span>
      <button class="btn btn-amber btn-xs">Accept</button>`;
    $(".btn-amber", el).addEventListener("click", () => acceptChallenge(c));
    return el;
  }

  function acceptChallenge(c) {
    verifyFlow({
      title: `Accept challenge · ${c.name} (${c.elo})`,
      sub: "Rating verification keeps every rated game honest.",
      cta: "Sit down — start clock",
      steps: [
        { label: "Chess.com account linked", sub: "OAuth verified rating: 2143", done: true },
        { label: "Fair-play engine armed", sub: "Server-side accuracy screening", done: true },
        { label: "Confirming opponent rating", sub: "Chess.com API (~10s)", ms: 2000, doneSub: `${c.elo} confirmed · no alt-account flags` },
      ],
      onDone: () => toast(`Board ready — ${c.tcLabel} vs ${c.name}. Good luck.`, "ok", "♞"),
    });
  }

  function renderChallenges() {
    const list = $("#challenge-list");
    list.innerHTML = "";
    const floor = +$("#f-elo").value;
    const tcs = $$("#f-tc .fchip").filter((c) => c.getAttribute("aria-pressed") === "true").map((c) => c.dataset.tc);
    const ratedOnly = $("#f-rated").checked;
    const needFair = $("#f-fair2").checked;

    const rows = CHALLENGES.filter((c) =>
      c.elo >= floor && tcs.includes(c.tc) && (!ratedOnly || c.rated) && (!needFair || c.fp >= 85));
    rows.forEach((c) => list.appendChild(chalRow(c)));
    $("#chess-count").textContent = `${rows.length} open challenges match.`;
    if (!rows.length) {
      list.innerHTML = `<div class="panel" style="padding:26px;text-align:center;color:var(--text-low)">
        Queue is quiet at this floor. Post a challenge — it broadcasts to every verified 2000+ player online.</div>`;
    }
  }

  $("#f-elo").addEventListener("change", renderChallenges);
  $("#f-rated").addEventListener("change", renderChallenges);
  $("#f-fair2").addEventListener("change", renderChallenges);
  $$("#f-tc .fchip").forEach((c) => c.addEventListener("click", () => {
    c.setAttribute("aria-pressed", String(c.getAttribute("aria-pressed") !== "true"));
    renderChallenges();
  }));

  $("#post-challenge").addEventListener("click", () =>
    toast("Challenge posted — 5+3 blitz, rated, 2000+ floor", "ok", "♟"));
  $$(".ev-join").forEach((b) => b.addEventListener("click", () =>
    toast("Seat claimed — check-in opens 30 min before start", "ok", "⚑")));

  /* Daily position mini board (Réti-style endgame study) */
  function renderMiniBoard() {
    const host = $("#mini-board");
    if (!host || host.childElementCount) return;
    const P = { "h8": ["♔", "w"], "c8": ["♙", "w"], "a6": ["♚", "b"], "h5": ["♟", "b"] };
    let html = "";
    for (let r = 8; r >= 1; r--) for (let f = 0; f < 8; f++) {
      const cell = "abcdefgh"[f] + r;
      const dark = (r + f) % 2 === 0;
      const pc = P[cell];
      html += `<span class="${dark ? "sq-d" : "sq-l"}${pc ? (pc[1] === "w" ? " pc-w" : " pc-b") : ""}">${pc ? pc[0] : ""}</span>`;
    }
    host.innerHTML = html;
  }

  /* ================= Context swap (IA §5) ================= */

  function applyRoom(ctx) {
    const chess = ctx === "chess";
    $("#room-fps").hidden = chess;
    $("#room-chess").hidden = !chess;
    const link = $("[data-room-link]");
    if (link) link.textContent = chess ? "Challenger Hall" : "Combat Room";
    document.title = (chess ? "Challenger Hall" : "Combat Room") + " — ICL.GG";
    if (chess) { renderChallenges(); renderMiniBoard(); }
    else renderLobbies();
  }

  document.addEventListener("icl:context", (e) => applyRoom(e.detail.ctx));
  applyRoom(getContext());
})();
