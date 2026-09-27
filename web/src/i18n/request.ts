import { localeFromAcceptLanguage } from "@readyyet/shared";
import { getRequestConfig } from "next-intl/server";
import { cookies, headers } from "next/headers";
import { LOCALE_COOKIE, parseLocale } from "@/lib/locale";

export default getRequestConfig(async () => {
  const chosen = parseLocale((await cookies()).get(LOCALE_COOKIE)?.value);
  const locale = (chosen ?? localeFromAcceptLanguage((await headers()).get("accept-language"))).toLowerCase();
  return {
    locale,
    messages: ((await import(`../../messages/${locale}.json`)) as { default: Record<string, unknown> }).default,
  };
});
