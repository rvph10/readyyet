import type { Metadata, Viewport } from "next";
import { Figtree, Geist_Mono } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getLocale } from "next-intl/server";
import { ToastProvider } from "@/components/ui/toast";
import type { ReactNode } from "react";
import "./globals.css";

const figtree = Figtree({ subsets: ["latin"], variable: "--font-figtree" });
const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono" });

// So env(safe-area-inset-bottom) is real, and a phone's bottom bar can clear its
// home indicator rather than be squeezed as Safari's toolbar comes and goes.
export const viewport: Viewport = { viewportFit: "cover" };

export const metadata: Metadata = {
  title: "ReadyYet",
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  const locale = await getLocale();
  return (
    <html lang={locale} className={`${figtree.variable} ${geistMono.variable}`}>
      <body className="bg-canvas font-sans text-p-sm text-ink antialiased">
        <NextIntlClientProvider>
          <ToastProvider>{children}</ToastProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
