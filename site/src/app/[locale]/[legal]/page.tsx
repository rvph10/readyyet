import type { Metadata, ResolvingMetadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Nav } from "@/components/home/Nav";
import { Footer } from "@/components/home/footer/Footer";
import { routing } from "@/i18n/routing";
import { LEGAL_DATE, LEGAL_DOCS, type LegalDoc, readLegal } from "@/lib/legal";
import "./legal.css";

const SUPPORT_EMAIL = "support@readyyet.app";

export const dynamicParams = false;

export function generateStaticParams() {
  return LEGAL_DOCS.map((legal) => ({ legal }));
}

export async function generateMetadata(
  { params }: PageProps<"/[locale]/[legal]">,
  parent: ResolvingMetadata,
): Promise<Metadata> {
  const { locale, legal } = await params;
  const [{ title }, { openGraph }] = await Promise.all([readLegal(locale, legal as LegalDoc), parent]);
  return {
    title: `${title} | ReadyYet`,
    alternates: {
      canonical: `/${locale}/${legal}`,
      languages: {
        ...Object.fromEntries(routing.locales.map((l) => [l, `/${l}/${legal}`])),
        "x-default": `/${routing.defaultLocale}/${legal}`,
      },
    },
    // Next.js replaces a nested object whole, so the layout's site name, type and locale are carried over.
    openGraph: { ...openGraph, url: `/${locale}/${legal}`, title },
  };
}

export default async function LegalPage({ params }: PageProps<"/[locale]/[legal]">) {
  const { locale, legal } = await params;
  setRequestLocale(locale);
  const [t, { title, html, sections }] = await Promise.all([
    getTranslations("legal"),
    readLegal(locale, legal as LegalDoc),
  ]);
  const since = new Intl.DateTimeFormat(locale, { dateStyle: "long", timeZone: "UTC" }).format(new Date(LEGAL_DATE));

  return (
    <>
      <header className="legal-hero container container--bleed">
        <div className="legal-hero__panel">
          <Nav />
          <p className="legal-hero__label">{t("label")}</p>
          <h1 className="legal-hero__title t-display">{title}</h1>
          <p className="legal-hero__since">{t("since", { date: since })}</p>
          <nav className="legal-hero__docs" aria-label={t("others")}>
            {LEGAL_DOCS.map((doc) => (
              <a
                key={doc}
                href={`/${locale}/${doc}`}
                className="legal-hero__doc"
                aria-current={doc === legal ? "page" : undefined}
              >
                {t(`docs.${doc}`)}
              </a>
            ))}
          </nav>
        </div>
      </header>
      <main id="main-content" className="legal container container--padded">
        <aside className="legal__side">
          {sections.length > 1 && (
            <nav className="legal__toc" aria-labelledby="legal-toc">
              <p id="legal-toc" className="legal__toc-title">
                {t("contents")}
              </p>
              <ol>
                {sections.map((section) => (
                  <li key={section.id} className={section.part ? "legal__toc-part" : undefined}>
                    <a href={`#${section.id}`}>
                      {section.number && <span className="legal__toc-num">{section.number}</span>}
                      {section.label}
                    </a>
                  </li>
                ))}
              </ol>
            </nav>
          )}
          <div className="legal__ask">
            <p className="legal__ask-title">{t("questions")}</p>
            <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>
          </div>
        </aside>
        {/* Our own Markdown, turned into HTML when the site is built. */}
        <article className="legal__body" dangerouslySetInnerHTML={{ __html: html }} />
      </main>
      <Footer />
    </>
  );
}
