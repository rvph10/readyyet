import type { Metadata } from "next";
import { Inter, Momo_Trust_Display } from "next/font/google";
import { notFound } from "next/navigation";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { routing } from "@/i18n/routing";
import "../globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const momo = Momo_Trust_Display({ subsets: ["latin"], weight: "400", variable: "--font-momo" });

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: LayoutProps<"/[locale]">): Promise<Metadata> {
  const t = await getTranslations({ locale: (await params).locale, namespace: "metadata" });
  return { title: t("title"), description: t("description") };
}

export default async function LocaleLayout({ children, params }: LayoutProps<"/[locale]">) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  // Lets the pages below render at build time, instead of reading the
  // locale from the request.
  setRequestLocale(locale);

  // data-enter holds back what has an entrance until it plays, see the
  // Entrances rules in globals.css.
  return (
    <html lang={locale} className={`${inter.variable} ${momo.variable}`} data-enter="">
      <body>
        <NextIntlClientProvider>{children}</NextIntlClientProvider>
      </body>
    </html>
  );
}
