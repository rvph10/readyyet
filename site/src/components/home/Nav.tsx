import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { signInUrl } from "@/lib/sign-in-url";
import { FillButton } from "./FillButton";
import "./nav.css";

const SECTIONS = [
  ["howItWorks", "how-it-works"],
  ["features", "features"],
  ["pricing", "pricing"],
  ["faq", "faq"],
] as const;

export async function Nav() {
  const [t, locale, signIn] = await Promise.all([getTranslations("home.nav"), getLocale(), signInUrl()]);

  return (
    <nav className="nav" aria-label={t("label")}>
      <Link className="nav__brand" href="/">
        <img src="/home/logo.svg" alt="" width="32" height="32" />
        <span className="nav__wordmark">ReadyYet</span>
      </Link>
      <ul className="nav__links">
        {SECTIONS.map(([label, anchor]) => (
          <li key={anchor}>
            <a className="nav__link" href={`/${locale}#${anchor}`}>
              {t(label)}
            </a>
          </li>
        ))}
      </ul>
      <div className="nav__actions">
        <a className="nav__link nav__signin" href={signIn}>
          {t("signIn")}
        </a>
        <FillButton href={signIn} className="btn--dark btn--sm">
          {t("start")}
        </FillButton>
      </div>
    </nav>
  );
}
