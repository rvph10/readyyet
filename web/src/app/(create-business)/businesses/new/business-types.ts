import "server-only";
import { isEndedStatus, OTHER_BUSINESS_TYPE } from "@readyyet/shared";
import { getLocale } from "next-intl/server";
import { api } from "@/lib/api/client";
import { pageData } from "@/lib/api/errors";

export async function getBusinessTypeOptions() {
  const [locale, businessTypes] = await Promise.all([
    getLocale(),
    api().then(async (client) => pageData(await client.GET("/catalogue/business-types"))),
  ]);
  const labelOf = (code: string, translations: { locale: string; label: string }[]) =>
    translations.find((translation) => translation.locale === locale.toUpperCase())?.label ?? code;
  return (
    businessTypes
      .map(({ code, translations, defaultWorkflow }) => ({
        code,
        label: labelOf(code, translations),
        // The path a Ticket usually takes, without the ways it can stop.
        steps: defaultWorkflow.steps
          .filter(({ status }) => status.code === "COMPLETED" || !isEndedStatus(status.code))
          .map(({ status }) => ({ code: status.code, label: labelOf(status.code, status.translations) })),
      }))
      // "Other" is the fallback, after every real choice.
      .sort((a, b) => Number(a.code === OTHER_BUSINESS_TYPE) - Number(b.code === OTHER_BUSINESS_TYPE))
  );
}
