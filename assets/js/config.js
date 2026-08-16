/* ICL.GG runtime config.
   Flip useTwitchEmbeds to true in production to replace the built-in
   canvas stream simulations with real Twitch player iframes.
   `parent` must list every domain the pages are served from
   (Twitch embed requirement). YouTube channels fall back the same way. */
window.ICL_CONFIG = {
  useTwitchEmbeds: false,
  twitch: {
    parent: [location.hostname || "localhost"],
    // Map player/team tags to channels. Any entry missing here keeps the simulation.
    channels: {
      // "VXN": "shroud",
      // "KRA": "s1mple",
    },
  },
  youtube: {
    // Map tags to YouTube video/live IDs (used when a twitch channel is absent).
    channels: {},
  },
  // Internal performance goal (ms). Sustained frames slower than this
  // trip the low-power guard (PRD edge-case D).
  perfBudgetMs: 40,
};
