import type { Metadata, ResolvingMetadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { AnnouncementBar } from "@/components/announcement/AnnouncementBar";
import { ChipButton } from "@/components/home/ChipButton";
import { Footer } from "@/components/home/footer/Footer";
import { Pricing } from "@/components/home/pricing/Pricing";
import { PageMotion } from "@/components/PageMotion";
import { Icon, type IconName } from "@/components/trade/Icon";
import { TradeHero } from "@/components/trade/TradeHero";
import { routing } from "@/i18n/routing";
import { signInUrl } from "@/lib/sign-in-url";
import { SITE_URL } from "@/lib/site-url";
import { TRADE_KEYS, TRADES, tradeFromSlug, tradePath, type SiteLocale } from "@/lib/trades";
import "@/components/trade/trade.css";

type Props = PageProps<"/[locale]/[trade]">;
type Step = { title: string; text: string };
type Feature = { key: keyof typeof FEATURES; text: string };
type Question = { q: string; a: string };
type Guide = { title: string; paragraphs: string[] };

export const dynamicParams = false;

// Every feature a trade can put forward, its icon, and whether it's Pro's
// (ADR 0031). Each trade picks its own and says them in its words.
const FEATURES = {
  photos: { icon: "camera", pro: false },
  reminders: { icon: "notification", pro: false },
  qr: { icon: "qrcode", pro: false },
  whatsapp: { icon: "message", pro: false },
  steps: { icon: "layers", pro: true },
  parts: { icon: "time", pro: true },
  approval: { icon: "receipt", pro: true },
  hours: { icon: "home", pro: false },
  date: { icon: "date", pro: false },
  reviews: { icon: "comment", pro: true },
  team: { icon: "user", pro: false },
} as const satisfies Record<string, { icon: IconName; pro: boolean }>;

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
// with the steps its Customers really see. The layout is shared, every word
// comes from the trade's messages.
export default async function TradePage({ params }: Props) {
  const { locale, key } = await trade(params);
  setRequestLocale(locale);

  const [all, signIn] = await Promise.all([getTranslations("tradePage"), signInUrl()]);
  const t = (name: string) => all(`${key}.${name}`);
  const page = (name: string) => all(`page.${name}`);
  const faq = all.raw(`${key}.faq`) as Question[];
  const guide = all.raw(`${key}.guide`) as Guide;
  const how = all.raw(`${key}.how`) as Step[];
  const features = all.raw(`${key}.features`) as Feature[];

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
      <TradeHero trade={key} signIn={signIn} />

      <main id="main-content">
        <section className="trade-section container container--padded" aria-labelledby="trade-compare">
          <div data-entrance-group="">
            <h2 id="trade-compare" className="t-display" data-entrance="title">
              {page("painsTitle")}
            </h2>
            <div className="trade-compare">
              {(["before", "after"] as const).map((side) => (
                <div key={side} className={`trade-compare__side trade-compare__side--${side}`} data-entrance="">
                  <h3 className="trade-compare__title">{page(`compare.${side}`)}</h3>
                  <ul>
                    {(all.raw(`${key}.${side}`) as string[]).map((line) => (
                      <li key={line}>
                        <span className="trade-compare__mark">
                          <Icon name={side === "before" ? "close" : "check"} />
                        </span>
                        {line}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="trade-section container container--padded" aria-labelledby="trade-how">
          <div data-entrance-group="">
            <p className="trade-label" data-entrance="">
              {page("how.label")}
            </p>
            <h2 id="trade-how" className="t-display" data-entrance="title">
              {page("how.title")}
            </h2>
            <ol className="trade-how">
              {how.map((step, index) => (
                <li key={step.title} className="trade-how__step" data-entrance="">
                  <div className="trade-how__art" aria-hidden="true">
                    <HowArt
                      index={index}
                      item={t("demo.item")}
                      customer={t("demo.customer")}
                      expected={t("demo.expected")}
                      mock={(name) => all(`page.how.mock.${name}`)}
                    />
                  </div>
                  <span className="trade-how__number">{String(index + 1).padStart(2, "0")}</span>
                  <h3 className="trade-how__title">{step.title}</h3>
                  <p>{step.text}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="trade-section container container--padded" aria-labelledby="trade-features">
          <div data-entrance-group="">
            <p className="trade-label" data-entrance="">
              {page("features.label")}
            </p>
            <h2 id="trade-features" className="t-display" data-entrance="title">
              {t("featuresTitle")}
            </h2>
            <ul className="trade-features">
              {features.map(({ key: feature, text }) => (
                <li key={feature} className="trade-feature" data-entrance="">
                  <span className="trade-feature__icon">
                    <Icon name={FEATURES[feature].icon} />
                  </span>
                  <h3 className="trade-feature__title">
                    {page(`features.catalog.${feature}`)}
                    {FEATURES[feature].pro && <span className="trade-feature__pro">{page("features.pro")}</span>}
                  </h3>
                  <p>{text}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="trade-section container container--bleed" aria-labelledby="trade-numbers">
          <div className="trade-numbers" data-entrance-group="">
            <p className="trade-label trade-label--lime" data-entrance="">
              {page("numbers.label")}
            </p>
            <h2 id="trade-numbers" className="t-display" data-entrance="title">
              {page("numbers.title")}
            </h2>
            <ul className="trade-numbers__list">
              {[0, 1, 2].map((i) => (
                <li key={i} data-entrance="">
                  <strong>{page(`numbers.items.${i}.value`)}</strong>
                  {page(`numbers.items.${i}.text`)}
                </li>
              ))}
            </ul>
            <p className="trade-numbers__note" data-entrance="">
              {page("numbers.note")}
            </p>
          </div>
        </section>

        {/* What a shop of this trade does with ReadyYet, in its own words, for
            the searches it makes as much as for the reader. */}
        <section className="trade-section container container--padded" aria-labelledby="trade-guide">
          <div className="trade-guide" data-entrance-group="">
            <div>
              <p className="trade-label" data-entrance="">
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

        <section className="trade-section container container--bleed" aria-labelledby="trade-closing">
          <div className="trade-closing" data-entrance-group="">
            <h2 id="trade-closing" className="t-display" data-entrance="title">
              {t("closingTitle")}
            </h2>
            <p data-entrance="">{page("closing.text")}</p>
            <div data-entrance="">
              <ChipButton href={signIn}>{page("start")}</ChipButton>
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
                <a href={tradePath(locale, other)}>
                  <img src={`/home/trade-${other}.svg`} alt="" width="24" height="24" />
                  {all(`${other}.label`)}
                </a>
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

// The app in miniature for each moment: the Ticket being created, the link's
// three ways to the Customer, and the emails that follow.
function HowArt({
  index,
  item,
  customer,
  expected,
  mock,
}: {
  index: number;
  item: string;
  customer: string;
  expected: string;
  mock: (name: string) => string;
}) {
  if (index === 0) {
    return (
      <div className="how-form">
        {[
          [mock("customer"), customer],
          [mock("item"), item],
          [mock("expected"), expected],
        ].map(([label, value]) => (
          <div key={label} className="how-form__field">
            <span>{label}</span>
            {value}
          </div>
        ))}
        <span className="how-form__button">{mock("create")}</span>
      </div>
    );
  }
  if (index === 1) {
    const icons: IconName[] = ["message", "comment", "qrcode"];
    return (
      <ul className="how-channels">
        {icons.map((icon, i) => (
          <li key={icon}>
            <Icon name={icon} />
            {mock(`channels.${i}`)}
          </li>
        ))}
      </ul>
    );
  }
  return (
    <ul className="how-timeline">
      <li className="is-ready">
        <Icon name="check" />
        {mock("ready")}
      </li>
      <li>
        <Icon name="notification" />
        {mock("reminder3")}
      </li>
      <li>
        <Icon name="notification" />
        {mock("reminder10")}
      </li>
    </ul>
  );
}
