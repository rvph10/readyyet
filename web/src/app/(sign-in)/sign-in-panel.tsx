import { CircleCheck, Mail, QrCode, Users } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { EmailIllustration, TagsIllustration, TeamIllustration, WorkflowIllustration } from "./tip-illustrations";
import { TipsCarousel } from "./tips-carousel";

// In the order of signIn.panel.tips.
const tipIcons = [QrCode, Mail, CircleCheck, Users];

export async function SignInPanel() {
  const t = await getTranslations("signIn.panel");
  const images = [
    <TagsIllustration key="tags" />,
    <EmailIllustration key="email" now={t("illustrations.now")} title={t("illustrations.emailTitle")} />,
    <WorkflowIllustration
      key="workflow"
      steps={[t("illustrations.received"), t("illustrations.repairing"), t("illustrations.ready")]}
    />,
    <TeamIllustration key="team" />,
  ];
  const tips = (t.raw("tips") as { title: string; text: string }[]).map((tip, index) => {
    const Icon = tipIcons[index];
    return { ...tip, icon: <Icon aria-hidden="true" strokeWidth={1.5} className="size-5" />, image: images[index] };
  });

  return (
    // bg-ink stands in for the picture to come, which will need to keep the
    // white title readable in the same way.
    <aside className="relative hidden w-1/2 overflow-hidden rounded-3xl bg-ink text-surface lg:block">
      <div className="absolute inset-x-8 top-8 xl:inset-x-10 xl:top-19">
        <p className="mb-4 text-title-h3 font-bold text-balance xl:text-title-h1">{t("title")}</p>
        <p className="text-p-md xl:text-p-lg">{t("text")}</p>
      </div>
      <div className="absolute inset-x-8 bottom-8 xl:inset-x-10 xl:bottom-15">
        <TipsCarousel tips={tips} label={t("tipsLabel")} nextLabel={t("nextTip")} />
      </div>
    </aside>
  );
}
