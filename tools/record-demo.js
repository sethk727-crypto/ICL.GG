/* ============================================================
   ICL.GG — demo video recorder (resilient cut)
   Drives the real site with a visible cursor + captions and
   records ~95s: landing variants → hover-stream → PiP →
   bracket → dual-cast theater + chat → offline fallback →
   chess context → verified matchmaking → directory → CTA.
   Scenes are isolated: a hiccup logs + screenshots, never
   kills the take.
   ============================================================ */
const { chromium } = require("playwright");
const path = require("path");
const fs = require("fs");

const BASE = process.env.ICL_BASE || "http://localhost:8901";
const VID_DIR = path.join(__dirname, "video");
fs.mkdirSync(VID_DIR, { recursive: true });

const INJECT = `(() => {
  const boot = () => {
    if (document.getElementById('__cur')) return;
    const s = document.createElement('style');
    s.textContent = \`
      ::-webkit-scrollbar{display:none!important}
      *{scrollbar-width:none!important}
      #__cur{position:fixed;z-index:2147483647;width:22px;height:22px;border-radius:50%;
        border:2.5px solid #f5b335;background:rgba(245,179,53,.28);pointer-events:none;
        margin-left:-11px;margin-top:-11px;transition:transform .12s;opacity:0;left:0;top:0;
        box-shadow:0 0 16px rgba(245,179,53,.55)}
      #__cur.on{opacity:1}
      #__cur.dn{transform:scale(.7)}
      #__cap{position:fixed;z-index:2147483646;top:84px;left:50%;transform:translateX(-50%);
        background:rgba(8,13,24,.95);border:1px solid rgba(245,179,53,.55);border-left:3px solid #f5b335;
        color:#f2f6ff;font:600 16px/1.45 ui-monospace,Menlo,Consolas,monospace;letter-spacing:.04em;
        padding:12px 26px;max-width:72vw;text-align:center;opacity:0;transition:opacity .3s;
        clip-path:polygon(0 0,calc(100% - 10px) 0,100% 10px,100% 100%,10px 100%,0 calc(100% - 10px));
        box-shadow:0 12px 44px rgba(0,0,0,.65);pointer-events:none}
    \`;
    document.head.appendChild(s);
    const c = document.createElement('div'); c.id = '__cur'; document.body.appendChild(c);
    const cap = document.createElement('div'); cap.id = '__cap'; document.body.appendChild(cap);
    addEventListener('mousemove', e => { c.classList.add('on'); c.style.left = e.clientX + 'px'; c.style.top = e.clientY + 'px'; }, true);
    addEventListener('mousedown', () => c.classList.add('dn'), true);
    addEventListener('mouseup', () => c.classList.remove('dn'), true);
    window.__cap = (t) => {
      cap.style.opacity = '0';
      if (t) setTimeout(() => { cap.textContent = t; cap.style.opacity = '1'; }, 280);
    };
  };
  if (document.readyState === 'loading') addEventListener('DOMContentLoaded', boot); else boot();
})();`;

(async () => {
  const browser = await chromium.launch({ executablePath: "process.env.CHROMIUM_PATH" });
  const ctx = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    recordVideo: { dir: VID_DIR, size: { width: 1920, height: 1080 } },
  });
  await ctx.addInitScript(INJECT);
  const page = await ctx.newPage();
  page.setDefaultTimeout(15000);

  const sleep = (ms) => page.waitForTimeout(ms);
  const cap = (t) => page.evaluate((x) => window.__cap && window.__cap(x), t).catch(() => {});
  const settle = () =>
    page.evaluate(() => { if (window.ICL) ICL.perf.set = () => {}; }).catch(() => {});

  async function moveTo(sel, dx = 0, dy = 0, steps = 30) {
    const loc = page.locator(sel).first();
    // targets below the fold never receive a hover from raw mouse moves —
    // smooth-scroll them into frame first (also reads better on video)
    const scrolled = await loc.evaluate((el) => {
      const r = el.getBoundingClientRect();
      const need = r.top < 90 || r.bottom > innerHeight - 40;
      if (need) el.scrollIntoView({ behavior: "smooth", block: "center" });
      return need;
    }).catch(() => false);
    if (scrolled) await sleep(900);
    const b = await loc.boundingBox();
    if (!b) throw new Error("no box: " + sel);
    const x = b.x + b.width / 2 + dx, y = b.y + b.height / 2 + dy;
    await page.mouse.move(x, y, { steps });
    return { x, y };
  }
  /* visual mouse click; if `verify` says the UI didn't react, fall back
     to a DOM click so the take never stalls on a missed hit-target */
  async function clickAt(sel, verify) {
    await moveTo(sel);
    await sleep(280);
    await page.mouse.down(); await sleep(90); await page.mouse.up();
    if (verify) {
      await sleep(150);
      const ok = await page.evaluate(verify).catch(() => false);
      if (!ok) await page.evaluate((s) => { const el = document.querySelector(s); if (el) el.click(); }, sel);
    }
  }
  async function scrollToSel(sel, offset = -90) {
    await page.evaluate(([s, o]) => {
      const el = document.querySelector(s);
      if (el) window.scrollTo({ top: el.getBoundingClientRect().top + scrollY + o, behavior: "smooth" });
    }, [sel, offset]);
  }
  let sceneN = 0;
  async function scene(name, fn) {
    sceneN += 1;
    try { await fn(); console.log("✓", name); }
    catch (e) {
      console.log("✗", name, "—", e.message);
      await page.screenshot({ path: path.join(VID_DIR, `fail-${sceneN}-${name.replace(/\W+/g, "_")}.png`) }).catch(() => {});
    }
  }

  /* ================= LANDING ================= */
  await page.goto(BASE + "/index.html", { waitUntil: "networkidle" });
  await page.evaluate(() => { try { localStorage.clear(); } catch {} });
  await page.goto(BASE + "/index.html", { waitUntil: "networkidle" });
  await settle();

  await scene("opening", async () => {
    await page.mouse.move(960, 620, { steps: 4 });
    await cap("ICL.GG — the Unified Competitive Engine");
    await sleep(2400);
  });

  await scene("intents", async () => {
    await cap("The landing reshapes around the visitor's goal");
    await clickAt('[data-intent="organize"]'); await sleep(1500);
    await clickAt('[data-intent="join-team"]'); await sleep(1500);
    await clickAt('[data-intent="play"]'); await sleep(1000);
  });

  await scene("game-variants", async () => {
    await cap("Every launch title gets its own landing — theme included");
    await clickAt('[data-game="chess"]'); await sleep(1900);
    await clickAt('[data-game="cs2"]'); await sleep(1100);
  });

  await scene("hover-stream", async () => {
    await cap("Hover a live node — its stream fades in beside it, muted");
    await moveTo("#demo-node-live");
    await page.waitForSelector("#demo-pop.open", { timeout: 4000 });
    await sleep(2900);
  });

  await scene("pip", async () => {
    await cap("Pop it out — the stream follows you as a floating PiP");
    await moveTo("#demo-pop .sp-media", 0, 0, 22); await sleep(400);
    await clickAt("#demo-pip-btn", () => !document.querySelector("#pip").hidden);
    await page.waitForSelector("#pip:not([hidden])", { timeout: 3000 });
    await sleep(800);
    await cap("Keep browsing — the match rides along");
    await scrollToSel(".features"); await sleep(1900);
    const head = await page.locator("#pip-drag").boundingBox();
    if (head) {
      await page.mouse.move(head.x + head.width / 2, head.y + head.height / 2, { steps: 16 });
      await page.mouse.down();
      await page.mouse.move(head.x - 320, head.y - 150, { steps: 30 });
      await page.mouse.up();
      await sleep(1200);
    }
    if (await page.locator("#pip-close").isVisible()) {
      await clickAt("#pip-close", () => document.querySelector("#pip").hidden);
    }
    await sleep(400);
  });

  await scene("landing-tour", async () => {
    await cap("Verified APIs, live-watch brackets, fair-play scores");
    await scrollToSel(".testimonial", -180); await sleep(2000);
    await cap(null);
    await scrollToSel(".closer", -120); await sleep(1700);
  });

  /* ================= BRACKET ================= */
  await page.goto(BASE + "/bracket.html", { waitUntil: "networkidle" });
  await settle();

  await scene("bracket-reveal", async () => {
    await page.mouse.move(960, 560, { steps: 4 });
    await cap("The live bracket — seeds, records, twitch handles in every node");
    await sleep(1500);
    await page.evaluate(() => {
      const el = document.querySelector(".bracket-stage");
      if (el) window.scrollTo({ top: el.getBoundingClientRect().top + scrollY - 40, behavior: "smooth" });
    });
    await sleep(1600);
  });

  await scene("bracket-hover", async () => {
    await cap("Hover to scout — live stream, latency, combat stats");
    await moveTo('[data-match="q2"]');
    await page.waitForSelector("#mpop.open", { timeout: 4000 });
    await sleep(3100);
  });

  await scene("desync", async () => {
    await cap("Stream 8s behind? The sync badge shows true server state");
    await moveTo('[data-match="q3"]');
    await page.waitForSelector("#mpop.open", { timeout: 4000 });
    await sleep(3000);
  });

  await scene("theater", async () => {
    await cap("Click for dual-cast — both POVs, live stats, room chat");
    await clickAt('[data-match="q2"]', () => !document.querySelector("#theater").hidden);
    await page.waitForSelector("#theater:not([hidden])", { timeout: 4000 });
    await sleep(2500);
    await clickAt("#chat-input");
    await page.keyboard.type("that retake was criminal — crowd going wild", { delay: 36 });
    await sleep(250);
    await page.keyboard.press("Enter");
    await sleep(1600);
    await clickAt("#thr-close", () => document.querySelector("#theater").hidden);
    await sleep(600);
  });

  await scene("offline-fallback", async () => {
    await cap("A stream drops? Server-tracked scoreboard takes over — instantly");
    await clickAt("#demo-dock-btn"); await sleep(450);
    await clickAt("#ec-drop", () => !!document.querySelector(".mnode.is-offline"));
    await sleep(400);
    await clickAt("#demo-dock-btn"); await sleep(250);
    await moveTo(".mnode.is-offline");
    await sleep(3000);
  });

  await scene("chess-context", async () => {
    await cap("One engine, every game — flip the context to chess");
    await clickAt('[data-ctx-btn="chess"]'); await sleep(1500);
    await moveTo('[data-match="q2"]');
    await sleep(3100);
  });

  /* ================= MATCHMAKING ================= */
  await page.goto(BASE + "/dashboard.html", { waitUntil: "networkidle" });
  await settle();

  await scene("challenger-hall", async () => {
    await page.mouse.move(960, 540, { steps: 4 });
    await cap("Challenger Hall — verified 1v1 queue, ratings straight from the API");
    await sleep(2200);
  });

  await scene("combat-room", async () => {
    await clickAt('[data-ctx-btn="fps"]');
    await cap("Combat Room — LFG filtered to verified Immortal+ by default");
    await sleep(2100);
  });

  await scene("verification", async () => {
    await cap("Join a lobby — progressive verification clears you in seconds");
    await clickAt(".lobby .btn-amber", () => !!document.querySelector("#icl-verify-veil.open"));
    await page.waitForSelector("#icl-verify-veil .btn-amber:not([disabled])", { timeout: 15000 });
    await sleep(650);
    await clickAt("#icl-verify-veil .btn-amber");
    await sleep(1500);
  });

  /* ================= DIRECTORY ================= */
  await page.goto(BASE + "/browse.html?tab=tournaments", { waitUntil: "networkidle" });
  await settle();

  await scene("directory", async () => {
    await page.mouse.move(960, 540, { steps: 4 });
    await cap("Open cups, waiting rooms, and no-cap ARENA — one directory");
    await sleep(2100);
    await moveTo(".listing.is-arena"); await sleep(1500);
    await clickAt('[data-tab="teams"]');
    await cap("Recruiting teams too — records and fair-play scores attached");
    await sleep(2200);
  });

  /* ================= FINALE ================= */
  await page.goto(BASE + "/index.html", { waitUntil: "networkidle" });
  await settle();

  await scene("finale", async () => {
    await page.evaluate(() => {
      // the site's own smooth-scroll would eat the hold — jump instantly
      document.documentElement.style.scrollBehavior = "auto";
      const el = document.querySelector(".closer");
      if (el) window.scrollTo({ top: el.getBoundingClientRect().top + scrollY - 240 });
    });
    await sleep(400);
    await cap("Ready to prove your rank? — ICL.GG");
    await moveTo(".closer .btn-amber", 0, 0, 26);
    await sleep(3400);
    await cap(null);
    await sleep(800);
  });

  await ctx.close();
  const p = await page.video().path();
  const out = path.join(VID_DIR, "raw.webm");
  fs.renameSync(p, out);
  console.log("RECORDED:", out, Math.round(fs.statSync(out).size / 1024), "KB");
  await browser.close();
})().catch((e) => { console.error("FAILED:", e.message); process.exit(1); });
