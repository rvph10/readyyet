import { CircleChevronRight, Mail } from "lucide-react";
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
    <div className="flex min-h-dvh p-4 md:p-5">
      <SignInPanel />
      <div className="flex w-full flex-col lg:w-1/2 lg:pl-12">
        <div className="mb-auto flex items-center justify-between gap-4">
          <div>
            <p className="text-label-lg font-bold">{t("website")}</p>
            <p className="-mt-1 text-p-sm text-muted/70">{t("visitWebsite")}</p>
          </div>
          <a
            href={new URL(`/${locale}`, site).href}
            className="flex h-10 items-center gap-3 rounded-xl border border-border bg-surface px-4 text-label-sm text-muted transition-colors hover:border-border-strong hover:text-ink"
          >
            {site.host}
            <CircleChevronRight aria-hidden="true" strokeWidth={1.5} className="size-4.5" />
          </a>
        </div>
        <main className="mx-auto my-6 w-full max-w-89">
          {/* Decorative, the heading under it says where the visitor is. */}
          <Image src={logoImage} alt="" priority className="mx-auto mb-4 size-14 md:mb-6 md:size-18" />
          {children}
        </main>
        <footer className="mt-auto flex flex-wrap items-center justify-between gap-x-4 gap-y-2 text-label-sm text-muted xl:h-15">
          <p>© {new Date().getFullYear()} ReadyYet</p>
          <a
            href={`mailto:${supportEmail}`}
            aria-label={t("help", { email: supportEmail })}
            className="flex items-center gap-2 transition-colors hover:text-ink"
          >
            <Mail aria-hidden="true" strokeWidth={1.5} className="size-4.5" />
            {supportEmail}
          </a>
        </footer>
      </div>
    </div>
  );
}
