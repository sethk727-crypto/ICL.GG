/**
 * IP allowlist — locks the whole Vercel deployment to specific addresses.
 * Everyone else receives 403 Access Denied.
 *
 * Written to be dual-compatible with zero dependencies:
 *  - Vercel's framework-agnostic Routing Middleware (static sites like this
 *    repo) uses the default export.
 *  - Next.js middleware uses the named `middleware` export.
 * Only Web-standard Request/Response are used — no imports, no packages.
 * Returning undefined lets the request continue; returning a Response blocks.
 *
 * If your home IP changes, edit ALLOWED_IPS on GitHub and let Vercel redeploy.
 * IPv6 note: if you get intermittent 403s over IPv6 (privacy extensions rotate
 * the address tail), allowlist your /64 prefix instead — ask for that version.
 */

const ALLOWED_IPS = new Set<string>([
  "47.133.36.168",                          // IPv4
  "2600:6c60:6b40:1c5:ac69:4f60:8a0a:ce7e", // IPv6 (keep lowercase)
]);

function normalizeIp(ip: string): string {
  let out = ip.trim().toLowerCase();
  // IPv4 sometimes arrives as an IPv4-mapped IPv6 address (::ffff:1.2.3.4)
  if (out.startsWith("::ffff:")) out = out.slice(7);
  return out;
}

function clientIp(request: Request): string {
  // Both headers are set by Vercel's own proxy — visitors cannot spoof them.
  const real = request.headers.get("x-real-ip");
  if (real) return normalizeIp(real);
  const fwd = request.headers.get("x-forwarded-for");
  if (fwd) return normalizeIp(fwd.split(",")[0]);
  return ""; // no IP header at all → fail closed
}

export function middleware(request: Request): Response | undefined {
  if (ALLOWED_IPS.has(clientIp(request))) {
    return undefined; // allowed — continue to the site
  }
  return new Response("403 Access Denied", {
    status: 403,
    headers: { "content-type": "text/plain" },
  });
}

export default middleware;

// No `config.matcher` on purpose: with no matcher the middleware runs on every
// request — pages, assets, everything — so the whole deployment is locked.
