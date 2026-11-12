import { getLocale, getTranslations } from "next-intl/server";
import "./announcement.css";

// A line above the page for what's new or on offer, the way SaaS sites do:
// its tag, sentence, link and where it leads (a path of the site, in the
// visitor's language) are in messages/*.json (announcement), an empty text
// takes it away. It can't be closed: the pages are cached, and hiding it once
// loaded would show it, then drop it, on every visit.
export async function AnnouncementBar() {
  const [t, locale] = await Promise.all([getTranslations("announcement"), getLocale()]);
  if (!t("text")) return null;
  return (
    <aside className="announcement" aria-label={t("label")}>
      <span className="announcement__tag">{t("tag")}</span>
      <p className="announcement__text">
        {t("text")}{" "}
        <a className="announcement__link" href={`/${locale}${t("href")}`}>
          {t("action")}
          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d="M5 12h14m-6-6 6 6-6 6"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </a>
      </p>
    </aside>
  );
}
