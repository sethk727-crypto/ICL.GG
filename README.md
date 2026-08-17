# ICL.GG — Unified Competitive Engine

A complete, dependency-free front-end for the ICL.GG esports matchmaking & live-streaming
tournament platform, implementing the full [UX Strategy & PRD](docs/PRD.md) plus the
front-end items from the [engineering roadmap](docs/ROADMAP.md).

Plain HTML + CSS + vanilla JS. No build step, no framework, no external fonts or CDNs —
open it, host it anywhere, or lift sections straight into PHP/WordPress templates.

## Run it

```bash
# any static server works; there is no build step
npx serve .            # or: python3 -m http.server 8080
```

…or just open `index.html` in a browser. To publish on **GitHub Pages**: repo Settings →
Pages → deploy from branch, root folder. (`.nojekyll` is included.)

## Pages

| Page | What it is |
|---|---|
| `index.html` | Conversion landing (PRD §4): intent picker (Play / Organize / Start a team / Join a team), per-game variants (`?game=chess`, `cs2`, `lol`, `dota2`, `fgc`), live interactive bracket-node demo, 15-second tour, bento features, FAQ. |
| `onboarding.html` | Straight-line 5-step PLG signup (PRD §3) with a visible 30-second timer, deferred OAuth, endowed-progress qualification. `?intent=organize` / `start-team` variants. |
| `dashboard.html` | Context-swapping matchmaking (PRD §5): **Combat Room** (FPS LFG lobbies) ⟷ **Challenger Hall** (chess 1v1 queue), serious-by-default filters, join flows through the verification overlay, majority-rules reshuffle vote. |
| `bracket.html` | The live-watch bracket (PRD §2): hover-to-preview streams in nodes, floating/resizable/draggable PiP, split-screen dual-cast theater with room chat, Now-Streaming strip, twitch handles per team, customizable backdrop, randomize entrants — plus a demo dock that triggers every PRD §6 edge case. |
| `browse.html` | Directory (`?tab=tournaments|leagues|teams` — the future `icl.gg/tournaments` routes): open cup / waiting cup / ARENA states, league seasons, recruiting teams. One shared listing card style. |

## Structure

```
assets/
  css/ core.css       design tokens + chrome + shared components
       match.css      match nodes, stream preview, PiP, scoreboard fallback
       landing.css onboarding.css dashboard.css bracket.css browse.css
  js/  config.js      runtime flags (Twitch embeds, perf budget)
       core.js        context store, modals, toasts, verification flow, perf guard
       streamsim.js   canvas "live stream" sims (FPS + chess) + Twitch mount helper
       landing.js onboarding.js dashboard.js bracket.js browse.js
docs/  PRD.md ROADMAP.md
```

## The live streams

Streams are **canvas simulations** in this build (each canvas is watermarked "SIM FEED"),
so the whole UX runs offline. For production, edit `assets/js/config.js`:

```js
window.ICL_CONFIG = {
  useTwitchEmbeds: true,
  twitch: {
    parent: ["icl.gg", "www.icl.gg"],        // Twitch embed requirement
    channels: { VXN: "some_channel", KRA: "other_channel" },
  },
};
```

Any team tag mapped to a channel gets a real Twitch iframe (muted + autoplay) everywhere a
sim would appear — preview, PiP, theater; unmapped tags keep the simulation. YouTube IDs
slot into the same config as a fallback.

## PRD → implementation map

| PRD | Where |
|---|---|
| §2A hover-to-preview (150 ms, muted default) | `match.css` `.stream-pop`, `bracket.js` `openPop()` |
| §2B floating PiP (resizable, minimize-to-bar, auto-dock on scroll-away) | `#pip`, `bracket.js` / `landing.js` `toPip()` |
| §2C split-screen dual-cast theater (condensed bracket + dual POV + stats) | `bracket.html` `#theater` |
| §3 straight-line onboarding, deferred verification | `onboarding.html`, `ICL.verifyFlow()` in `core.js` |
| §3 serious-competitor filter defaults (Immortal+ / ELO 2000+) | `dashboard.js` filters |
| §4 landing blueprint (all 8 sections, exact copy) | `index.html` |
| §5 fixed anchors (wallet, identity, context toggle) + morphing dashboards | `.chrome` in every page, `dashboard.js` `applyRoom()` |
| §6A desync sync-badge ("stream delayed · round N in engine") | `.badge-desync`, QF-4 on the bracket |
| §6B offline scoreboard fallback | `.sb-fallback`, demo dock → "Drop a live stream" |
| §6C endowed-progress loader (2 steps pre-checked) | `ICL.verifyFlow()` |
| §6D lazy loading + telemetry low-power guard | `streamsim.js` IntersectionObserver gating, `ICL.perf` frame sampler |

## Demo video

A 2-minute MP4 tour of the whole build (landing variants → hover-stream → PiP →
dual-cast theater → edge cases → verified matchmaking → directory) lives at
[`docs/demo/icl-gg-demo.mp4`](docs/demo/icl-gg-demo.mp4) — ready to send out.

To re-record after changes: serve the site (`python3 -m http.server 8901`), then

```bash
npm i playwright && node tools/record-demo.js     # writes tools/video/raw.webm
# convert with any ffmpeg:
ffmpeg -ss 0.5 -i tools/video/raw.webm -c:v libx264 -preset slow -crf 20 \
  -pix_fmt yuv420p -r 30 -movflags +faststart -an docs/demo/icl-gg-demo.mp4
```

The script drives the real pages with a visible cursor and caption overlays;
set `ICL_BASE` / `CHROMIUM_PATH` env vars to point at another server or browser.

## Notes for the PHP/WordPress lift

- Components are self-contained: copy a card's markup + its CSS block; class names are
  flat and unprefixed by page.
- All data is inlined at the top of each page's JS file as plain arrays — replace with
  `wp_localize_script`/REST output and the renderers keep working.
- Deep links already match the planned routes: `browse.html?tab=leagues` ⇒ `icl.gg/leagues`.
- The design system commits to a single dark "broadcast arena" theme; every color is a
  token in `core.css` `:root`, and the per-game accent swaps via `[data-context]`.

Demo data throughout (teams, players, stats, streams) is fictional.
