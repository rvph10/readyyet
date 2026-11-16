import type { Metadata, Viewport } from "next";
import { Figtree, Geist_Mono } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getLocale } from "next-intl/server";
import { CookieConsent } from "@/components/cookie-consent";
import { ToastProvider } from "@/components/ui/toast";
import type { ReactNode } from "react";
import "./globals.css";

const figtree = Figtree({ subsets: ["latin"], variable: "--font-figtree" });
const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono" });

// So env(safe-area-inset-bottom) is real, and a phone's bottom bar can clear its
// home indicator rather than be squeezed as Safari's toolbar comes and goes.
export const viewport: Viewport = { viewportFit: "cover" };

// The app has nothing to find through a search engine, and a Customer's link
// is the only key to their Ticket (ADR 0013).
export const metadata: Metadata = {
  title: "ReadyYet",
  robots: { index: false, follow: false },
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  const locale = await getLocale();
  return (
    <html lang={locale} className={`${figtree.variable} ${geistMono.variable}`}>
      <body className="bg-canvas font-sans text-p-sm text-ink antialiased">
        <NextIntlClientProvider>
          <ToastProvider>{children}</ToastProvider>
          <CookieConsent privacyUrl={new URL(`/${locale}/privacy#cookies`, process.env.SITE_URL).href} />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
