import type { Metadata } from "next";
import { Figtree, Geist_Mono, Inter } from "next/font/google";
import { notFound } from "next/navigation";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { routing } from "@/i18n/routing";
import "../globals.css";

const figtree = Figtree({ subsets: ["latin"], variable: "--font-figtree" });
// The optical size axis gives large titles Inter's display cut (ADR 0049).
const inter = Inter({ subsets: ["latin"], axes: ["opsz"], variable: "--font-inter" });
const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono" });

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

  return (
    <html lang={locale} className={`${figtree.variable} ${inter.variable} ${geistMono.variable}`}>
      <body className="bg-canvas font-sans text-p-sm text-ink antialiased">
        <NextIntlClientProvider>{children}</NextIntlClientProvider>
      </body>
    </html>
  );
}
