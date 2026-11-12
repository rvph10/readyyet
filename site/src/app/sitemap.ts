import type { MetadataRoute } from "next";
import { routing } from "@/i18n/routing";
import { LEGAL_DOCS } from "@/lib/legal";
import { SITE_URL } from "@/lib/site-url";

export default function sitemap(): MetadataRoute.Sitemap {
  return ["", ...LEGAL_DOCS.map((doc) => `/${doc}`)].flatMap((page) => {
    const languages = Object.fromEntries(routing.locales.map((l) => [l, `${SITE_URL}/${l}${page}`]));
    return routing.locales.map((locale) => ({ url: `${SITE_URL}/${locale}${page}`, alternates: { languages } }));
  });
}
