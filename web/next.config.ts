import { withSentryConfig } from "@sentry/nextjs/config";
import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

// The Content-Security-Policy is set per request in src/proxy.ts, it needs
// a fresh nonce each time.
const securityHeaders = [
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
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
  // Read by src/lib/sentry.ts on the server and, inlined at build, in the
  // browser. Railway sets it at build time too.
  env: {
    SENTRY_ENVIRONMENT: process.env.RAILWAY_ENVIRONMENT_NAME ?? "development",
  },
  // next dev otherwise writes its own AGENTS.md and CLAUDE.md here when an
  // AI agent runs it, the repo's conventions live in the root CLAUDE.md.
  agentRules: false,
  headers() {
    return Promise.resolve([{ source: "/:path*", headers: securityHeaders }]);
  },
};

// Source maps are uploaded when SENTRY_AUTH_TOKEN, SENTRY_ORG and
// SENTRY_PROJECT are set (Railway), skipped otherwise (locally, CI).
export default withSentryConfig(createNextIntlPlugin()(nextConfig), {
  release: { name: process.env.RAILWAY_GIT_COMMIT_SHA },
  // Browser events reach Sentry through the web app itself, so the CSP's
  // connect-src stays 'self' and ad blockers don't drop them (ADR 0045).
  tunnelRoute: "/monitoring",
  silent: !process.env.CI,
});
