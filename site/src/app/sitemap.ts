import type { MetadataRoute } from "next";
import { routing } from "@/i18n/routing";
import { LEGAL_DOCS } from "@/lib/legal";
import { SITE_URL } from "@/lib/site-url";
import { TRADE_KEYS, tradePath } from "@/lib/trades";

export default function sitemap(): MetadataRoute.Sitemap {
  const pages = ["", ...LEGAL_DOCS.map((doc) => `/${doc}`)].flatMap((page) => {
    const languages = Object.fromEntries(routing.locales.map((l) => [l, `${SITE_URL}/${l}${page}`]));
    return routing.locales.map((locale) => ({ url: `${SITE_URL}/${locale}${page}`, alternates: { languages } }));
  });
  // A trade's path is in each language's words (ADR 0145).
  const trades = TRADE_KEYS.flatMap((trade) => {
    const languages = Object.fromEntries(routing.locales.map((l) => [l, `${SITE_URL}${tradePath(l, trade)}`]));
    return routing.locales.map((locale) => ({
      url: `${SITE_URL}${tradePath(locale, trade)}`,
      alternates: { languages },
    }));
  });
  return [...pages, ...trades];
}
