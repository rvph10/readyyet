import { setRequestLocale } from "next-intl/server";
import { Hero } from "@/components/home/hero/Hero";
import { HomeMotion } from "@/components/home/HomeMotion";

export default async function HomePage({ params }: PageProps<"/[locale]">) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <main id="main-content">
      <Hero />
      <HomeMotion />
    </main>
  );
}
