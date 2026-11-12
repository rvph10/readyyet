"use client";

import { useTranslations } from "next-intl";
import { useEffect, useSyncExternalStore, type ReactNode } from "react";
import { Link } from "@/i18n/navigation";
import { consentCookie, deletePostHogStorage, POSTHOG_OPTIONS, readConsent, type Consent } from "@/lib/consent";
import "./cookie-consent.css";

const POSTHOG_KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY;

// The same banner as web/src/components/cookie-consent.tsx (ADR 0132), in
// the site's look.
const listeners = new Set<() => void>();
let reopened = false;

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => void listeners.delete(listener);
}

function changed() {
  for (const listener of listeners) listener();
}

export function CookieSettingsButton({ className, children }: { className: string; children: ReactNode }) {
  if (!POSTHOG_KEY) return null;
  return (
    <button
      type="button"
      className={className}
      onClick={() => {
        reopened = true;
        changed();
      }}
    >
      {children}
    </button>
  );
}

export function CookieConsent() {
  const t = useTranslations("cookies");
  const consent = useSyncExternalStore(
    subscribe,
    () => readConsent(document.cookie),
    () => "unknown" as const,
  );
  const open = useSyncExternalStore(
    subscribe,
    () => reopened,
    () => false,
  );

  useEffect(() => {
    if (!POSTHOG_KEY || consent !== "granted") return;
    void import("posthog-js").then(({ default: posthog }) => {
      if (!posthog.__loaded) posthog.init(POSTHOG_KEY, POSTHOG_OPTIONS);
    });
  }, [consent]);

  if (!POSTHOG_KEY || consent === "unknown" || (consent !== null && !open)) return null;

  function choose(next: Consent) {
    document.cookie = consentCookie(next, location.hostname, location.protocol === "https:");
    reopened = false;
    // A PostHog already running can't be unloaded, so the page starts again without it.
    if (consent === "granted" && next === "denied") {
      deletePostHogStorage(location.hostname);
      location.reload();
      return;
    }
    changed();
  }

  return (
    <section aria-labelledby="cookie-consent-title" className="consent">
      <h2 id="cookie-consent-title" className="consent__title">
        {t("title")}
      </h2>
      <p className="consent__body">
        {t.rich("body", {
          link: (chunks) => <Link href="/privacy#cookies">{chunks}</Link>,
        })}
      </p>
      {/* The Data Protection Authority asks for both side by side, with the same weight. */}
      <div className="consent__actions">
        <button type="button" className="btn btn--dark" onClick={() => choose("denied")}>
          {t("refuse")}
        </button>
        <button type="button" className="btn btn--dark" onClick={() => choose("granted")}>
          {t("accept")}
        </button>
      </div>
    </section>
  );
}
