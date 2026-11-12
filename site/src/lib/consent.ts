import type { PostHogConfig } from "posthog-js";

// ADR 0132. A copy of web/src/lib/consent.ts, kept the same so one answer
// covers the site and the app, as the site builds without the workspace packages.
export const CONSENT_COOKIE = "cookie-consent";
// How long this answer and every preference cookie last, the Data Protection
// Authority's yardstick.
export const COOKIE_MAX_AGE_SECONDS = 182 * 24 * 60 * 60;

export type Consent = "granted" | "denied";

export function readConsent(cookies: string): Consent | null {
  const value = cookies
    .split("; ")
    .find((pair) => pair.startsWith(`${CONSENT_COOKIE}=`))
    ?.slice(CONSENT_COOKIE.length + 1);
  return value === "granted" || value === "denied" ? value : null;
}

// The parent domain, so readyyet.app and app.readyyet.app share the answer.
// localhost and an IP address have none.
export function cookieDomain(hostname: string) {
  const labels = hostname.split(".");
  return labels.length < 2 || /^\d+$/.test(labels.at(-1)!) ? null : labels.slice(-2).join(".");
}

export function consentCookie(consent: Consent, hostname: string, secure: boolean) {
  const domain = cookieDomain(hostname);
  return `${CONSENT_COOKIE}=${consent}; path=/; max-age=${COOKIE_MAX_AGE_SECONDS}; samesite=lax${domain ? `; domain=${domain}` : ""}${secure ? "; secure" : ""}`;
}

// Pages for Customers never measure anything.
export function isCustomerPage(pathname: string) {
  return pathname.startsWith("/t/");
}

// A URL without its query, which can hold a search for a Customer's name or phone.
export function withoutQuery(url: string) {
  return url.split(/[?#]/)[0];
}

export const POSTHOG_HOST = "https://eu.i.posthog.com";

// Anonymous page views and nothing more: clicks would send the text of what
// was clicked, a Customer's name included, and PostHog may not fetch more code.
export const POSTHOG_OPTIONS: Partial<PostHogConfig> = {
  api_host: POSTHOG_HOST,
  defaults: "2026-08-30",
  persistence: "cookie",
  person_profiles: "never",
  autocapture: false,
  capture_exceptions: false,
  disable_session_recording: true,
  disable_surveys: true,
  disable_product_tours: true,
  disable_conversations: true,
  disable_web_experiments: true,
  disable_external_dependency_loading: true,
  advanced_disable_flags: true,
  before_send: (event) => {
    if (!event || isCustomerPage(location.pathname)) return null;
    for (const key of ["$current_url", "$referrer", "$initial_current_url"]) {
      const value: unknown = event.properties[key];
      if (typeof value === "string") event.properties[key] = withoutQuery(value);
    }
    return event;
  },
};

// Withdrawing consent removes what PostHog stored, wherever it set it.
export function deletePostHogStorage(hostname: string) {
  const domain = cookieDomain(hostname);
  for (const pair of document.cookie.split("; ")) {
    const name = pair.split("=")[0];
    if (!name.startsWith("ph_")) continue;
    document.cookie = `${name}=; path=/; max-age=0`;
    if (domain) document.cookie = `${name}=; path=/; max-age=0; domain=${domain}`;
  }
  for (const storage of [localStorage, sessionStorage]) {
    for (const key of Object.keys(storage)) {
      if (key.startsWith("ph_") || key.startsWith("__ph")) storage.removeItem(key);
    }
  }
}
