import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

// Unlike the web app, no nonce: these pages are built once and served as
// files, so there is no request to give a fresh nonce to. 'unsafe-inline'
// covers the inline scripts Next.js writes into every page. The site has no
// sign-in, no forms and no one else's content, nothing an injected script
// could read or act on.
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${process.env.NODE_ENV === "development" ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' blob: data:",
  "font-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  ...(process.env.NODE_ENV === "development" ? [] : ["upgrade-insecure-requests"]),
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
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
