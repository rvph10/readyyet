import { isSupportedCountry, type Country } from "react-phone-number-input";

// The time zone says where the shop is better than the browser's language,
// which is often English in Belgium. Only the countries ReadyYet sells in.
const COUNTRY_BY_TIME_ZONE: Record<string, Country> = {
  "Europe/Brussels": "BE",
  "Europe/Paris": "FR",
  "Europe/Luxembourg": "LU",
  "Europe/Amsterdam": "NL",
};
export const FALLBACK_COUNTRY = "BE";
const FALLBACK_TIME_ZONE = "Europe/Brussels";

export function browserCountry(timeZone: string): Country {
  const region = new Intl.Locale(navigator.language).region;
  return COUNTRY_BY_TIME_ZONE[timeZone] ?? (region && isSupportedCountry(region) ? region : FALLBACK_COUNTRY);
}

// The API takes a region's zone only, never UTC, which Linux machines and
// anti-fingerprinting browsers report.
export function browserTimeZone() {
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  return timeZone === "UTC" || timeZone.startsWith("Etc/") ? FALLBACK_TIME_ZONE : timeZone;
}
