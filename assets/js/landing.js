/* ============================================================
   ICL.GG — landing.js
   Intent picker (Play / Organize / Start a team / Join a team),
   per-game landing variants, hero live-node demo with hover
   preview + PiP, count-up proof tiles, 15-second tour.
   ============================================================ */
(function () {
  "use strict";
  const { $, $$, reducedMotion, setContext, toast } = window.ICL;

  /* ---------- Intent picker — the landing changes with the goal ---------- */

  const INTENTS = {
    play: {
      eyebrow: "Season 4 · Verified brackets live now",
      h1: "Dominate the competitive stage. Win verified tournaments daily.",
      sub: 'No smurfs. No administrative tournament lag. Link your <b data-game-word>Counter-Strike</b> rank and compete in 30 seconds.',
      cta: "Enter bracket — free", href: "onboarding.html",
    },
    organize: {
      eyebrow: "For organizers & captains",
      h1: "Run a whole league without the spreadsheet night shift.",
      sub: "Brackets, rosters, scheduling, disputes, and payouts — automated. Switch a league into a playoff cup mid-season with one setting.",
      cta: "Create an event", href: "onboarding.html?intent=organize",
    },
    "start-team": {
      eyebrow: "Founders wanted",
      h1: "Found your roster. Draft, trade, and climb together.",
      sub: "Start a verified team, set your rank floor, and let the engine fill your five with players who actually show up.",
      cta: "Start a team", href: "onboarding.html?intent=start-team",
    },
    "join-team": {
      eyebrow: "Free agents",
      h1: "Get drafted by a team that actually shows up.",
      sub: "Your verified rank and fair-play score do the talking. Browse open teams with real seasons — no tryout spreadsheets.",
      cta: "Browse open teams", href: "browse.html?tab=teams",
    },
  };

  const GAMES = {
    cs2:   { word: "Counter-Strike", mode: "fps", ctx: "fps" },
    chess: { word: "Chess.com", mode: "chess", ctx: "chess" },
    lol:   { word: "League", mode: "fps", ctx: "fps" },
    dota2: { word: "Dota 2", mode: "fps", ctx: "fps" },
    fgc:   { word: "fighting-game", mode: "fps", ctx: "fps" },
  };

  let game = new URLSearchParams(location.search).get("game");
  if (!GAMES[game]) game = "cs2";
  let intent = "play";

  function applyIntent(id) {
    intent = INTENTS[id] ? id : "play";
    const it = INTENTS[intent];
    $("#hero-eyebrow").textContent = it.eyebrow;
    $("#hero-h1").innerHTML = it.h1;
    $("#hero-sub").innerHTML = it.sub;
    const cta = $("#hero-cta");
    cta.textContent = it.cta;
    cta.href = it.href;
    $$(".intent").forEach((b) => b.setAttribute("aria-selected", String(b.dataset.intent === intent)));
    applyGameWord();
  }

  function applyGameWord() {
    const w = $("[data-game-word]");
    if (w) w.textContent = GAMES[game].word;
  }

  function applyGame(id) {
    game = GAMES[id] ? id : "cs2";
    $$(".game-chip").forEach((b) => b.setAttribute("aria-selected", String(b.dataset.game === game)));
    setContext(GAMES[game].ctx);
    applyGameWord();
    swapDemoFlavor();
    history.replaceState(null, "", game === "cs2" ? location.pathname : "?game=" + game);
  }

  $$(".intent").forEach((b) => b.addEventListener("click", () => applyIntent(b.dataset.intent)));
  $$(".game-chip").forEach((b) => b.addEventListener("click", () => applyGame(b.dataset.game)));

  /* ---------- Hero demo: node data per game flavor ---------- */

  const node = $("#demo-node-live");
  const statsRow = $("#demo-stats");

  function swapDemoFlavor() {
    if (pipOn) fromPip();
    const chess = GAMES[game].mode === "chess";
    const rows = $$(".mnode-row", node);
    if (chess) {
      setRow(rows[0], "W", "Aurelius", "2143", "1");
      setRow(rows[1], "B", "KarlDuke", "2087", "0");
      $(".mnode-status", node).innerHTML = '<span class="dot dot-pulse"></span>LIVE · GAME 2';
      statsRow.innerHTML = "<span>Accuracy <b>96.1%</b></span><span>Brilliant <b>2</b></span><span>Time <b>08:41</b></span>";
    } else {
      setRow(rows[0], "VXN", "Vexen", "11–2", "1");
      setRow(rows[1], "KRA", "Krakatoa", "9–4", "0");
      $(".mnode-status", node).innerHTML = '<span class="dot dot-pulse"></span>LIVE · MAP 2';
      statsRow.innerHTML = "<span>nova K/D <b>1.84</b></span><span>HS <b>31%</b></span><span>ACS <b>276</b></span>";
    }
    if (sim) { sim.destroy(); sim = null; $("#demo-media").innerHTML = ""; }
    if (popOpen) mountSim(true);
  }

  function setRow(row, tag, name, rec, score) {
    $(".ttag", row).textContent = tag;
    $(".tname", row).textContent = name;
    $(".rec", row).textContent = rec;
    $(".tscore", row).textContent = score;
  }

  /* ---------- Hover-to-preview (PRD §2A) + PiP (§2B) ---------- */

  const pop = $("#demo-pop");
  const media = $("#demo-media");
  const pip = $("#pip");
  const pipMedia = $("#pip-media");
  let sim = null;
  let popOpen = false;
  let pipOn = false;
  let hideTimer = 0;

  function mountSim(active) {
    if (!sim) {
      sim = ICLStreams.mountStream(media, {
        mode: GAMES[game].mode, tag: "VXN", active: !!active,
        teams: [
          { tag: "VXN", players: ["nova", "drift", "hex", "sable", "kite"] },
          { tag: "KRA", players: ["onyx", "piper", "vale", "rook", "ember"] },
        ],
        names: ["Aurelius", "KarlDuke"],
      });
    } else sim.setActive(!!active);
  }

  function openPop() {
    clearTimeout(hideTimer);
    if (pipOn) return; // stream already popped out
    popOpen = true;
    pop.classList.add("open");
    mountSim(true);
    positionPop();
  }
  function closePop(soon) {
    clearTimeout(hideTimer);
    hideTimer = setTimeout(() => {
      popOpen = false;
      pop.classList.remove("open");
      if (sim && !pipOn) sim.setActive(false);
    }, soon ? 120 : 0);
  }
  function positionPop() {
    if (matchMedia("(max-width: 640px)").matches) { pop.style.top = ""; return; }
    // adjacent, below the hovered card — never covering it (PRD §2A)
    pop.style.top = node.offsetTop + node.offsetHeight + 10 + "px";
  }

  node.addEventListener("mouseenter", openPop);
  node.addEventListener("focus", openPop);
  node.addEventListener("mouseleave", () => closePop(true));
  node.addEventListener("blur", () => closePop(true));
  pop.addEventListener("mouseenter", openPop);
  pop.addEventListener("mouseleave", () => closePop(true));
  node.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openPop(); }
    if (e.key === "Escape") closePop();
  });

  const mute = $("#demo-mute");
  mute.addEventListener("click", () => {
    const muted = mute.getAttribute("aria-pressed") === "true";
    mute.setAttribute("aria-pressed", String(!muted));
    mute.textContent = muted ? "🔊 LIVE AUDIO" : "🔇 MUTED — click to unmute";
  });

  /* Pop out to PiP; the same canvas moves between containers so the
     stream never restarts. */
  function toPip() {
    if (!sim) mountSim(true);
    pipOn = true;
    popOpen = false;
    pop.classList.remove("open");
    pip.hidden = false;
    pip.classList.remove("minimized");
    $("#pip-bar").hidden = true;
    pipMedia.appendChild(media.firstElementChild);
    sim.setActive(true);
  }
  function fromPip() {
    pipOn = false;
    pip.hidden = true;
    if (pipMedia.firstElementChild) media.appendChild(pipMedia.firstElementChild);
    if (sim) sim.setActive(false);
  }

  $("#demo-pip-btn").addEventListener("click", toPip);
  $("#pip-close").addEventListener("click", fromPip);
  $("#pip-min").addEventListener("click", () => {
    pip.classList.add("minimized");
    $("#pip-bar").hidden = false;
  });
  $("#pip-restore").addEventListener("click", () => {
    pip.classList.remove("minimized");
    $("#pip-bar").hidden = true;
  });

  /* Auto-dock: previewing, then scrolling away → stream follows as PiP */
  const nodeIO = new IntersectionObserver((entries) => {
    entries.forEach((en) => {
      if (!en.isIntersecting && popOpen && !pipOn) {
        toPip();
        toast("Stream follows you — floating PiP engaged", "ok", "◱");
      }
    });
  }, { threshold: 0.2 });
  nodeIO.observe(node);

  /* Drag the PiP */
  (function drag() {
    const head = $("#pip-drag");
    let sx = 0, sy = 0, ox = 0, oy = 0, on = false;
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

  /* ---------- Caption cycling ---------- */

  const caps = $$(".dcap");
  let capI = 0;
  if (!reducedMotion) {
    setInterval(() => {
      caps[capI].classList.remove("is-on");
      capI = (capI + 1) % caps.length;
      caps[capI].classList.add("is-on");
    }, 4200);
  }

  /* ---------- Bento dual-cast mock sims ---------- */

  const bentoA = $("#bento-sim-a"), bentoB = $("#bento-sim-b");
  if (bentoA && bentoB) {
    ICLStreams.mountStream(bentoA, { mode: "fps", active: !reducedMotion });
    ICLStreams.mountStream(bentoB, { mode: "chess", active: !reducedMotion });
  }

  /* ---------- Proof tiles: count-up on reveal ---------- */

  const tiles = $$(".stat-tile .st-num");
  const fmt = (v, dec) => dec ? v.toFixed(1) : Math.round(v).toLocaleString("en-US");
  const tileIO = new IntersectionObserver((entries) => {
    entries.forEach((en) => {
      if (!en.isIntersecting) return;
      tileIO.unobserve(en.target);
      const el = en.target;
      const target = parseFloat(el.dataset.count);
      const dec = String(el.dataset.count).includes(".");
      const unit = el.dataset.unit ? `<span class="unit">${el.dataset.unit}</span>` : "";
      if (reducedMotion) { el.innerHTML = fmt(target, dec) + unit; return; }
      const t0 = performance.now();
      (function step(now) {
        const p = Math.min(1, (now - t0) / 1100);
        const eased = 1 - Math.pow(1 - p, 3);
        el.innerHTML = fmt(target * eased, dec) + unit;
        if (p < 1) requestAnimationFrame(step);
      })(t0);
    });
  }, { threshold: 0.4 });
  tiles.forEach((t) => tileIO.observe(t));

  /* ---------- 15-second tour ---------- */

  const stage = $("#tour-stage");
  const caption = $("#tour-caption");
  const bar = $("#tour-bar");
  const veil = $("#demo-veil");
  let tourSims = null;
  let tourTimers = [];

  const SCRIPT = [
    [0, 0, "A live node in the bracket tree. Round, series score, records — nothing extra."],
    [1800, 1, "Hover it — the opponent's stream fades in beside the card. Muted, 150 ms, zero clicks."],
    [6500, 2, "Scroll away to scout the rest of the bracket — the stream follows as a floating PiP."],
    [11000, 3, "Click Dual-Cast: both POVs side by side with live stats. Coaches never leave the page."],
  ];
  const TOTAL = 15000;

  function tourStart() {
    tourStop();
    if (!tourSims) {
      tourSims = ["a", "b", "c", "d"].map((k, i) =>
        ICLStreams.mountStream($("#tour-media-" + k), { mode: i === 3 ? "chess" : "fps", active: false }));
    }
    tourSims.forEach((s) => s.setActive(true));
    stage.dataset.phase = "0";
    bar.style.transition = "none";
    bar.style.width = "0";
    requestAnimationFrame(() => {
      bar.style.transition = `width ${TOTAL}ms linear`;
      bar.style.width = "100%";
    });
    SCRIPT.forEach(([t, phase, text]) => {
      tourTimers.push(setTimeout(() => {
        stage.dataset.phase = String(phase);
        caption.textContent = text;
      }, reducedMotion ? t / 10 : t));
    });
    tourTimers.push(setTimeout(() => {
      caption.textContent = "That's the live-watch bracket. Your turn.";
    }, reducedMotion ? TOTAL / 10 : TOTAL));
  }
  function tourStop() {
    tourTimers.forEach(clearTimeout);
    tourTimers = [];
    if (tourSims) tourSims.forEach((s) => s.setActive(false));
  }

  document.addEventListener("click", (e) => {
    if (e.target.closest('[data-modal-open="demo-veil"]')) tourStart();
  });
  $("#tour-replay").addEventListener("click", tourStart);
  veil.addEventListener("icl:modal-close", tourStop);

  /* ---------- Boot ---------- */

  applyIntent("play");
  applyGame(game);
})();
