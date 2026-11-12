import { getTranslations, setRequestLocale } from "next-intl/server";
import { SITE_URL } from "@/lib/site-url";
import { Hero } from "@/components/home/hero/Hero";
import { Faq } from "@/components/home/faq/Faq";
import { Features } from "@/components/home/features/Features";
import { Footer } from "@/components/home/footer/Footer";
import { FinalCta } from "@/components/home/final-cta/FinalCta";
import { HomeMotion } from "@/components/home/HomeMotion";
import { Trades } from "@/components/home/trades/Trades";
import { Pricing } from "@/components/home/pricing/Pricing";
import { PromiseBand } from "@/components/home/promise/PromiseBand";
import { Steps } from "@/components/home/steps/Steps";

export default async function HomePage({ params }: PageProps<"/[locale]">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("metadata");

  const product = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "ReadyYet",
    url: `${SITE_URL}/${locale}`,
    description: t("description"),
    inLanguage: locale,
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    offers: [
      { "@type": "Offer", name: "Essentiel", price: "29", priceCurrency: "EUR" },
      { "@type": "Offer", name: "Pro", price: "49", priceCurrency: "EUR" },
    ],
  };

  return (
    <>
      {/* Data for search engines, never run. "<" is escaped so the text
          can't close the tag. */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(product).replace(/</g, "\\u003c") }}
      />
      <main id="main-content">
        <Hero />
        <Steps />
        <Features />
        <Trades />
        <PromiseBand />
        <Pricing />
        <Faq />
        <FinalCta />
        <HomeMotion />
      </main>
      <Footer />
    </>
  );
}
