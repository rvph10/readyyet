import { ChevronRight } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import Image, { type StaticImageData } from "next/image";
import type { ReactNode } from "react";
import logo from "../icon.svg";
import { SignInPanel } from "./sign-in-panel";

// Next.js types *.svg imports as any, in case an SVGR plugin turns them
// into components. Without one they are plain static images.
const logoImage = logo as StaticImageData;

export default async function SignInLayout({ children }: { children: ReactNode }) {
  const t = await getTranslations("signIn");
  const locale = await getLocale();
  const site = new URL(process.env.SITE_URL as string);
  const supportEmail = process.env.SUPPORT_EMAIL as string;

  return (
    <div className="grid min-h-dvh p-5 lg:grid-cols-2 lg:gap-5">
      <SignInPanel />
      <div className="flex flex-col">
        <a
          href={new URL(`/${locale}`, site).href}
          aria-label={t("backToSite", { site: site.host })}
          className="group flex h-8 items-center gap-2 self-end text-sm text-muted transition-colors hover:text-ink"
        >
          {site.host}
          <span className="flex size-6 items-center justify-center rounded-full border border-border bg-surface transition-colors group-hover:bg-subtle">
            <ChevronRight aria-hidden="true" className="size-3.5" />
          </span>
        </a>
        <main className="flex flex-1 items-center justify-center py-10">
          <div className="flex w-full max-w-sm flex-col gap-6">
            {/* Decorative, the heading under it says where the visitor is. */}
            <Image src={logoImage} alt="" className="size-10" priority />
            {children}
          </div>
        </main>
        <footer className="flex flex-wrap justify-between gap-x-4 gap-y-1 text-xs text-muted">
          <p>© {new Date().getFullYear()} ReadyYet</p>
          <p>
            {t.rich("help", {
              email: () => (
                <a href={`mailto:${supportEmail}`} className="text-ink underline-offset-4 hover:underline">
                  {supportEmail}
                </a>
              ),
            })}
          </p>
        </footer>
      </div>
    </div>
  );
}
