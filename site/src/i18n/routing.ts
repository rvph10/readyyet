import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["en", "fr", "nl"],
  defaultLocale: "en",
  // Every link already carries the language, a cookie would only repeat it,
  // and a Set-Cookie on each response keeps a CDN from caching the pages.
  localeCookie: false,
});
