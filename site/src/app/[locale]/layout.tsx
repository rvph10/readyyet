import type { Metadata } from "next";
import { Inter, Momo_Trust_Display } from "next/font/google";
import { notFound } from "next/navigation";
import { hasLocale, type Locale, NextIntlClientProvider } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { INDEXABLE, SITE_URL } from "@/lib/site-url";
import "../globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const momo = Momo_Trust_Display({ subsets: ["latin"], weight: "400", variable: "--font-momo" });

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: LayoutProps<"/[locale]">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "metadata" });
  return {
    metadataBase: new URL(SITE_URL),
    title: t("title"),
    description: t("description"),
    alternates: {
      canonical: `/${locale}`,
      // x-default is the bare /, which sends each visitor to their language.
      languages: { ...Object.fromEntries(routing.locales.map((l) => [l, `/${l}`])), "x-default": "/" },
    },
    openGraph: {
      type: "website",
      siteName: "ReadyYet",
      url: `/${locale}`,
      title: t("title"),
      description: t("description"),
      locale: OG_LOCALES[locale],
    },
    robots: INDEXABLE ? undefined : { index: false, follow: false },
  };
}

const OG_LOCALES: Record<Locale, string> = { en: "en_GB", fr: "fr_BE", nl: "nl_BE" };

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
