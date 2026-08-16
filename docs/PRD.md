# UX Strategy & Product Requirements Document (PRD)

**Unified Esports Matchmaking & Live-Streaming Tournament Platform — ICL.GG**

This document is the foundational UX strategy and PRD for the next-generation competitive
gaming platform. It synthesizes proven B2B and self-serve SaaS conversion, onboarding, and
positioning principles to create a frictionless, high-converting experience for serious
competitors.

> Implementation status: every pattern in this document is implemented in this repository.
> See the mapping table in the root [README](../README.md).

---

## 1. Executive summary & positioning strategy

Most competitive platforms suffer from a positioning problem: they position themselves as
casual community hubs but overwhelm serious players with cluttered interfaces, feature bloat
("featuritis"), and high-friction workflows.

Applying April Dunford's positioning framework:

- **True competitive alternatives:** manual Discord brackets, fragmented Google Sheets/Excel
  tracking, and slow ad-hoc tournament organization.
- **Unique attributes:** direct Riot/Steam/Chess.com API skill-verification, integrated
  anti-cheat scanning, and zero-latency, context-aware Twitch stream embedding directly
  inside bracket nodes.
- **Value proposition:** reduce administrative tournament lag, eliminate smurfing/cheating,
  and keep players in flow state.
- **Market category choice:** we reject the "casual gaming site" frame of reference and
  position this as the **Unified Competitive Engine (UCE)** — premium, high-performance
  matchmaking, secure financial stakes/wallets, and institutional-grade anti-cheat
  compliance.

## 2. UX strategy: minimized cognitive load & the "live-watch" bracket UX

Serious esports tournaments demand high information density, but exposing too much data at
once pushes users down the featuritis curve toward frustration and exit. To balance
tournament data with real-time video playback we employ **progressive disclosure** —
deferring advanced details to secondary screens or overlays to keep the main task intuitive
and clean.

```
+-------------------------------------------------------------------+
|  [Global Navigation - Game Context: Tactical Shooter]             |
+-------------------------------------------------------------------+
|  T O U R N A M E N T   B R A C K E T                              |
|  +--------------+         Hover Node Trigger                      |
|  | Card #1      | ----->  +------------------------------------+ |
|  | [Team A] vs  |         | Opponent Team Alpha Stream         | |
|  | [Team B]     |         |   [Live Twitch Player Embed]       | |
|  +--------------+         |   * Stream latency: 1.2s           | |
|                           |   * View Match Analytics           | |
|  +--------------+         +------------------------------------+ |
|  | Card #2      | <--- (Click Node: Launches Split-Screen        |
|  +--------------+        Theater Mode Panel below)                |
+-------------------------------------------------------------------+
|  S P L I T - S C R E E N   T H E A T E R   M O D E                |
|  [Player 1 Stream]              [Player 2 Stream]                 |
|  [Match Stats: K/D]             [Match Stats: Accuracy %]         |
+-------------------------------------------------------------------+
```

### A. Hover-to-preview node UX
- **User action:** hover over any match card (node) in the tournament tree.
- **UI response:** a lightweight, borderless modal fades in adjacent to the card **within
  150 ms**, displaying the live Twitch stream of the active match with real-time combat
  stats (Chess accuracy, Valorant K/D).
- **Anti-disorientation guard:** audio is muted by default (click-to-unmute).

### B. Floating picture-in-picture (PiP) UX
- **User action:** scroll away from an active match node to inspect other bracket regions.
- **UI response:** the live stream transitions into a floating, resizable PiP player in the
  lower-right viewport corner.
- **Friction reduction:** one-click minimize to a status bar keeps the user anchored without
  reloading or abandoning the bracket overview.

### C. Split-screen theater mode UX
- **User action:** click "Watch Match Dual-Cast" on any active matchup card.
- **UI response:** the bracket condenses into a left-hand panel; the right ~60% becomes a
  dual Twitch player layout.
- **Flow-state preservation:** both opponents' perspectives side by side let coaches and
  players analyze playstyles concurrently without leaving the platform.

## 3. Matchmaking & cross-platform UX (PLG flow)

We eliminate onboarding "red lights" that cause ability debt by replacing high-friction
signup sheets with **straight-line onboarding**:

```
[Instant Email Sign-Up / Google OAuth]
        ↓
[Direct Contextual Landing: LFG Matchmaking Lobby]   (quick win)
        ↓
[Tournament Bracket Visualization]                    (experienced value)
        ↓
[Progressive Verification: Discord / Riot / Steam]    (deferred setup barrier)
```

| Onboarding step | Primary UX mechanic |
|---|---|
| 1. Registration wall — "create account in 30 seconds" | Single-field email entry / Google SSO |
| 2. Persona alignment (progressive disclosure) | "Choose your game context" (Tactical FPS vs Chess) |
| 3. Instant value visualization | Auto-generated LFG dashboard with real-time lobbies |
| 4. External platform handshake (progressive verification) | OAuth prompts for Riot API, Steam, Discord |
| 5. Core match qualification (first quick win) | Instant rank verification + anti-cheat record |

Key mechanics:
- **Low-friction entry:** no upfront platform linking or email activation to view matches
  (prevents the ~27% activation drop-off of high-friction platforms).
- **Context selection:** "What is your main game today?" — the platform immediately adjusts
  visual theme and default statistics layout.
- **Serious-competitor filtering:** filters default to high ranks (Immortal+/Divine+/ELO
  2000+), past win rates, and verified anti-cheat records. Casual is the secondary option.
- **Friction-light verification handshake** on high-intent CTAs (Join Lobby / Register):
  Discord sync, Riot/Steam/Chess.com OAuth (server-verified data — no manual input or rank
  inflation), and an anti-cheat background handshake issuing a green **"Cleared"** trust
  badge.

## 4. High-converting landing page wireframe blueprint

Singular-focus conversion funnel with clean typography, controlled spacing, clear hierarchy.

| Section | Specification & copy mechanics |
|---|---|
| 1. Primary header | Minimal layout; links removed for singular focus. Accent CTA: "Enter Bracket". |
| 2. Hero | Headline (5th–7th-grade reading level): **"Dominate the competitive stage. Win verified tournaments daily."** Sub-headline: "No smurfs. No administrative tournament lag. Link your rank and compete in 30 seconds." Dual CTA: primary "Enter Bracket (free registration)", secondary "Watch 15-sec demo". Friction reducer: "Takes 30 seconds • No credit card required." |
| 3. Hero visual preview | Live, interactable tournament bracket node — click/hover to preview stream toggles and floating PiP layouts. |
| 4. Social proof bar | "15,000+ teams active" • "3.2M matches completed under anti-cheat compliance." |
| 5. Feature bento grid | Card A "1-Click Handshake" (Riot/Steam/Chess.com APIs) • Card B "The Live-Watch Advantage" (bracket streams + stats overlay) • Card C "Fair Play Verified" (anti-cheat auto-verification). |
| 6. Case-study testimonial | "We reduced team tournament registration and lobby matchmaking from 2 hours of manual Discord checks to 45 seconds of automatic lobby entry." — Clan captain, tier-1 CS league. |
| 7. FAQ & objection handling | "How do you detect smurfs?" • "What anti-cheat systems do you integrate with?" • "Are the prize pools and wallets secure?" |
| 8. Closing CTA | Bold contrast, first-person copy: "Ready to prove your rank? Enter the arena today." |

## 5. Cross-game information architecture (IA)

A **context-swapping** global navigation model. The primary platform chrome — unified
wallet, secure competitive identity, universal bracket mechanics — stays fixed; the
dashboard layout, metrics engine, and matchmaking profiles morph with the active game
context.

| Core utility | Tactical shooter context | Chess context | Unified mechanic (fixed) |
|---|---|---|---|
| Primary dashboard | **Combat Room:** live LFG lobbies, roster cards, voice links | **Challenger Hall:** open 1v1 challenges, board layouts, clock pickers | Universal matchmaking handshake: match confirmation, lobby joining, bracket progression |
| Statistics & profile | K/D, headshot %, W/L, agent roles | Chess.com/Lichess ELO, FIDE titles, accuracy history | Platform identity: unified credentials, competitive history, trust ratings, anti-cheat history |
| Main competitive action | Tournament brackets (single/double elim) | Round-robin & Swiss systems | Unified wallet & payout gate: escrow, fees, prizes, KYC/compliance |

## 6. UX edge-cases & latency challenges

### A. Twitch stream latency desync
**Problem:** embedded streams run 3–10 s behind the match server; scouting from stream
overlays would mislead.
**Mitigation:** a high-visibility **"Match Status Sync" badge** on the player overlay. On
desync, a pulsing indicator reads: *"Stream delayed (10 s behind server) • Round 3 active in
game engine."* True match state stays transparent.

### B. Sudden stream disconnects or API drops
**Problem:** a stream drops mid-match (ISP or Twitch API), leaving a blank/broken node.
**Mitigation:** an **instant offline-state overlay** — the card transitions from video to an
animated, server-tracked interactive scoreboard. No broken empty frames.

### C. Smurf-account verification delays
**Problem:** Riot/Steam APIs can take minutes to push verified data, stalling check-ins.
**Mitigation:** the **endowed-progress loader** — a check-in checklist with the first steps
already complete: "Account linked ✓ • Anti-cheat active ✓ • Syncing skill data (~15 s)…".
Reduces perceived wait and lifts completion rates.

### D. Stream-induced performance drops
**Problem:** many live embeds on one bracket screen cause browser lag and rage-quits.
**Mitigation:** **lazy-loading playback** — streams initialize only in-viewport or on hover —
plus telemetry-driven performance testing: if load/frame times exceed the internal
performance goal, automatically toggle low-resolution streaming or static placeholder
scores.
