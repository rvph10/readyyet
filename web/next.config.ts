import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

// The Content-Security-Policy is set per request in src/proxy.ts, it needs
// a fresh nonce each time.
const securityHeaders = [
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  // A tracking link is the only key to a Customer's Ticket, its path must
  // never leave in a Referer, e.g. when following the Google review link.
  // Not no-referrer: that also blanks the Origin of same-origin form posts.
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // next dev otherwise writes its own AGENTS.md and CLAUDE.md here when an
  // AI agent runs it, the repo's conventions live in the root CLAUDE.md.
  agentRules: false,
  headers() {
    return Promise.resolve([{ source: "/:path*", headers: securityHeaders }]);
  },
};

export default createNextIntlPlugin()(nextConfig);
