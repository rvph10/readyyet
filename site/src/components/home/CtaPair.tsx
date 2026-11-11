import { getTranslations } from "next-intl/server";
import { APP_URL } from "@/lib/app-url";
import { FillButton } from "./FillButton";

export async function CtaPair() {
  const t = await getTranslations("home.cta");

  return (
    <div className="cta">
      <a className="btn btn--dark btn--chip" href={`${APP_URL}/sign-in`}>
        <span className="btn__label">{t("start")}</span>
        <span className="btn__chip" aria-hidden="true">
          <img src="/home/icon-arrow-right.svg" alt="" width="24" height="24" />
        </span>
      </a>
      <FillButton href="#pricing" className="btn--muted">
        {t("pricing")}
      </FillButton>
    </div>
  );
}
