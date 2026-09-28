import { getTranslations } from "next-intl/server";
import { Icon, type IconName } from "@/components/ui/icon";
import { TipsCarousel } from "./tips-carousel";

// In the order of signIn.panel.tips.
const tipIcons: IconName[] = ["qrcode", "message", "check", "user"];

export async function SignInPanel() {
  const t = await getTranslations("signIn.panel");
  const tips = (t.raw("tips") as { title: string; text: string }[]).map((tip, index) => {
    return { ...tip, icon: <Icon name={tipIcons[index]} className="size-4" /> };
  });

  return (
    <aside className="relative hidden w-1/2 overflow-hidden rounded-3xl bg-subtle lg:block">
      <div className="absolute inset-x-8 top-8 xl:inset-x-10 xl:top-19">
        <p className="mb-4 text-title-h3 font-bold text-balance xl:text-title-h1">{t("title")}</p>
        <p className="text-p-md text-muted xl:text-p-lg">{t("text")}</p>
      </div>
      <div className="absolute inset-x-8 bottom-8 xl:inset-x-10 xl:bottom-15">
        <TipsCarousel tips={tips} label={t("tipsLabel")} nextLabel={t("nextTip")} />
      </div>
    </aside>
  );
}
