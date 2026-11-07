import { getTranslations } from "next-intl/server";
import { ErrorMessage } from "@/components/error-message";

export default async function NotFound() {
  const t = await getTranslations("notFound");
  return (
    <ErrorMessage illustration="lost" title={t("title")}>
      <p className="text-p-md text-muted">{t("body")}</p>
    </ErrorMessage>
  );
}
