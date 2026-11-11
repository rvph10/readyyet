import { setRequestLocale } from "next-intl/server";
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

  return (
    <>
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
