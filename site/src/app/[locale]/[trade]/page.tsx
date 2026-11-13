import type { Metadata, ResolvingMetadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { AnnouncementBar } from "@/components/announcement/AnnouncementBar";
import { ChipButton } from "@/components/home/ChipButton";
import { FillButton } from "@/components/home/FillButton";
import { Footer } from "@/components/home/footer/Footer";
import { Nav } from "@/components/home/Nav";
import { Pricing } from "@/components/home/pricing/Pricing";
import { PageMotion } from "@/components/PageMotion";
import { routing } from "@/i18n/routing";
import { signInUrl } from "@/lib/sign-in-url";
import { SITE_URL } from "@/lib/site-url";
import { TRADE_KEYS, TRADES, tradeFromSlug, tradePath, type SiteLocale } from "@/lib/trades";
import "@/components/trade/trade.css";

type Props = PageProps<"/[locale]/[trade]">;
type Pain = { title: string; text: string };
type Question = { q: string; a: string };
type Guide = { title: string; paragraphs: string[] };

export const dynamicParams = false;

export function generateStaticParams({ params }: { params: { locale: string } }) {
  return TRADE_KEYS.map((trade) => ({ trade: TRADES[trade].slugs[params.locale as SiteLocale] }));
}

async function trade(params: Props["params"]) {
  const { locale, trade: slug } = await params;
  const key = tradeFromSlug(locale as SiteLocale, slug);
  if (!key) notFound();
  return { locale: locale as SiteLocale, key };
}

export async function generateMetadata({ params }: Props, parent: ResolvingMetadata): Promise<Metadata> {
  const { locale, key } = await trade(params);
  const [t, { openGraph }] = await Promise.all([getTranslations({ locale, namespace: `tradePage.${key}` }), parent]);
  const path = tradePath(locale, key);
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
    alternates: {
      canonical: path,
      languages: {
        ...Object.fromEntries(routing.locales.map((l) => [l, tradePath(l, key)])),
        "x-default": tradePath(routing.defaultLocale, key),
      },
    },
    // Next.js replaces a nested object whole, so the layout's site name, type and locale are carried over.
    openGraph: { ...openGraph, url: path, title: t("metaTitle"), description: t("metaDescription") },
  };
}

// ADR 0145: one page per trade, what it gets from ReadyYet in its own words,
// with the steps its Customers really see.
export default async function TradePage({ params }: Props) {
  const { locale, key } = await trade(params);
  setRequestLocale(locale);
  const [all, signIn] = await Promise.all([getTranslations("tradePage"), signInUrl()]);
  const t = (name: string) => all(`${key}.${name}`);
  const page = (name: string) => all(`page.${name}`);
  const steps = ["RECEIVED", ...TRADES[key].steps, "READY", "COMPLETED"];
  // The first step past Received, drawn as where a Ticket is now.
  const now = 1;
  const faq = all.raw(`${key}.faq`) as Question[];
  const guide = all.raw(`${key}.guide`) as Guide;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    url: `${SITE_URL}${tradePath(locale, key)}`,
    inLanguage: locale,
    mainEntity: faq.map(({ q, a }) => ({
      "@type": "Question",
      name: q,
      acceptedAnswer: { "@type": "Answer", text: a },
    })),
  };

  return (
    <>
      {/* Data for search engines, never run. "<" is escaped so the text can't close the tag. */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />
      <AnnouncementBar />
      <header className="trade-hero container container--bleed">
        <div className="trade-hero__panel" data-entrance-group="">
          <Nav />
          <p className="trade-hero__label">{t("label")}</p>
          <h1 className="trade-hero__title t-display" data-entrance="title">
            {t("title")}
          </h1>
          <p className="trade-hero__lead" data-entrance="">
            {t("lead")}
          </p>
          <div className="cta trade-hero__cta" data-entrance="">
            <ChipButton href={signIn}>{page("start")}</ChipButton>
            <FillButton href="#pricing" className="btn--muted">
              {page("pricing")}
            </FillButton>
          </div>
        </div>
      </header>

      <main id="main-content">
        <section className="trade-section container container--padded" aria-labelledby="trade-pains">
          <div data-entrance-group="">
            <h2 id="trade-pains" className="t-display" data-entrance="title">
              {page("painsTitle")}
            </h2>
            <ul className="trade-pains">
              {(all.raw(`${key}.pains`) as Pain[]).map((pain, index) => (
                <li key={pain.title} className={`trade-pain ${index === 0 ? "trade-pain--lime" : ""}`} data-entrance="">
                  <h3 className="trade-pain__title">{pain.title}</h3>
                  <p>{pain.text}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="trade-section container container--bleed" aria-labelledby="trade-steps">
          <div className="trade-steps" data-entrance-group="">
            <h2 id="trade-steps" className="t-display" data-entrance="title">
              {page("stepsTitle")}
            </h2>
            <p className="trade-steps__hint" data-entrance="">
              {page("stepsHint")}
            </p>
            <ol className="trade-steps__list" data-entrance="">
              {steps.map((code, index) => (
                <li
                  key={code}
                  className={`trade-step ${index < now ? "trade-step--done" : index === now ? "trade-step--now" : ""}`}
                  aria-current={index === now ? "step" : undefined}
                >
                  <span className="trade-step__dot" aria-hidden="true" />
                  {page(`statuses.${code}`)}
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* What a shop of this trade does with ReadyYet, in its own words, for
            the searches it makes as much as for the reader. */}
        <section className="trade-section container container--padded" aria-labelledby="trade-guide">
          <div className="trade-guide" data-entrance-group="">
            <div>
              <p className="trade-guide__label" data-entrance="">
                {page("guideLabel")}
              </p>
              <h2 id="trade-guide" className="t-display" data-entrance="title">
                {guide.title}
              </h2>
            </div>
            <div className="trade-guide__text">
              {guide.paragraphs.map((paragraph) => (
                <p key={paragraph} data-entrance="">
                  {paragraph}
                </p>
              ))}
            </div>
          </div>
        </section>

        <Pricing />

        <section className="trade-section container container--padded" aria-labelledby="trade-faq">
          <div className="trade-faq" data-entrance-group="">
            <h2 id="trade-faq" className="t-display" data-entrance="title">
              {page("faqTitle")}
            </h2>
            <div className="trade-faq__list">
              {faq.map(({ q, a }) => (
                <details key={q} className="trade-faq__item" data-entrance="">
                  <summary>{q}</summary>
                  <p>{a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        <section className="trade-section container container--padded" aria-labelledby="trade-others">
          <h2 id="trade-others" className="trade-others__title">
            {page("others")}
          </h2>
          <ul className="trade-others">
            {TRADE_KEYS.filter((other) => other !== key).map((other) => (
              <li key={other}>
                <a href={tradePath(locale, other)}>{all(`${other}.label`)}</a>
              </li>
            ))}
          </ul>
        </section>
      </main>
      <Footer />
      <PageMotion />
    </>
  );
}
