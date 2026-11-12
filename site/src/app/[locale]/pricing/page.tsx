import type { Metadata, ResolvingMetadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { AnnouncementBar } from "@/components/announcement/AnnouncementBar";
import { Faq } from "@/components/home/faq/Faq";
import { Footer } from "@/components/home/footer/Footer";
import { Nav } from "@/components/home/Nav";
import { Pricing } from "@/components/home/pricing/Pricing";
import { PageMotion } from "@/components/PageMotion";
import { Comparison } from "@/components/pricing/Comparison";
import { routing } from "@/i18n/routing";
import "@/components/pricing/pricing-page.css";

// Atniily's too: once the Temlis sections start, its footer waits on its own
// script to show (lib/motion/temlis.ts).
const TEMLIS = ["/temlis/nexio-641/script.js", "/temlis/nexio-641/animations.js", "/temlis/atniily-923/animations.js"];

export async function generateMetadata(
  { params }: PageProps<"/[locale]/pricing">,
  parent: ResolvingMetadata,
): Promise<Metadata> {
  const { locale } = await params;
  const [t, { openGraph }] = await Promise.all([getTranslations({ locale, namespace: "pricingPage" }), parent]);
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
    alternates: {
      canonical: `/${locale}/pricing`,
      languages: {
        ...Object.fromEntries(routing.locales.map((l) => [l, `/${l}/pricing`])),
        "x-default": `/${routing.defaultLocale}/pricing`,
      },
    },
    // Next.js replaces a nested object whole, so the layout's site name, type and locale are carried over.
    openGraph: { ...openGraph, url: `/${locale}/pricing`, title: t("metaTitle"), description: t("metaDescription") },
  };
}

// The plans side by side: the home's cards, then every feature compared, then
// the questions people ask before paying.
export default async function PricingPage({ params }: PageProps<"/[locale]/pricing">) {
  const { locale } = await params;
  setRequestLocale(locale);
  return (
    <>
      <AnnouncementBar />
      <header className="pricing-page__top container container--bleed">
        <Nav />
      </header>
      <main id="main-content">
        <Pricing heading="h1" compare={false} />
        <Comparison />
        <Faq />
      </main>
      <Footer />
      <PageMotion temlis={TEMLIS} />
    </>
  );
}
