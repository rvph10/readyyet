import { localeFromAcceptLanguage } from "@readyyet/shared";
import { getRequestConfig } from "next-intl/server";
import { cookies, headers } from "next/headers";
import { LOCALE_COOKIE, parseLocale } from "@/lib/locale";

// `explicit` is a locale passed to getTranslations({ locale }), for text written
// for a Customer rather than the person viewing the page.
export default getRequestConfig(async ({ locale: explicit }) => {
  const chosen = parseLocale(explicit) ?? parseLocale((await cookies()).get(LOCALE_COOKIE)?.value);
  const locale = (chosen ?? localeFromAcceptLanguage((await headers()).get("accept-language"))).toLowerCase();
  return {
    locale,
    messages: ((await import(`../../messages/${locale}.json`)) as { default: Record<string, unknown> }).default,
  };
});
