import { getTranslations } from "next-intl/server";
import { APP_URL } from "@/lib/app-url";
import { Link } from "@/i18n/navigation";
import { FillButton } from "./FillButton";
import "./nav.css";

export async function Nav() {
  const t = await getTranslations("home.nav");

  return (
    <nav className="nav" aria-label={t("label")}>
      <Link className="nav__brand" href="/">
        <img src="/home/logo.svg" alt="" width="28" height="28" />
        <span className="nav__wordmark t-wordmark">ReadyYet</span>
      </Link>
      <FillButton href={`${APP_URL}/sign-in`} className="btn--muted btn--sm">
        {t("signIn")}
      </FillButton>
    </nav>
  );
}
