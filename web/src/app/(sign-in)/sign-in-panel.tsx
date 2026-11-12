import { getTranslations } from "next-intl/server";
import { Icon, type IconName } from "@/components/ui/icon";
import { Panel } from "@/components/ui/panel";
import { Showcase } from "./showcase";
import { TipsCarousel } from "./tips-carousel";

// In the order of signIn.panel.tips.
const tipIcons: IconName[] = ["qrcode", "message", "check", "user"];

export async function SignInPanel() {
  const t = await getTranslations("signIn.panel");
  const tips = (t.raw("tips") as { title: string; text: string }[]).map((tip, index) => {
    return { ...tip, icon: <Icon name={tipIcons[index]} className="size-4" /> };
  });

  return (
    <Panel
      as="aside"
      padding="none"
      className="on-pine relative hidden w-1/2 flex-col gap-8 overflow-hidden bg-pine! p-8 text-surface lg:flex xl:p-10"
    >
      <div>
        <p className="mb-4 text-title-h3 font-bold text-balance xl:text-title-h1">{t("title")}</p>
        <p className="text-p-md text-surface/75 xl:text-p-lg">{t("text")}</p>
      </div>
      <div className="flex flex-1 items-center">
        <Showcase copy={t.raw("showcase") as Parameters<typeof Showcase>[0]["copy"]} />
      </div>
      <div className="text-ink">
        <TipsCarousel tips={tips} label={t("tipsLabel")} nextLabel={t("nextTip")} />
      </div>
    </Panel>
  );
}
