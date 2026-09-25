import { localeFromAcceptLanguage } from "@readyyet/shared";
import { getRequestConfig } from "next-intl/server";
import { headers } from "next/headers";

export default getRequestConfig(async () => {
  const locale = localeFromAcceptLanguage((await headers()).get("accept-language")).toLowerCase();
  return {
    locale,
    messages: ((await import(`../../messages/${locale}.json`)) as { default: Record<string, unknown> }).default,
  };
});
