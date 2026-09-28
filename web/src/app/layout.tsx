import type { Metadata } from "next";
import { Figtree, Geist_Mono, Inter } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getLocale } from "next-intl/server";
import { ToastProvider } from "@/components/ui/toast";
import type { ReactNode } from "react";
import "./globals.css";

const figtree = Figtree({ subsets: ["latin"], variable: "--font-figtree" });
// The optical size axis gives large titles Inter's display cut (ADR 0049).
const inter = Inter({ subsets: ["latin"], axes: ["opsz"], variable: "--font-inter" });
const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono" });

export const metadata: Metadata = {
  title: "ReadyYet",
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  const locale = await getLocale();
  return (
    <html lang={locale} className={`${figtree.variable} ${inter.variable} ${geistMono.variable}`}>
      <body className="bg-canvas font-sans text-p-sm text-ink antialiased">
        <NextIntlClientProvider>
          <ToastProvider>{children}</ToastProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
