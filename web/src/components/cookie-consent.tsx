"use client";

import { useTranslations } from "next-intl";
import { usePathname } from "next/navigation";
import { useEffect, useSyncExternalStore, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import {
  deletePostHogStorage,
  isCustomerPage,
  POSTHOG_OPTIONS,
  readConsent,
  saveConsent,
  type Consent,
} from "@/lib/consent";

const POSTHOG_KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY;

// The answer lives in a cookie and the banner can be reopened from anywhere,
// so both are read as one small store.
const listeners = new Set<() => void>();
let reopened = false;

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => void listeners.delete(listener);
}

function changed() {
  for (const listener of listeners) listener();
}

// The "Cookie settings" link, only where there is something to consent to.
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

// ADR 0132: nothing of PostHog loads before "Accept", and never on a Customer's page.
export function CookieConsent({ privacyUrl }: { privacyUrl: string }) {
  const t = useTranslations("cookies");
  const pathname = usePathname();
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
  const customerPage = isCustomerPage(pathname);

  useEffect(() => {
    if (!POSTHOG_KEY || consent !== "granted" || customerPage) return;
    void import("posthog-js").then(({ default: posthog }) => {
      if (!posthog.__loaded) posthog.init(POSTHOG_KEY, POSTHOG_OPTIONS);
    });
  }, [consent, customerPage]);

  if (!POSTHOG_KEY || customerPage || consent === "unknown" || (consent !== null && !open)) return null;

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
    <section
      aria-labelledby="cookie-consent-title"
      className="fixed inset-x-4 bottom-4 z-50 flex flex-col gap-4 rounded-3xl border border-border bg-surface p-5 shadow-lg sm:right-auto sm:max-w-sm"
    >
      <div>
        <h2 id="cookie-consent-title" className="text-label-md">
          {t("title")}
        </h2>
        <p className="mt-1.5 text-p-sm text-muted">
          {t.rich("body", {
            link: (chunks) => (
              <a href={privacyUrl} className="font-semibold text-ink underline underline-offset-4">
                {chunks}
              </a>
            ),
          })}
        </p>
      </div>
      {/* The Data Protection Authority asks for both side by side, with the same weight. */}
      <div className="grid grid-cols-2 gap-2">
        <Button variant="secondary" onClick={() => choose("denied")}>
          {t("refuse")}
        </Button>
        <Button variant="secondary" onClick={() => choose("granted")}>
          {t("accept")}
        </Button>
      </div>
    </section>
  );
}
