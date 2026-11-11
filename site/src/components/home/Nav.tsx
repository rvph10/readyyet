import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { APP_URL } from "@/lib/app-url";
import { FillButton } from "./FillButton";
import "./nav.css";

const SECTIONS = [
  ["howItWorks", "how-it-works"],
  ["features", "features"],
  ["pricing", "pricing"],
  ["faq", "faq"],
] as const;

export async function Nav() {
  const t = await getTranslations("home.nav");

  return (
    <nav className="nav" aria-label={t("label")}>
      <Link className="nav__brand" href="/">
        <img src="/home/logo.svg" alt="" width="32" height="32" />
        <span className="nav__wordmark">ReadyYet</span>
      </Link>
      <ul className="nav__links">
        {SECTIONS.map(([label, anchor]) => (
          <li key={anchor}>
            <a className="nav__link" href={`#${anchor}`}>
              {t(label)}
            </a>
          </li>
        ))}
      </ul>
      <div className="nav__actions">
        <a className="nav__link nav__signin" href={`${APP_URL}/sign-in`}>
          {t("signIn")}
        </a>
        <FillButton href={`${APP_URL}/sign-in`} className="btn--dark btn--sm">
          {t("start")}
        </FillButton>
      </div>
    </nav>
  );
}
