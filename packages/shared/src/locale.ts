// The languages the web app and emails are written in, the same values as
// the Locale enum of the database.
export const LOCALES = ["EN", "FR"] as const;
export type Locale = (typeof LOCALES)[number];

// Before we know anything about the person (a sign-in, a Customer on the
// tracking page), the browser's preferred language is the only hint.
// English when none we support.
export function localeFromAcceptLanguage(header: string | null | undefined): Locale {
  const preferred = (header ?? "")
    .split(",")
    .map((part) => {
      const [tag, q] = part.trim().split(";q=");
      return { language: tag.split("-")[0].toUpperCase(), q: q === undefined ? 1 : Number(q) };
    })
    .filter(({ q }) => q > 0)
    .sort((a, b) => b.q - a.q)
    .find(({ language }) => LOCALES.some((locale) => locale === language));
  return (preferred?.language as Locale | undefined) ?? "EN";
}
