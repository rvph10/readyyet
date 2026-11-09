import { getTranslations } from "next-intl/server";
import { ErrorMessage } from "@/components/error-message";

// The same for an unknown code and an expired link, on purpose (ADR 0013).
export default async function TrackingNotFound() {
  const t = await getTranslations("tracking");
  return (
    <ErrorMessage illustration="lost" title={t("notFoundTitle")}>
      <p className="text-p-md text-muted">{t("notFoundBody")}</p>
    </ErrorMessage>
  );
}
