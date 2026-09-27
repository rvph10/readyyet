import { getLocale, getTranslations } from "next-intl/server";
import { api } from "@/lib/api/client";
import { pageData } from "@/lib/api/errors";
import { getMe } from "@/lib/me";
import { CreateBusinessForm } from "./create-business-form";

const OTHER = "OTHER";

export default async function CreateBusinessPage() {
  const [me, locale, t, businessTypes] = await Promise.all([
    getMe(),
    getLocale(),
    getTranslations("createBusiness"),
    api().then(async (client) => pageData(await client.GET("/catalogue/business-types"))),
  ]);
  const options = businessTypes
    .map(({ code, translations }) => ({
      code,
      label: translations.find((translation) => translation.locale === locale.toUpperCase())?.label ?? code,
    }))
    // "Other" is the fallback, after every real choice.
    .sort((a, b) => Number(a.code === OTHER) - Number(b.code === OTHER));
  return (
    <>
      <h1 className="text-2xl font-semibold">{t("title")}</h1>
      <CreateBusinessForm businessTypes={options} email={me.email} />
    </>
  );
}
