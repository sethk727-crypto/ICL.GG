/* ============================================================
   ICL.GG — streamsim.js
   Canvas "live stream" simulations that stand in for Twitch
   embeds in this demo build. Two feeds: tactical FPS and chess.
   Production swap: when ICL_CONFIG.useTwitchEmbeds is true and a
   channel is mapped for the team tag, callers mount a Twitch
   iframe instead (see mountStream below).

   Perf contract (PRD edge-case D):
   - a sim renders only while BOTH visible in viewport AND marked
     active by its caller (hover / watched state)
   - global low-power mode freezes every sim into a static frame
   ============================================================ */
(function () {
  "use strict";

  const DPR = Math.min(window.devicePixelRatio || 1, 2);
  const W = 480, H = 270; // logical 16:9 space

  /* ---------- shared helpers ---------- */

  const rand = (a, b) => a + Math.random() * (b - a);
  const pick = (arr) => arr[(Math.random() * arr.length) | 0];
  const pad = (n) => String(n).padStart(2, "0");

  /* ---------- FPS feed ---------- */

  function makeAgents(count, side) {
    const list = [];
    for (let i = 0; i < count; i++) {
      list.push({
        side,
        x: side ? rand(330, 450) : rand(30, 150),
        y: rand(40, 230),
        tx: rand(60, 420), ty: rand(40, 230),
        speed: rand(14, 26),
        alive: true,
        trail: [],
      });
    }
    return list;
  }

  class FpsFeed {
    constructor(opts) {
      this.teams = opts.teams || [
        { tag: "ALW", players: ["nova", "drift", "hex", "sable", "kite"] },
        { tag: "BRV", players: ["onyx", "piper", "vale", "rook", "ember"] },
      ];
      this.agents = makeAgents(5, 0).concat(makeAgents(5, 1));
      this.kills = [];
      this.roundClock = 100;
      this.round = opts.round || 7;
      this.score = opts.score || [6, 5];
      this.hp = 100; this.ammo = 25;
      this.flash = 0;
      this.tracers = [];
    }
    step(dt) {
      this.roundClock -= dt;
      if (this.roundClock <= 0) {
        this.roundClock = 100;
        this.round += 1;
        this.score[Math.random() > 0.5 ? 0 : 1] += 1;
        this.agents.forEach((a) => { a.alive = true; });
      }
      for (const a of this.agents) {
        if (!a.alive) continue;
        const dx = a.tx - a.x, dy = a.ty - a.y;
        const d = Math.hypot(dx, dy);
        if (d < 4) { a.tx = rand(50, 430); a.ty = rand(35, 235); }
        else { a.x += (dx / d) * a.speed * dt; a.y += (dy / d) * a.speed * dt; }
        a.trail.push([a.x, a.y]);
        if (a.trail.length > 14) a.trail.shift();
      }
      this.tracers = this.tracers.filter((t) => (t.life -= dt) > 0);
      if (Math.random() < dt * 0.55) this.fight();
      if (Math.random() < dt * 2) this.ammo = Math.max(1, this.ammo - 1);
      if (this.ammo <= 1 && Math.random() < dt * 2) this.ammo = 25;
      if (Math.random() < dt * 0.3) this.hp = Math.max(8, this.hp - ((Math.random() * 30) | 0));
      if (Math.random() < dt * 0.2) this.hp = 100;
      this.flash = Math.max(0, this.flash - dt * 3);
      this.kills = this.kills.filter((k) => (k.life -= dt) > 0);
    }
    fight() {
      const a = pick(this.agents.filter((x) => x.alive && !x.side));
      const b = pick(this.agents.filter((x) => x.alive && x.side));
      if (!a || !b) return;
      this.tracers.push({ x1: a.x, y1: a.y, x2: b.x, y2: b.y, life: 0.22 });
      this.flash = 0.6;
      const victim = Math.random() > 0.5 ? b : a;
      victim.alive = false;
      setTimeout(() => { victim.alive = true; victim.x = victim.side ? 450 : 30; }, 2600);
      const killer = victim === b ? a : b;
      this.kills.push({
        who: pick(this.teams[killer.side ? 1 : 0].players),
        vic: pick(this.teams[victim.side ? 1 : 0].players),
        life: 3.4,
      });
    }
    draw(g) {
      // map ground
      g.fillStyle = "#0b1322";
      g.fillRect(0, 0, W, H);
      g.strokeStyle = "rgba(120,150,210,0.07)";
      g.lineWidth = 1;
      for (let x = 0; x <= W; x += 30) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, H); g.stroke(); }
      for (let y = 0; y <= H; y += 30) { g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); }
      // sites
      g.fillStyle = "rgba(120,150,210,0.05)";
      g.strokeStyle = "rgba(120,150,210,0.16)";
      [[40, 40, 120, 80], [320, 150, 120, 80], [200, 90, 90, 70]].forEach(([x, y, w, h]) => {
        g.fillRect(x, y, w, h); g.strokeRect(x, y, w, h);
      });
      g.fillStyle = "rgba(160,185,230,0.35)";
      g.font = "10px monospace";
      g.fillText("A SITE", 48, 54); g.fillText("B SITE", 328, 164); g.fillText("MID", 208, 104);
      // tracers + flash
      for (const t of this.tracers) {
        g.strokeStyle = `rgba(255,210,120,${t.life * 3})`;
        g.lineWidth = 1.4;
        g.beginPath(); g.moveTo(t.x1, t.y1); g.lineTo(t.x2, t.y2); g.stroke();
      }
      if (this.flash > 0) {
        g.fillStyle = `rgba(255,190,90,${this.flash * 0.05})`;
        g.fillRect(0, 0, W, H);
      }
      // agents
      for (const a of this.agents) {
        const col = a.side ? "91,198,232" : "255,101,71";
        for (let i = 0; i < a.trail.length; i++) {
          const [tx, ty] = a.trail[i];
          g.fillStyle = `rgba(${col},${(i / a.trail.length) * 0.16})`;
          g.fillRect(tx - 1, ty - 1, 2, 2);
        }
        if (a.alive) {
          g.fillStyle = `rgb(${col})`;
          g.beginPath(); g.arc(a.x, a.y, 3.4, 0, 7); g.fill();
          g.strokeStyle = `rgba(${col},0.35)`;
          g.beginPath(); g.arc(a.x, a.y, 6.5, 0, 7); g.stroke();
        } else {
          g.strokeStyle = "rgba(200,210,230,0.5)";
          g.lineWidth = 1.4;
          g.beginPath();
          g.moveTo(a.x - 4, a.y - 4); g.lineTo(a.x + 4, a.y + 4);
          g.moveTo(a.x + 4, a.y - 4); g.lineTo(a.x - 4, a.y + 4);
          g.stroke();
        }
      }
      // killfeed
      g.font = "10px monospace";
      this.kills.slice(-3).forEach((k, i) => {
        const y = 18 + i * 15;
        const txt = `${k.who}  ⟿  ${k.vic}`;
        const w = g.measureText(txt).width + 14;
        g.fillStyle = "rgba(6,10,18,0.72)";
        g.fillRect(W - w - 10, y - 10, w, 13);
        g.fillStyle = `rgba(255,120,120,${Math.min(1, k.life)})`;
        g.fillText(txt, W - w - 3, y);
      });
      // HUD
      const t = Math.max(0, this.roundClock | 0);
      g.fillStyle = "rgba(6,10,18,0.8)";
      g.fillRect(W / 2 - 56, 6, 112, 20);
      g.fillStyle = "#f2f6ff";
      g.font = "bold 11px monospace";
      g.textAlign = "center";
      g.fillText(`${this.score[0]}  ${pad((t / 60) | 0)}:${pad(t % 60)}  ${this.score[1]}`, W / 2, 20);
      g.textAlign = "left";
      g.fillStyle = "rgba(6,10,18,0.8)";
      g.fillRect(8, H - 26, 150, 18);
      g.fillStyle = "#9fe8b8";
      g.fillText(`HP ${pad(this.hp)}`, 14, H - 13);
      g.fillStyle = "#ffd27a";
      g.fillText(`AMMO ${pad(this.ammo)}/90`, 70, H - 13);
      g.fillStyle = "rgba(160,185,230,0.4)";
      g.fillText(`RD ${this.round}`, W / 2 - 12, H - 13);
    }
  }

  /* ---------- Chess feed (Morphy, Opera Game 1858) ---------- */

  const OPERA = [
    ["e2","e4"],["e7","e5"],["g1","f3"],["d7","d6"],["d2","d4"],["c8","g4"],
    ["d4","e5"],["g4","f3"],["d1","f3"],["d6","e5"],["f1","c4"],["g8","f6"],
    ["f3","b3"],["d8","e7"],["b1","c3"],["c7","c6"],["c1","g5"],["b7","b5"],
    ["c3","b5"],["c6","b5"],["c4","b5"],["b8","d7"],["e1","c1"],["a1","d1"],
    ["a8","d8"],["d1","d7"],["d8","d7"],["h1","d1"],["e7","e6"],["b5","d7"],
    ["f6","d7"],["b3","b8"],["d7","b8"],["d1","d8"],
  ];
  const EVALS = [0,0,.1,.1,.2,.1,.3,.2,.4,.3,.5,.4,.6,.5,.6,.5,.7,.6,.8,.7,1,.9,1.2,1.2,1.1,1.6,1.4,1.8,1.6,2.4,2.1,3.2,2.8,5];
  const GLYPH = { K:"♚", Q:"♛", R:"♜", B:"♝", N:"♞", P:"♟" };

  function initBoard() {
    const b = {};
    const back = ["R","N","B","Q","K","B","N","R"];
    "abcdefgh".split("").forEach((f, i) => {
      b[f + "1"] = { p: back[i], w: 1 }; b[f + "2"] = { p: "P", w: 1 };
      b[f + "8"] = { p: back[i], w: 0 }; b[f + "7"] = { p: "P", w: 0 };
    });
    return b;
  }

  class ChessFeed {
    constructor(opts) {
      this.names = opts.names || ["Morphy_ttv", "DukeKarl"];
      this.reset();
    }
    reset() {
      this.board = initBoard();
      this.idx = 0;
      this.timer = 1.4;
      this.last = null;
      this.clocks = [903, 887];
      this.done = 0;
    }
    step(dt) {
      this.clocks[this.idx % 2] = Math.max(0, this.clocks[this.idx % 2] - dt);
      this.timer -= dt;
      if (this.timer > 0) return;
      if (this.idx >= OPERA.length) {
        this.done += 1;
        if (this.done > 2) this.reset();
        this.timer = 1.6;
        return;
      }
      const [from, to] = OPERA[this.idx];
      const piece = this.board[from];
      if (piece) { delete this.board[from]; this.board[to] = piece; }
      this.last = [from, to];
      this.idx += 1;
      // castling pair + captures resolve on one visual beat
      this.timer = (this.idx === 24) ? 0.35 : rand(1.2, 2.1);
    }
    sq(fileRank) {
      const f = fileRank.charCodeAt(0) - 97;
      const r = 8 - +fileRank[1];
      return [f, r];
    }
    draw(g) {
      g.fillStyle = "#101826";
      g.fillRect(0, 0, W, H);
      const S = 30, ox = (W - S * 8) / 2, oy = (H - S * 8) / 2;
      for (let r = 0; r < 8; r++) for (let f = 0; f < 8; f++) {
        const dark = (r + f) % 2;
        g.fillStyle = dark ? "#3d4a63" : "#c9d4e8";
        g.fillRect(ox + f * S, oy + r * S, S, S);
      }
      if (this.last) {
        for (const cell of this.last) {
          const [f, r] = this.sq(cell);
          g.fillStyle = "rgba(245,179,53,0.4)";
          g.fillRect(ox + f * S, oy + r * S, S, S);
        }
      }
      g.textAlign = "center"; g.textBaseline = "middle";
      g.font = `${S - 6}px serif`;
      for (const cell in this.board) {
        const { p, w } = this.board[cell];
        const [f, r] = this.sq(cell);
        const cx = ox + f * S + S / 2, cy = oy + r * S + S / 2 + 1;
        g.fillStyle = w ? "#f6f1e4" : "#141a28";
        g.strokeStyle = w ? "#8f7f57" : "#5b6a8a";
        g.lineWidth = 1;
        g.strokeText(GLYPH[p], cx, cy);
        g.fillText(GLYPH[p], cx, cy);
      }
      // eval bar
      const ev = EVALS[Math.min(this.idx, EVALS.length - 1)];
      const share = 0.5 + Math.max(-0.45, Math.min(0.45, ev / 10));
      const bx = ox + 8 * S + 10;
      g.fillStyle = "#141a28"; g.fillRect(bx, oy, 9, S * 8);
      g.fillStyle = "#e9eef8"; g.fillRect(bx, oy + S * 8 * (1 - share), 9, S * 8 * share);
      g.strokeStyle = "rgba(160,185,230,0.3)"; g.strokeRect(bx, oy, 9, S * 8);
      // clocks + names
      g.textAlign = "left"; g.textBaseline = "alphabetic";
      g.font = "bold 11px monospace";
      const fmt = (s) => `${pad((s / 60) | 0)}:${pad(s % 60 | 0)}`;
      g.fillStyle = "rgba(6,10,18,0.8)";
      g.fillRect(ox - 84, oy + 4, 74, 34); g.fillRect(ox - 84, oy + S * 8 - 38, 74, 34);
      g.fillStyle = "#93a1c0";
      g.font = "9px monospace";
      g.fillText(this.names[1], ox - 78, oy + 16);
      g.fillText(this.names[0], ox - 78, oy + S * 8 - 26);
      g.font = "bold 12px monospace";
      g.fillStyle = this.idx % 2 ? "#f5b335" : "#e9eef8";
      g.fillText(fmt(this.clocks[1]), ox - 78, oy + 32);
      g.fillStyle = this.idx % 2 ? "#e9eef8" : "#f5b335";
      g.fillText(fmt(this.clocks[0]), ox - 78, oy + S * 8 - 10);
      g.fillStyle = "rgba(160,185,230,0.5)";
      g.font = "9px monospace";
      g.fillText(`MOVE ${1 + (this.idx >> 1)}`, ox - 78, oy + S * 4);
    }
  }

  /* ---------- Sim shell: sizing, lifecycle, gating ---------- */

  let LOW_POWER = false;
  const ALL = new Set();
  document.addEventListener("icl:lowpower", (e) => {
    LOW_POWER = e.detail.low;
    ALL.forEach((s) => s._sync());
  });

  const io = new IntersectionObserver((entries) => {
    for (const en of entries) {
      const sim = en.target._iclSim;
      if (sim) { sim.visible = en.isIntersecting; sim._sync(); }
    }
  }, { threshold: 0.05 });

  class StreamSim {
    constructor(canvas, opts) {
      this.canvas = canvas;
      this.opts = opts || {};
      this.mode = this.opts.mode || "fps";
      this.feed = this.mode === "chess" ? new ChessFeed(this.opts) : new FpsFeed(this.opts);
      this.g = canvas.getContext("2d");
      this.active = !!this.opts.active;
      this.visible = false;
      this.raf = 0;
      this.t = 0;
      canvas._iclSim = this;
      this._fit();
      this._ro = new ResizeObserver(() => this._fit());
      this._ro.observe(canvas);
      io.observe(canvas);
      ALL.add(this);
      this._still(); // paint one poster frame immediately
    }
    _fit() {
      const r = this.canvas.getBoundingClientRect();
      if (!r.width) return;
      this.canvas.width = r.width * DPR;
      this.canvas.height = r.height * DPR;
      this.scale = Math.min(this.canvas.width / W, this.canvas.height / H);
      this.offx = (this.canvas.width - W * this.scale) / 2;
      this.offy = (this.canvas.height - H * this.scale) / 2;
      this._still();
    }
    _frame(now) {
      this.raf = 0;
      const dt = Math.min(0.05, (now - (this.t || now)) / 1000);
      this.t = now;
      this.feed.step(dt);
      this._paint();
      if (this.running) this.raf = requestAnimationFrame(this._bound);
    }
    _paint() {
      const g = this.g;
      g.save();
      g.fillStyle = "#080d18";
      g.fillRect(0, 0, this.canvas.width, this.canvas.height);
      g.translate(this.offx, this.offy);
      g.scale(this.scale, this.scale);
      this.feed.draw(g);
      g.font = "8px monospace";
      g.textAlign = "left";
      g.fillStyle = "rgba(160,185,230,0.35)";
      g.fillText("SIM FEED — Twitch embed in production", 8, H - 4);
      g.restore();
    }
    _still() {
      if (!this.g || !this.canvas.width) return;
      this.feed.step(0.016);
      this._paint();
      if (LOW_POWER || !this.running) {
        const g = this.g;
        g.fillStyle = "rgba(8,13,24,0.55)";
        g.fillRect(0, 0, this.canvas.width, this.canvas.height);
        if (LOW_POWER) {
          g.fillStyle = "rgba(245,179,53,0.9)";
          g.font = `${12 * DPR}px monospace`;
          g.textAlign = "center";
          g.fillText("LOW-POWER MODE — LIVE SCORES ONLY", this.canvas.width / 2, this.canvas.height / 2);
        }
      }
    }
    get running() { return this.active && this.visible && !LOW_POWER; }
    _sync() {
      if (this.running && !this.raf) {
        this.t = 0;
        this._bound = this._bound || this._frame.bind(this);
        this.raf = requestAnimationFrame(this._bound);
      } else if (!this.running && this.raf) {
        cancelAnimationFrame(this.raf);
        this.raf = 0;
        this._still();
      } else if (!this.running) {
        this._still();
      }
    }
    setActive(on) { this.active = !!on; this._sync(); }
    destroy() {
      cancelAnimationFrame(this.raf);
      this._ro.disconnect();
      io.unobserve(this.canvas);
      ALL.delete(this);
      delete this.canvas._iclSim;
    }
  }

  /* ---------- Mount helper: sim now, Twitch iframe in production ---------- */

  function mountStream(host, opts) {
    const cfg = window.ICL_CONFIG || {};
    const tag = opts && opts.tag;
    const channel = cfg.useTwitchEmbeds && tag && cfg.twitch.channels[tag];
    if (channel) {
      const parents = cfg.twitch.parent.map((p) => "parent=" + encodeURIComponent(p)).join("&");
      const f = document.createElement("iframe");
      f.src = `https://player.twitch.tv/?channel=${encodeURIComponent(channel)}&${parents}&muted=true&autoplay=true`;
      f.allowFullscreen = true;
      f.setAttribute("title", `${channel} live on Twitch`);
      f.style.cssText = "width:100%;height:100%;border:0;display:block";
      host.appendChild(f);
      return { setActive() {}, destroy() { f.remove(); }, isEmbed: true };
    }
    const c = document.createElement("canvas");
    c.className = "sim-canvas";
    c.style.cssText = "width:100%;height:100%;display:block";
    host.appendChild(c);
    return new StreamSim(c, opts);
  }

  window.ICLStreams = { StreamSim, mountStream };
})();
