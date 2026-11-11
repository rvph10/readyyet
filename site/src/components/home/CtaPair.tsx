import { getTranslations } from "next-intl/server";
import { APP_URL } from "@/lib/app-url";
import { ChipButton } from "./ChipButton";
import { FillButton } from "./FillButton";

export async function CtaPair() {
  const t = await getTranslations("home.cta");

  return (
    <div className="cta">
      <ChipButton href={`${APP_URL}/sign-in`}>{t("start")}</ChipButton>
      <FillButton href="#pricing" className="btn--muted">
        {t("pricing")}
      </FillButton>
    </div>
  );
}
