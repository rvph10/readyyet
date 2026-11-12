import { getLocale } from "next-intl/server";
import { APP_URL } from "./app-url";

// The app speaks English and French, and ?lang= sets it on arrival (ADR 0047),
// so a visitor reading the site in French isn't sent to an English sign-in.
export function appLanguage(locale: string) {
  return locale === "fr" ? "fr" : "en";
}

export async function signInUrl() {
  return `${APP_URL}/sign-in?lang=${appLanguage(await getLocale())}`;
}
