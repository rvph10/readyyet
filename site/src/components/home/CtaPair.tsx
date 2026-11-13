import { getTranslations } from "next-intl/server";
import { signInUrl } from "@/lib/sign-in-url";
import { ChipButton } from "./ChipButton";
import { FillButton } from "./FillButton";

export async function CtaPair() {
  const t = await getTranslations("home.cta");
  const signIn = await signInUrl();

  return (
    <div className="cta">
      <ChipButton href={signIn}>{t("start")}</ChipButton>
      <FillButton href="#pricing" className="btn--muted">
        {t("pricing")}
      </FillButton>
    </div>
  );
}
