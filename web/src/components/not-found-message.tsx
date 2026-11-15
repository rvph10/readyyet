import { getTranslations } from "next-intl/server";
import { ErrorMessage } from "./error-message";

export async function NotFoundMessage({ inLayout = false }: { inLayout?: boolean }) {
  const t = await getTranslations("notFound");
  return (
    <ErrorMessage illustration="lost" title={t("title")} inLayout={inLayout}>
      <p className="text-p-md text-muted">{t("body")}</p>
    </ErrorMessage>
  );
}
