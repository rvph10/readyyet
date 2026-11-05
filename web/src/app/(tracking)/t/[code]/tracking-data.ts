import { getLocale } from "next-intl/server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { api } from "@/lib/api/client";
import { pageData } from "@/lib/api/errors";
import { LOCALE_COOKIE } from "@/lib/locale";
import type { Tracking } from "./tracking";

// Once per request: the metadata and the page both need it, and each call
// counts against the public route's rate limit.
export const getTracking = cache(async (code: string) =>
  (await api()).GET("/tracking/{code}", { params: { path: { code } } }).then(pageData),
);

// The pages open in the language of the Ticket's emails (ADR 0015), unless
// this browser already chose one. ?lang= remembers it, and sets <html lang>,
// which the root layout has written by the time the Ticket is known.
export async function openInTicketLanguage(tracking: Tracking, path: string) {
  const [locale, jar] = await Promise.all([getLocale(), cookies()]);
  const ticketLocale = tracking.locale.toLowerCase();
  if (!jar.has(LOCALE_COOKIE) && ticketLocale !== locale) {
    redirect(`${path}${path.includes("?") ? "&" : "?"}lang=${ticketLocale}`);
  }
}
