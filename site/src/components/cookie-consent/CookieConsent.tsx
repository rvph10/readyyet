"use client";

import { useLocale, useTranslations } from "next-intl";
import { useEffect, useSyncExternalStore, type ComponentProps } from "react";
import { deletePostHogStorage, POSTHOG_OPTIONS, readConsent, saveConsent, type Consent } from "@/lib/consent";
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

export function CookieSettingsButton({ children, ...attributes }: ComponentProps<"button">) {
  if (!POSTHOG_KEY) return null;
  return (
    <button
      type="button"
      {...attributes}
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
  const locale = useLocale();
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
    saveConsent(next);
    reopened = false;
    // A PostHog already running can't be unloaded, so the page starts again
    // without it. Stopped first, or leaving the page would send an event and
    // write its cookie again.
    if (consent === "granted" && next === "denied") {
      void import("posthog-js").then(({ default: posthog }) => {
        posthog.set_config({ disable_persistence: true, capture_pageleave: false });
        deletePostHogStorage(location.hostname);
        location.reload();
      });
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
          link: (chunks) => <a href={`/${locale}/privacy#cookies`}>{chunks}</a>,
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
