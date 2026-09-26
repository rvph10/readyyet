import { getLocale, getTranslations } from "next-intl/server";
import { api } from "@/lib/api/client";
import { pageData } from "@/lib/api/errors";
import { getMe } from "@/lib/me";
import { CreateBusinessForm } from "./create-business-form";

export default async function CreateBusinessPage() {
  const [me, locale, t, businessTypes] = await Promise.all([
    getMe(),
    getLocale(),
    getTranslations("createBusiness"),
    api().then(async (client) => pageData(await client.GET("/catalogue/business-types"))),
  ]);
  const options = businessTypes.map(({ code, translations }) => ({
    code,
    label: translations.find((translation) => translation.locale === locale.toUpperCase())?.label ?? code,
  }));
  return (
    <>
      <h1 className="text-2xl font-semibold">{t("title")}</h1>
      <p className="text-muted">{t("intro")}</p>
      <CreateBusinessForm businessTypes={options} email={me.email} locale={me.locale} />
    </>
  );
}
