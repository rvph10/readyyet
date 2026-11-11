import { getTranslations } from "next-intl/server";
import { APP_URL } from "@/lib/app-url";
import { noOrphan } from "@/lib/typography";
import { LanguageSelect } from "./LanguageSelect";
import "./footer.css";

const SUPPORT_EMAIL = "support@readyyet.app";

// Ledger's footer, without its social links: ReadyYet has none yet.
export async function Footer() {
  const t = await getTranslations("home.footer");
  const columns = [
    {
      title: t("product"),
      links: [
        { label: t("howItWorks"), href: "#how-it-works" },
        { label: t("features"), href: "#features" },
        { label: t("pricing"), href: "#pricing" },
        { label: t("faq"), href: "#faq" },
      ],
    },
    {
      title: t("account"),
      links: [
        { label: t("start"), href: `${APP_URL}/sign-in` },
        { label: t("signIn"), href: `${APP_URL}/sign-in` },
      ],
    },
    {
      title: t("contact"),
      links: [{ label: SUPPORT_EMAIL, href: `mailto:${SUPPORT_EMAIL}` }],
    },
  ];

  return (
    <footer className="footer">
      <div className="container--bleed">
        <div className="footer__card">
          <div className="footer__content">
            <div className="footer__grid">
              <div className="footer__brand">
                <a className="footer__brand-link" href="#main-content">
                  <img src="/home/logo.svg" alt="ReadyYet" width="30" height="30" loading="lazy" />
                </a>
                <p className="footer__tagline">{noOrphan(t("tagline"))}</p>
              </div>
              <div className="footer__columns">
                {columns.map((column) => (
                  <nav key={column.title} className="footer__column" aria-label={column.title}>
                    <h2 className="body-text footer__column-title">{column.title}</h2>
                    <ul className="footer__links">
                      {column.links.map((link) => (
                        <li key={link.label}>
                          <a className="footer__link" href={link.href}>
                            {link.label}
                          </a>
                        </li>
                      ))}
                    </ul>
                  </nav>
                ))}
              </div>
            </div>
            <div className="footer__bottom">
              <LanguageSelect label={t("language")} />
              <p className="caption footer__legal">{t("rights", { year: new Date().getFullYear() })}</p>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
