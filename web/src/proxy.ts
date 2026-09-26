import { getSessionCookie } from "better-auth/cookies";
import { NextResponse, type NextRequest } from "next/server";
import { LOCALE_COOKIE, parseLocale } from "@/lib/locale";
import { REF_COOKIE, REF_MAX_AGE_SECONDS, REF_MAX_LENGTH } from "@/lib/referral";

// Only the dashboard needs a session. The layout's call to /me is the real
// check, this only spares a signed-out visitor a round trip (ADR 0045).
const DASHBOARD_PATHS = ["/businesses/", "/locations/", "/invitations/"];

function needsSession(pathname: string) {
  return pathname === "/" || DASHBOARD_PATHS.some((prefix) => pathname.startsWith(prefix));
}

const YEAR_SECONDS = 365 * 24 * 60 * 60;

// ?lang= and ?ref= work on any page (ADR 0047).
function keepChoices(request: NextRequest, response: NextResponse) {
  const { searchParams } = request.nextUrl;
  const secure = process.env.NODE_ENV === "production";
  const locale = parseLocale(searchParams.get("lang"));
  if (locale) {
    response.cookies.set(LOCALE_COOKIE, locale, { maxAge: YEAR_SECONDS, sameSite: "lax", secure });
  }
  const ref = searchParams.get("ref");
  if (ref && ref.length <= REF_MAX_LENGTH && !request.cookies.has(REF_COOKIE)) {
    response.cookies.set(REF_COOKIE, ref, {
      maxAge: REF_MAX_AGE_SECONDS,
      sameSite: "lax",
      httpOnly: true,
      secure,
    });
  }
  return response;
}

// The nonce lets through the inline scripts Next.js writes into every page
// and nothing else (Next.js's documented CSP setup). React needs eval in
// development only, for its debugging features.
export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  if (needsSession(pathname) && !getSessionCookie(request)) {
    const signIn = new URL("/sign-in", request.url);
    if (pathname !== "/") {
      signIn.searchParams.set("next", `${pathname}${search}`);
    }
    return keepChoices(request, NextResponse.redirect(signIn));
  }

  // On the request too, so this very page is already shown in it.
  const locale = parseLocale(request.nextUrl.searchParams.get("lang"));
  if (locale) {
    request.cookies.set(LOCALE_COOKIE, locale);
  }

  const api = new URL(process.env.NEXT_PUBLIC_API_URL as string).origin;
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const isDev = process.env.NODE_ENV === "development";
  const csp = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ""}`,
    // Next.js's dev indicator writes its styles without the nonce. Browsers
    // ignore 'unsafe-inline' next to a nonce, so development drops the nonce.
    `style-src 'self' ${isDev ? "'unsafe-inline'" : `'nonce-${nonce}'`}`,
    // Better Auth's client signs in against the API, whose /images serves
    // logos and avatars.
    `connect-src 'self' ${api}`,
    `img-src 'self' blob: data: ${api}`,
    "font-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    ...(isDev ? [] : ["upgrade-insecure-requests"]),
  ].join("; ");

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", csp);
  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("Content-Security-Policy", csp);
  return keepChoices(request, response);
}

export const config = {
  matcher: [
    {
      // The Sentry tunnel is excluded, so a redirect added here later can't
      // swallow error reports.
      source: "/((?!_next/static|_next/image|favicon.ico|monitoring$).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
