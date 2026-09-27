import { getTranslations } from "next-intl/server";
import { TipsCarousel } from "./tips-carousel";

export async function SignInPanel() {
  const t = await getTranslations("signIn.panel");

  return (
    // bg-ink stands in for the picture to come, which will need to keep the
    // title readable in the same way.
    <aside className="hidden flex-col justify-between gap-10 rounded-2xl bg-ink p-8 text-surface lg:flex xl:p-10">
      <div className="flex max-w-md flex-col gap-3">
        <p className="text-3xl font-semibold tracking-tight text-balance">{t("title")}</p>
        <p className="text-base text-surface/70">{t("text")}</p>
      </div>
      <div className="max-w-lg">
        <TipsCarousel
          tips={t.raw("tips") as { title: string; text: string }[]}
          label={t("tipsLabel")}
          nextLabel={t("nextTip")}
        />
      </div>
    </aside>
  );
}
