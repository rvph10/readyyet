import { getTranslations } from "next-intl/server";
import { ErrorMessage } from "@/components/error-message";

export default async function NotFound() {
  const t = await getTranslations("notFound");
  return (
    <ErrorMessage title={t("title")}>
      <p className="text-muted">{t("body")}</p>
    </ErrorMessage>
  );
}
