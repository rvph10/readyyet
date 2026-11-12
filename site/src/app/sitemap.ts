import type { MetadataRoute } from "next";
import { routing } from "@/i18n/routing";
import { SITE_URL } from "@/lib/site-url";

export default function sitemap(): MetadataRoute.Sitemap {
  const languages = Object.fromEntries(routing.locales.map((l) => [l, `${SITE_URL}/${l}`]));
  return routing.locales.map((locale) => ({
    url: `${SITE_URL}/${locale}`,
    alternates: { languages },
  }));
}
