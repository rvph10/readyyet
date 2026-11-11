import type { Metadata } from "next";
import { Inter, Momo_Trust_Display, Stack_Sans_Headline } from "next/font/google";
import { notFound } from "next/navigation";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { routing } from "@/i18n/routing";
import "../globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const momo = Momo_Trust_Display({ subsets: ["latin"], weight: "400", variable: "--font-momo" });
const stack = Stack_Sans_Headline({ subsets: ["latin"], weight: "400", variable: "--font-stack" });

// Runs before the first paint, so what has an entrance stays hidden until it
// plays instead of flashing in place first. Without scripts, or with reduced
// motion, nothing is held back, and the timeout shows everything should the
// entrances never start.
const holdEntrances = `history.scrollRestoration = "manual";
if (!matchMedia("(prefers-reduced-motion: reduce)").matches) {
  document.documentElement.setAttribute("data-enter", "");
  window.__enterFallback = setTimeout(function () {
    document.documentElement.removeAttribute("data-enter");
  }, 4000);
}`;

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

  // suppressHydrationWarning: holdEntrances sets data-enter on <html> before
  // React hydrates it.
  return (
    <html lang={locale} className={`${inter.variable} ${momo.variable} ${stack.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: holdEntrances }} />
      </head>
      <body>
        <NextIntlClientProvider>{children}</NextIntlClientProvider>
      </body>
    </html>
  );
}
