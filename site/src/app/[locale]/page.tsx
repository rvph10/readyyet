import { setRequestLocale } from "next-intl/server";
import { Hero } from "@/components/home/hero/Hero";
import { Features } from "@/components/home/features/Features";
import { HomeMotion } from "@/components/home/HomeMotion";
import { Steps } from "@/components/home/steps/Steps";

export default async function HomePage({ params }: PageProps<"/[locale]">) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <main id="main-content">
      <Hero />
      <Steps />
      <Features />
      <HomeMotion />
    </main>
  );
}
