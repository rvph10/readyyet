import "server-only";

// The terms live on the site, in the language of the page asking (ADR 0130).
// The data processing agreement is their annex.
export function legalLinks(locale: string) {
  const terms = new URL(`/${locale}/terms`, process.env.SITE_URL);
  return { terms: terms.href, dpa: `${terms.href}#dpa` };
}
