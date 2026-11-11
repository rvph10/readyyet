import { getTranslations } from "next-intl/server";
import { Fragment } from "react";
import { APP_URL } from "@/lib/app-url";
import { noOrphan } from "@/lib/typography";
import "@/temlis/atniily-923/styles.css";
import { LanguageSwitch } from "./LanguageSwitch";
import "./footer.css";

const SUPPORT_EMAIL = "support@readyyet.app";
const CID = { "data-astro-cid-sz7xmlte": "" };
const ROLL = { "data-astro-cid-w6airwlu": "" };
const MARK = { "data-astro-cid-hhuuaa7r": "" };

// Each word slides up to show its lime copy on hover, one after another.
function Roll({ label }: { label: string }) {
  return (
    <span className="roll" {...ROLL}>
      {label.split(" ").map((word, i) => (
        <Fragment key={i}>
          {i > 0 && " "}
          <span className="roll__word" {...ROLL}>
            <span className="roll__inner" {...ROLL}>
              <span className="roll__line" {...ROLL}>
                {word}
              </span>
              <span className="roll__line roll__line--in" aria-hidden="true" {...ROLL}>
                {word}
              </span>
            </span>
          </span>
        </Fragment>
      ))}
    </span>
  );
}

// Atniily's "Dark Footer with Giant Wordmark" (Temlis), markup as bought,
// with ReadyYet's logo and name, its links, and the language picker in place
// of the template's policies line. Legal links come with the legal pages.
// Its stylesheet is as bought but for its Geist @font-face rules, removed:
// the page sets its own fonts, and their fallback files weren't in the
// package. Its script is /temlis/atniily-923/animations.js.
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
    <div data-tmls="tmfp_tpbvab43o3bhnmtl" data-temlis="atniily-923">
      <footer className="footer section-card" {...CID}>
        <div className="footer__inner section-card__inner" {...CID}>
          <div className="footer__top" {...CID}>
            <div className="footer__brand" data-anim="rise" {...CID}>
              <a className="wordmark wordmark--nav" href="#main-content" {...MARK}>
                <img className="wordmark__mark" src="/home/logo.svg" alt="" width="32" height="32" {...MARK} />
                <span className="wordmark__text" {...MARK}>
                  ReadyYet
                </span>
              </a>
              <p className="footer__address" {...CID}>
                {noOrphan(t("tagline"))}
              </p>
            </div>
            <div className="footer__cols" data-anim-children="rise" data-anim-stagger="0.08" {...CID}>
              {columns.map((column) => (
                <nav key={column.title} className="footer__col" aria-label={column.title} {...CID}>
                  <p className="footer__col-title" {...CID}>
                    {column.title}
                  </p>
                  {column.links.map((link) => (
                    <a key={link.label} className="footer__link" href={link.href} {...CID}>
                      <Roll label={link.label} />
                    </a>
                  ))}
                </nav>
              ))}
            </div>
          </div>
          <div className="footer__bottom" data-anim="rise" data-anim-y="0" {...CID}>
            <span className="footer__divider" aria-hidden="true" {...CID}></span>
            <div className="footer__legal" {...CID}>
              <p {...CID}>{t("rights", { year: new Date().getFullYear() })}</p>
              <LanguageSwitch label={t("language")} />
            </div>
          </div>
          <span
            className="wordmark wordmark--display footer__mark"
            data-anim="dial"
            data-anim-start="top 92%"
            aria-hidden="true"
            {...MARK}
          >
            <img className="wordmark__mark" src="/home/logo.svg" alt="" width="304" height="304" {...MARK} />
            <span className="wordmark__text" {...MARK}>
              ReadyYet
            </span>
          </span>
        </div>
      </footer>
    </div>
  );
}
