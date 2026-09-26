import { LOCALES, type SupportedLocale } from "@readyyet/shared";

// Set by ?lang= (ADR 0047), read before the browser's language.
export const LOCALE_COOKIE = "locale";

export function parseLocale(value: string | null | undefined): SupportedLocale | undefined {
  const upper = value?.toUpperCase();
  return LOCALES.find((locale) => locale === upper);
}
