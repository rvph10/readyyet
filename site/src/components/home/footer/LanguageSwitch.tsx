"use client";

import { useLocale } from "next-intl";
import { usePathname } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { tradeFromSlug, tradePath, type SiteLocale } from "@/lib/trades";

const NAMES: Record<(typeof routing.locales)[number], string> = { en: "English", fr: "Français", nl: "Nederlands" };

// Every language on show as a plain link, the current one filled. Plain <a>,
// not next-intl's Link: a full load, as the page's scroll timelines and
// Temlis scripts start once, on the document they found.
export function LanguageSwitch({ label }: { label: string }) {
  const locale = useLocale() as SiteLocale;
  const pathname = usePathname();
  // A trade's page has its path in each language's words (ADR 0145).
  const trade = tradeFromSlug(locale, pathname.slice(1));
  const href = (other: SiteLocale) =>
    trade ? tradePath(other, trade) : `/${other}${pathname === "/" ? "" : pathname}`;

  return (
    <nav className="footer__lang" aria-label={label}>
      <img src="/home/icon-globe.svg" alt="" width="20" height="20" loading="lazy" />
      <ul className="footer__lang-list">
        {routing.locales.map((other) => (
          <li key={other}>
            <a
              className="footer__lang-link"
              href={href(other)}
              hrefLang={other}
              lang={other}
              aria-label={NAMES[other]}
              aria-current={other === locale ? "true" : undefined}
            >
              {other.toUpperCase()}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
