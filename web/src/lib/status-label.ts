import type { components } from "./api/schema";

export function statusLabel(status: Pick<components["schemas"]["StatusDto"], "translations">, locale: string) {
  return status.translations.find((translation) => translation.locale === locale.toUpperCase())!.label;
}
