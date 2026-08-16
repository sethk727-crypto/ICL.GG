/* ============================================================
   ICL.GG — bracket.js
   Renders the tournament tree, draws connectors, and drives the
   live-watch UX: hover preview (§2A), floating PiP (§2B),
   dual-cast theater with room chat (§2C), plus the PRD edge
   cases — desync badge (A), scoreboard fallback (B), endowed
   check-in (C), low-power guard (D) — and roadmap extras:
   twitch handles in nodes, Now Streaming strip, randomize
   entrants, custom backdrop.
   ============================================================ */
(function () {
  "use strict";
  const { $, $$, reducedMotion, toast, verifyFlow } = window.ICL;

  /* ================= Data ================= */

  const FPS_TEAMS = [
    ["NRD", "Nordwind", "13–0", "nordwind_gg"], ["SPC", "Spectral", "12–1", "spectral_live"],
    ["VXN", "Vexen", "11–2", "vxn_nova"], ["OBS", "Obsidian", "11–2", "obsidian_cs"],
    ["HAL", "Halcyon", "10–3", "halcyon_tv"], ["TRM", "Tremor", "10–3", "tremor_five"],
    ["KRA", "Krakatoa", "9–4", "krakatoa_tv"], ["IRN", "Ironveil", "9–4", "ironveil"],
    ["QSR", "Quasar", "8–5", "quasar_gg"], ["MNT", "Mantle", "8–5", "mantle_cs"],
    ["CPR", "Copperhead", "7–6", "copperhead"], ["DRK", "Darkwater", "7–6", "darkwater_gg"],
    ["PYR", "Pyrelight", "6–7", "pyrelight"], ["GLC", "Glacier", "6–7", "glacier_five"],
    ["SBL", "Sableguard", "5–8", "sableguard"], ["ZPH", "Zephyr", "5–8", "zephyr_cs"],
  ].map((t, i) => ({ tag: t[0], name: t[1], rec: t[2], tw: t[3], seed: i + 1 }));

  const CHESS_NAMES = ["Aurelius", "Vesperov", "KarlDuke", "Oktava", "Halide", "Tremolo",
    "Krakow", "Fenwick", "Quasarov", "Mantra", "Copernic", "Darya",
    "Pyotr", "Glinka", "Sablewing", "Zephyrine"];
  const CHESS_TEAMS = CHESS_NAMES.map((n, i) => ({
    tag: String(2248 - i * 14), name: n, rec: `${13 - (i >> 1)}–${i >> 1}`,
    tw: n.toLowerCase() + "_chess", seed: i + 1,
  }));

  /* Match template: [state, scoreA, scoreB] — teams assigned from the
     (shuffleable) entrant order. src links wire the connector tree. */
  const TEMPLATE = {
    rounds: [
      { title: "Round of 16", key: "R16" },
      { title: "Quarterfinals", key: "QF" },
      { title: "Semifinals", key: "SF" },
      { title: "Grand Final", key: "F" },
    ],
    r16pairs: [[0, 15], [7, 8], [4, 11], [3, 12], [2, 13], [6, 9], [5, 10], [1, 14]],
    r16: [["final", 2, 0], ["final", 1, 2], ["final", 2, 1], ["final", 2, 0],
          ["final", 2, 1], ["final", 2, 0], ["final", 2, 1], ["final", 2, 0]],
    qf: [["final", 2, 0], ["final", 0, 2], ["live", 1, 0], ["live", 1, 1]],
  };

  let ctx = document.documentElement.getAttribute("data-context") || "fps";
  let entrants = null;
  let matches = [];

  function buildData(shuffled) {
    const pool = (ctx === "chess" ? CHESS_TEAMS : FPS_TEAMS).slice();
    entrants = shuffled ? shuffle(pool) : pool;
    matches = [];
    const T = TEMPLATE;

    const r16 = T.r16pairs.map(([a, b], i) => mk("m" + i, 0, entrants[a], entrants[b], T.r16[i]));
    const qf = T.qf.map((spec, i) =>
      mk("q" + i, 1, winnerOf(r16[i * 2]), winnerOf(r16[i * 2 + 1]), spec, [r16[i * 2].id, r16[i * 2 + 1].id]));
    qf[2].live = { detail: ctx === "chess" ? "GAME 2" : "MAP 2", servRound: 7, lat: 1.2 };
    qf[3].live = { detail: ctx === "chess" ? "GAME 3" : "MAP 3", servRound: 7, lat: 8.4, desync: true };
    const sf = [
      mk("s0", 2, winnerOf(qf[0]), winnerOf(qf[1]), ["up"], [qf[0].id, qf[1].id], "Sat · 8:00 PM"),
      mk("s1", 2, null, null, ["up"], [qf[2].id, qf[3].id], "Sat · 9:30 PM"),
    ];
    const f = [mk("f0", 3, null, null, ["up"], [sf[0].id, sf[1].id], "Sun · 7:00 PM")];
    matches = [...r16, ...qf, ...sf, ...f];
  }

  function mk(id, round, a, b, spec, src, time) {
    return {
      id, round, src: src || null, time: time || null,
      teams: [a, b], state: spec[0],
      score: [spec[1] ?? null, spec[2] ?? null],
      winner: spec[0] === "final" ? (spec[1] > spec[2] ? 0 : 1) : null,
      live: null, offline: false,
    };
  }
  const winnerOf = (m) => (m.state === "final" ? m.teams[m.winner] : null);
  const byId = (id) => matches.find((m) => m.id === id);
  function shuffle(a) {
    for (let i = a.length - 1; i > 0; i--) {
      const j = (Math.random() * (i + 1)) | 0;
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  /* ================= Render ================= */

  const inner = $("#bracket-inner");
  const links = $("#bracket-links");
  const strip = $("#streaming-strip");

  function srcLabel(m, side) {
    const s = byId(m.src[side]);
    const rk = TEMPLATE.rounds[s.round].key;
    return `Winner · ${rk}-${+s.id.slice(1) + 1}`;
  }

  function render() {
    $$(".round-col", inner).forEach((c) => c.remove());
    const byRound = [[], [], [], []];
    matches.forEach((m) => byRound[m.round].push(m));

    byRound.forEach((round, ri) => {
      const col = document.createElement("div");
      col.className = "round-col";
      const live = round.filter((m) => m.state === "live").length;
      col.innerHTML = `<div class="round-title">${TEMPLATE.rounds[ri].title}${live ? ` · <b>${live} LIVE</b>` : ""}</div>`;
      round.forEach((m) => col.appendChild(renderNode(m)));
      inner.appendChild(col);
    });

    requestAnimationFrame(drawLinks);
    renderStrip();
    $("#t-live").textContent = matches.filter((m) => m.state === "live").length;
  }

  function renderNode(m) {
    const el = document.createElement("article");
    el.className = "mnode is-" + (m.state === "live" ? "live" : m.state === "up" ? "up" : "final");
    if (m.offline) el.classList.add("is-offline");
    el.dataset.match = m.id;

    const status = m.state === "live"
      ? `<span class="chip chip-live mnode-status"><span class="dot dot-pulse"></span>LIVE · ${m.live ? m.live.detail : ""}</span>`
      : m.state === "up"
        ? `<span class="chip mnode-status">${m.time || "TBD"}</span>`
        : `<span class="chip mnode-status">FINAL</span>`;

    const fmt = ctx === "chess" ? "90+30" : "BO3";
    const rows = [0, 1].map((i) => {
      const t = m.teams[i];
      const w = m.state === "final" && m.winner === i;
      const l = m.state === "final" && m.winner !== i;
      if (!t) {
        return `<div class="mnode-row"><span class="seed data"></span><span class="ttag data">—</span>
          <span class="tname" style="color:var(--text-low)">${m.src ? srcLabel(m, i) : "TBD"}</span>
          <span class="tscore data">·</span></div>`;
      }
      return `<div class="mnode-row${w ? " is-w" : l ? " is-l" : ""}">
        <span class="seed data">${t.seed}</span><span class="ttag data">${t.tag}</span>
        <span class="tname">${t.name}</span>
        <span class="rec data" title="Season record">${t.rec}</span>
        <span class="tscore data">${m.score[i] ?? "·"}</span></div>`;
    }).join("");

    const twitch = m.state === "live"
      ? `<div class="twitch-row">${m.teams.map((t) => t ? `<span class="tw-mini">▶ @${t.tw}</span>` : "").join("")}</div>`
      : "";

    const foot = m.offline
      ? "STREAM OFFLINE — server scoreboard active"
      : m.state === "live" ? "Hover to watch · click to dual-cast"
      : m.state === "up" ? (m.teams[0] && m.teams[1] ? "Check-in opens 30 min before start" : "Awaiting qualifiers")
      : `Advances: ${m.teams[m.winner] ? m.teams[m.winner].name : ""}`;

    const checkin = m.state === "up" && m.teams[0] && m.teams[1]
      ? `<button class="btn btn-ghost btn-xs checkin">⚑ Check in — 15s verification</button>` : "";

    el.innerHTML = `<header class="mnode-top">${status}<span class="data mnode-fmt">${fmt}</span></header>
      ${rows}${twitch}${checkin}<footer class="mnode-foot data">${foot}</footer>`;

    if (m.state === "live") {
      el.tabIndex = 0;
      el.setAttribute("role", "button");
      el.setAttribute("aria-label",
        `Live match: ${m.teams[0].name} versus ${m.teams[1].name}, ${m.score[0]}–${m.score[1]}. Enter to open dual-cast, hover to preview stream.`);
      el.addEventListener("mouseenter", () => openPop(m, el));
      el.addEventListener("focus", () => openPop(m, el));
      el.addEventListener("mouseleave", scheduleClose);
      el.addEventListener("blur", scheduleClose);
      el.addEventListener("click", () => openTheater(m));
      el.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openTheater(m); }
      });
    }
    const ck = $(".checkin", el);
    if (ck) ck.addEventListener("click", (e) => { e.stopPropagation(); checkinFlow(m); });
    return el;
  }

  /* ---------- Connectors ---------- */

  function drawLinks() {
    const ir = inner.getBoundingClientRect();
    links.setAttribute("viewBox", `0 0 ${ir.width} ${ir.height}`);
    links.innerHTML = "";
    matches.filter((m) => m.src).forEach((m) => {
      const dst = $(`[data-match="${m.id}"]`, inner);
      m.src.forEach((sid) => {
        const srcEl = $(`[data-match="${sid}"]`, inner);
        if (!srcEl || !dst) return;
        const a = srcEl.getBoundingClientRect(), b = dst.getBoundingClientRect();
        const x1 = a.right - ir.left, y1 = a.top + a.height / 2 - ir.top;
        const x2 = b.left - ir.left, y2 = b.top + b.height / 2 - ir.top;
        const mid = x1 + (x2 - x1) / 2;
        const p = document.createElementNS("http://www.w3.org/2000/svg", "path");
        p.setAttribute("d", `M${x1},${y1} H${mid} V${y2} H${x2}`);
        if (byId(sid).state === "live") p.classList.add("is-live-path");
        links.appendChild(p);
      });
    });
  }
  new ResizeObserver(() => requestAnimationFrame(drawLinks)).observe(inner);

  /* ---------- Now Streaming strip ---------- */

  function renderStrip() {
    $$(".ss-chip", strip).forEach((c) => c.remove());
    matches.filter((m) => m.state === "live").forEach((m) => {
      m.teams.forEach((t) => {
        if (!t) return;
        const b = document.createElement("button");
        b.className = "ss-chip";
        b.innerHTML = `<span class="dot dot-pulse"></span><b>@${t.tw}</b> ${t.tag} · ${TEMPLATE.rounds[m.round].key}`;
        b.addEventListener("click", () => {
          const el = $(`[data-match="${m.id}"]`, inner);
          el.scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth", inline: "center", block: "center" });
          setTimeout(() => openPop(m, el), reducedMotion ? 0 : 350);
        });
        strip.appendChild(b);
      });
    });
  }

  /* ================= Hover preview (§2A) ================= */

  const stage = $("#bracket-stage");
  const pop = $("#mpop");
  const popMedia = $("#mpop-media");
  let sim = null, simMatch = null;
  let popMatch = null, popNode = null, closeTimer = 0;
  let pipMatch = null;

  function statsFor(m) {
    if (ctx === "chess") {
      return `<span>Accuracy <b>${(92 + Math.random() * 6).toFixed(1)}%</b></span>
        <span>Brilliant <b>${(Math.random() * 3) | 0}</b></span><span>Depth <b>${18 + ((Math.random() * 8) | 0)}</b></span>`;
    }
    return `<span>K/D <b>${(1 + Math.random()).toFixed(2)}</b></span>
      <span>HS <b>${(24 + Math.random() * 14) | 0}%</b></span><span>ACS <b>${(220 + Math.random() * 90) | 0}</b></span>`;
  }

  function mountPreview(m) {
    if (sim && simMatch === m.id) { sim.setActive(true); return; }
    if (sim) { sim.destroy(); popMedia.innerHTML = ""; }
    simMatch = m.id;
    popMedia.innerHTML = "";
    if (m.offline) {
      sim = null;
      popMedia.innerHTML = scoreboardHTML(m);
      animateScoreboard(popMedia, m);
      return;
    }
    sim = ICLStreams.mountStream(popMedia, {
      mode: ctx === "chess" ? "chess" : "fps",
      tag: m.teams[0].tag, active: true,
      score: m.score.slice(), round: m.live ? m.live.servRound : 5,
      teams: [
        { tag: m.teams[0].tag, players: ["nova", "drift", "hex", "sable", "kite"] },
        { tag: m.teams[1].tag, players: ["onyx", "piper", "vale", "rook", "ember"] },
      ],
      names: [m.teams[0].name, m.teams[1].name],
    });
    if (m.live && m.live.desync) {
      const b = document.createElement("span");
      b.className = "badge-desync";
      b.textContent = `⟲ STREAM DELAYED · ${m.live.lat}s BEHIND SERVER`;
      popMedia.appendChild(b);
    }
  }

  function openPop(m, node) {
    clearTimeout(closeTimer);
    if (pipMatch === m.id) return; // already popped out
    popMatch = m; popNode = node;
    node.classList.add("is-active");
    mountPreview(m);
    $("#mpop-lat").innerHTML = `Stream latency: <b style="color:${m.live && m.live.desync ? "var(--amber)" : "var(--info)"}">${m.live ? m.live.lat : 1.2}s</b>`;
    const server = $("#mpop-server");
    if (m.live && m.live.desync) {
      server.hidden = false;
      server.textContent = `⚠ ROUND ${m.live.servRound} ACTIVE IN GAME ENGINE — bracket scores update from the server, not the stream`;
    } else server.hidden = true;
    $("#mpop-stats").innerHTML = statsFor(m);
    $("#mpop-handles").innerHTML =
      m.teams.map((t) => `<span class="chip chip-info">@${t.tw}</span>`).join("") +
      `<span class="muted data">↗ opens on Twitch</span>`;
    positionPop(node);
    pop.classList.add("open");
  }

  function positionPop(node) {
    if (matchMedia("(max-width: 640px)").matches) { pop.style.left = pop.style.top = ""; return; }
    const sr = stage.getBoundingClientRect();
    const nr = node.getBoundingClientRect();
    const popW = 400;
    const rightSpace = sr.right - nr.right;
    const x = rightSpace > popW + 30 ? nr.right - sr.left + 14 : nr.left - sr.left - popW - 14;
    const y = Math.max(10, Math.min(nr.top - sr.top - 20, sr.height - 330));
    pop.style.left = Math.max(10, x) + "px";
    pop.style.top = y + "px";
    pop.style.right = "auto";
  }

  function scheduleClose() {
    clearTimeout(closeTimer);
    closeTimer = setTimeout(closePop, 140);
  }
  function closePop() {
    if (popNode) popNode.classList.remove("is-active");
    pop.classList.remove("open");
    if (sim && !pipMatch) sim.setActive(false);
    popMatch = null; popNode = null;
  }
  pop.addEventListener("mouseenter", () => clearTimeout(closeTimer));
  pop.addEventListener("mouseleave", scheduleClose);
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") closePop(); });
  $("#bracket-scroll").addEventListener("scroll", () => { if (popNode) positionPop(popNode); }, { passive: true });

  const mute = $("#mpop-mute");
  mute.addEventListener("click", () => {
    const muted = mute.getAttribute("aria-pressed") === "true";
    mute.setAttribute("aria-pressed", String(!muted));
    mute.textContent = muted ? "🔊 LIVE AUDIO" : "🔇 MUTED";
  });

  /* ---------- Scoreboard fallback (edge-case B) ---------- */

  function scoreboardHTML(m) {
    const rounds = ctx === "chess" ? 3 : 13;
    const pips = Array.from({ length: rounds }, (_, i) =>
      `<span class="sb-pip ${i < 4 ? "w0" : i < 7 ? "w1" : ""}"></span>`).join("");
    return `<div class="sb-fallback">
      <span class="sb-flag">⚠ STREAM OFFLINE — RECONNECTING</span>
      <span class="sb-score">${m.teams[0].tag} ${m.score[0]}<span class="sb-vs">—</span>${m.score[1]} ${m.teams[1].tag}</span>
      <span class="sb-round">${ctx === "chess" ? "GAME" : "ROUND"} <b class="sb-rd">${m.live ? m.live.servRound : 7}</b> · SERVER-TRACKED</span>
      <div class="sb-pips">${pips}</div>
      <span class="sb-note">Live scoreboard keeps updating while the video is down</span>
    </div>`;
  }
  function animateScoreboard(host, m) {
    const rd = $(".sb-rd", host);
    if (!rd || reducedMotion) return;
    let r = m.live ? m.live.servRound : 7;
    const t = setInterval(() => {
      if (!host.isConnected || !rd.isConnected) { clearInterval(t); return; }
      r += 1;
      rd.textContent = r;
    }, 6000);
  }

  /* ================= Floating PiP (§2B) ================= */

  const pip = $("#pip");
  const pipMedia = $("#pip-media");

  function toPip() {
    if (!popMatch || !sim) return;
    pipMatch = popMatch.id;
    $("#pip-title").textContent = matchLabel(popMatch);
    $("#pip-bar-text").textContent =
      `${popMatch.teams[0].tag} ${popMatch.score[0]} — ${popMatch.score[1]} ${popMatch.teams[1].tag} · RD ${popMatch.live ? popMatch.live.servRound : ""}`;
    pip.hidden = false;
    pip.classList.remove("minimized");
    $("#pip-bar").hidden = true;
    pipMedia.appendChild(popMedia.firstElementChild);
    sim.setActive(true);
    pop.classList.remove("open");
    if (popNode) popNode.classList.remove("is-active");
  }
  function closePipPlayer() {
    pipMatch = null;
    pip.hidden = true;
    if (pipMedia.firstElementChild) popMedia.appendChild(pipMedia.firstElementChild);
    if (sim) sim.setActive(false);
  }
  $("#mpop-pip").addEventListener("click", toPip);
  $("#pip-close").addEventListener("click", closePipPlayer);
  $("#pip-min").addEventListener("click", () => { pip.classList.add("minimized"); $("#pip-bar").hidden = false; });
  $("#pip-restore").addEventListener("click", () => { pip.classList.remove("minimized"); $("#pip-bar").hidden = true; });

  /* Auto-dock when the watched node leaves the viewport */
  const watchIO = new IntersectionObserver((entries) => {
    entries.forEach((en) => {
      if (!en.isIntersecting && popMatch && popNode === en.target && !pipMatch) {
        toPip();
        toast("Stream follows you — floating PiP engaged", "ok", "◱");
      }
    });
  }, { threshold: 0.15 });
  new MutationObserver(() => {
    $$(".mnode.is-live", inner).forEach((n) => watchIO.observe(n));
  }).observe(inner, { childList: true, subtree: true });

  /* PiP drag */
  (function () {
    const head = $("#pip-drag");
    let on = false, sx = 0, sy = 0, ox = 0, oy = 0;
    head.addEventListener("pointerdown", (e) => {
      on = true; sx = e.clientX; sy = e.clientY;
      const r = pip.getBoundingClientRect(); ox = r.left; oy = r.top;
      head.setPointerCapture(e.pointerId);
    });
    head.addEventListener("pointermove", (e) => {
      if (!on) return;
      pip.style.left = Math.max(8, Math.min(innerWidth - pip.offsetWidth - 8, ox + e.clientX - sx)) + "px";
      pip.style.top = Math.max(8, Math.min(innerHeight - 60, oy + e.clientY - sy)) + "px";
      pip.style.right = "auto"; pip.style.bottom = "auto";
    });
    head.addEventListener("pointerup", () => { on = false; });
  })();

  /* ================= Dual-cast theater (§2C) ================= */

  const theater = $("#theater");
  let thrSims = [], thrTimers = [], thrMatch = null;

  function matchLabel(m) {
    return `${TEMPLATE.rounds[m.round].title} · ${m.teams[0].name} vs ${m.teams[1].name}`;
  }

  function openTheater(m) {
    if (m.state !== "live") return;
    closePop();
    thrMatch = m;
    theater.hidden = false;
    document.body.style.overflow = "hidden";
    $("#thr-title").textContent = matchLabel(m);
    $("#thr-server").textContent = m.live.desync
      ? `⚠ STREAM DELAYED ${m.live.lat}s — ROUND ${m.live.servRound} ACTIVE IN GAME ENGINE`
      : `Sync OK · ${m.live.lat}s latency · Round ${m.live.servRound}`;
    $("#thr-cap-a").textContent = `${m.teams[0].tag} ${ctx === "chess" ? m.teams[0].name : "nova"} · POV · @${m.teams[0].tw}`;
    $("#thr-cap-b").textContent = `${m.teams[1].tag} ${ctx === "chess" ? m.teams[1].name : "onyx"} · POV · @${m.teams[1].tw}`;

    ["a", "b"].forEach((k, i) => {
      const host = $("#thr-media-" + k);
      host.innerHTML = "";
      if (m.offline && i === 0) {
        host.innerHTML = scoreboardHTML(m);
        animateScoreboard(host, m);
        return;
      }
      thrSims.push(ICLStreams.mountStream(host, {
        mode: ctx === "chess" ? "chess" : "fps",
        tag: m.teams[i].tag, active: true,
        score: m.score.slice(), round: m.live.servRound,
        names: [m.teams[0].name, m.teams[1].name],
      }));
    });

    // Stats meters (single hue; identity is carried by panel position)
    const m1l = $("#thr-m1-label"), m2l = $("#thr-m2-label");
    if (ctx === "chess") { m1l.textContent = "Accuracy"; m2l.textContent = "Accuracy"; }
    else { m1l.textContent = "K/D ratio"; m2l.textContent = "Accuracy"; }
    thrTimers.push(setInterval(() => {
      const v1 = ctx === "chess" ? (92 + Math.random() * 7) : (1.2 + Math.random() * 1.1);
      const v2 = 55 + Math.random() * 40;
      $("#thr-m1-val").textContent = ctx === "chess" ? v1.toFixed(1) + "%" : v1.toFixed(2);
      $("#thr-m1-fill").style.width = (ctx === "chess" ? v1 : v1 * 38) + "%";
      $("#thr-m2-val").textContent = v2.toFixed(0) + "%";
      $("#thr-m2-fill").style.width = v2 + "%";
    }, reducedMotion ? 1e9 : 2800));

    renderTheaterList(m);
    startChat(m);
    $("#thr-close").focus();
  }

  function renderTheaterList(sel) {
    const list = $("#thr-list");
    list.innerHTML = "";
    matches.forEach((m) => {
      if (!m.teams[0] || !m.teams[1]) return;
      const row = document.createElement(m.state === "live" ? "button" : "div");
      row.className = "thr-row is-" + m.state + (m === sel ? " is-sel" : "");
      row.innerHTML = `<span class="r-round">${TEMPLATE.rounds[m.round].key}</span>
        <span class="r-names">${m.teams[0].tag} vs ${m.teams[1].tag}</span>
        <span class="r-score">${m.score[0] ?? "·"}–${m.score[1] ?? "·"}${m.state === "live" ? " ●" : ""}</span>`;
      if (m.state === "live") row.addEventListener("click", () => { closeTheater(true); openTheater(m); });
      list.appendChild(row);
    });
  }

  /* Room chat (roadmap #18) */
  const CHAT_SEED = [
    ["SYS", "Room opened · Discord voice bridged", "c-sys"],
    ["coach_hex", "watch their B-site default, same as map 1"],
    ["sable [C]", "we anti-flash the retake, hold picks", "c-cap"],
    ["viewer_2041", "crowd for this one is insane"],
  ];
  const CHAT_LOOP = [
    ["viewer_88", "that clutch was criminal"],
    ["coach_hex", "eco next round, stack A"],
    ["sable [C]", "gg wp so far, stay warm", "c-cap"],
    ["SYS", "Server: round result confirmed", "c-sys"],
  ];
  let chatI = 0;
  function pushChat(who, msg, cls) {
    const log = $("#chat-log");
    const line = document.createElement("div");
    line.className = "chat-line";
    line.innerHTML = `<span class="c-who ${cls || ""}"></span><span class="c-msg"></span>`;
    line.firstElementChild.textContent = who;
    line.lastElementChild.textContent = msg;
    log.appendChild(line);
    while (log.children.length > 40) log.firstElementChild.remove();
    log.scrollTop = log.scrollHeight;
  }
  function startChat(m) {
    const log = $("#chat-log");
    log.innerHTML = "";
    $("#chat-room").textContent = `#${m.id}-${m.teams[0].tag.toLowerCase()}-${m.teams[1].tag.toLowerCase()}`;
    CHAT_SEED.forEach((c) => pushChat(c[0], c[1], c[2]));
    if (!reducedMotion) {
      thrTimers.push(setInterval(() => {
        const c = CHAT_LOOP[chatI++ % CHAT_LOOP.length];
        pushChat(c[0], c[1], c[2]);
      }, 5200));
    }
  }
  $("#chat-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const inp = $("#chat-input");
    if (!inp.value.trim()) return;
    pushChat("you", inp.value.trim());
    inp.value = "";
  });

  function closeTheater(soft) {
    thrSims.forEach((s) => s.destroy());
    thrSims = [];
    thrTimers.forEach(clearInterval);
    thrTimers = [];
    thrMatch = null;
    theater.hidden = true;
    if (!soft) document.body.style.overflow = "";
  }
  $("#thr-close").addEventListener("click", () => closeTheater());
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !theater.hidden) closeTheater();
  });
  $("#mpop-dual").addEventListener("click", () => { if (popMatch) openTheater(popMatch); });

  /* ================= Check-in & registration (edge-case C) ================= */

  function checkinFlow(m) {
    verifyFlow({
      title: m ? `Check in · ${m.teams[0].name} vs ${m.teams[1].name}` : "Tournament registration",
      sub: "Progressive verification — most of it is already done.",
      cta: m ? "Lock in — ready" : "Enter tournament",
      steps: [
        { label: "Account linked", sub: "ICL competitive identity", done: true },
        { label: "Anti-cheat record active", sub: ctx === "chess" ? "Fair-play engine handshake" : "Vanguard / VAC handshake", done: true },
        { label: "Syncing verified skill data", sub: ctx === "chess" ? "Chess.com API · rating history" : "Riot API · ranked history", ms: 2600, doneSub: "Verified — no smurf flags" },
        { label: "Fair-play score check", sub: "Reliability 90+ required for staked brackets", ms: 1300, doneSub: "Score 92 — cleared" },
      ],
      onDone: () => toast(m ? "Checked in — opponent notified" : "Registered — seed assigned at lock", "ok", "⚑"),
    });
  }
  $("#register-btn").addEventListener("click", () => checkinFlow(null));

  /* ================= Demo dock: PRD edge cases ================= */

  const dockBtn = $("#demo-dock-btn"), dockPop = $("#demo-dock-pop");
  dockBtn.addEventListener("click", () => {
    const open = dockPop.hidden;
    dockPop.hidden = !open;
    dockBtn.setAttribute("aria-expanded", String(open));
    dockBtn.textContent = (open ? "▼" : "▲") + " DEMO — edge cases";
  });

  const firstLive = () => matches.find((m) => m.state === "live");
  $("#ec-drop").addEventListener("click", () => {
    const m = firstLive();
    if (!m) return;
    m.offline = true;
    if (pipMatch === m.id) closePipPlayer();
    if (sim && simMatch === m.id) { sim.destroy(); sim = null; simMatch = null; popMedia.innerHTML = ""; }
    render();
    toast(`@${m.teams[0].tw} dropped — scoreboard fallback active on ${m.teams[0].tag} vs ${m.teams[1].tag}`, "warn", "⚠");
  });
  $("#ec-restore").addEventListener("click", () => {
    const m = matches.find((x) => x.offline);
    if (!m) return;
    m.offline = false;
    if (simMatch === m.id) { simMatch = null; popMedia.innerHTML = ""; sim = null; }
    render();
    toast("Stream restored — video feed back in the node", "ok", "▶");
  });
  $("#ec-low").addEventListener("click", () => ICL.perf.set(!ICL.perf.low, "manual toggle"));
  $("#ec-shuffle").addEventListener("click", () => {
    closeTheater(); closePipPlayer(); closePop();
    if (sim) { sim.destroy(); sim = null; simMatch = null; popMedia.innerHTML = ""; }
    buildData(true);
    render();
    toast("Entrants randomized — bracket reseeded", "ok", "⇄");
  });

  /* ================= Backdrop customizer (roadmap #6) ================= */

  const BG_KEY = "icl.bracket.bg";
  const bgBtn = $("#bg-btn"), bgPop = $("#bg-pop");
  bgBtn.addEventListener("click", () => {
    bgPop.hidden = !bgPop.hidden;
    bgBtn.setAttribute("aria-expanded", String(!bgPop.hidden));
  });
  document.addEventListener("click", (e) => {
    if (!bgPop.hidden && !e.target.closest("#bg-pop") && !e.target.closest("#bg-btn")) bgPop.hidden = true;
  });

  function applyBg(cfg) {
    stage.dataset.scheme = cfg.scheme || "arena";
    $$(".bg-sw").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.scheme === stage.dataset.scheme)));
    if (cfg.url) {
      stage.style.backgroundImage = `url("${cfg.url}")`;
      stage.classList.add("has-image");
    } else {
      stage.style.backgroundImage = "";
      stage.classList.remove("has-image");
    }
    localStorage.setItem(BG_KEY, JSON.stringify(cfg));
  }
  $$(".bg-sw").forEach((b) => b.addEventListener("click", () => applyBg({ scheme: b.dataset.scheme })));
  $("#bg-apply").addEventListener("click", () => {
    const url = $("#bg-url").value.trim();
    if (url) applyBg({ scheme: stage.dataset.scheme, url });
  });
  $("#bg-clear").addEventListener("click", () => { $("#bg-url").value = ""; applyBg({ scheme: "arena" }); });
  try { applyBg(JSON.parse(localStorage.getItem(BG_KEY)) || { scheme: "arena" }); } catch { applyBg({ scheme: "arena" }); }

  /* ================= Context switching (IA §5) ================= */

  function applyCtxCopy() {
    const chess = ctx === "chess";
    $("#t-eyebrow").textContent = chess ? "ICL Classical Cup · Season 4 · Knockout" : "ICL Invitational · Season 4 · Playoffs";
    $("#t-title").textContent = chess ? "Classical Cup Championship" : "Tactical Division Championship";
    $("#t-prize").textContent = chess ? "$3,000" : "$12,500";
    $("#t-teams-label").textContent = chess ? "PLAYERS" : "TEAMS";
    const room = $("[data-room-link]");
    if (room) room.textContent = chess ? "Challenger Hall" : "Combat Room";
  }

  document.addEventListener("icl:context", (e) => {
    ctx = e.detail.ctx;
    closeTheater(); closePipPlayer(); closePop();
    if (sim) { sim.destroy(); sim = null; simMatch = null; popMedia.innerHTML = ""; }
    buildData(false);
    applyCtxCopy();
    render();
  });

  /* ================= Boot ================= */

  buildData(false);
  applyCtxCopy();
  render();

  if (location.hash === "#dualcast") {
    setTimeout(() => { const m = firstLive(); if (m) openTheater(m); }, reducedMotion ? 0 : 400);
  }
})();
