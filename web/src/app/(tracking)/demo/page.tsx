import type { Metadata } from "next";
import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { buttonClass } from "@/components/ui/button";
import { TrackingView } from "../t/[code]/tracking-view";
import { demoTracking, MOMENTS, type Moment } from "./demo-tracking";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("demo");
  return { title: t("title"), robots: { index: false, follow: false } };
}

// The page a Customer gets, on a made-up Ticket, for a shop that wants to see
// it before signing up. The site links here; ?step= picks the moment.
export default async function DemoPage({ searchParams }: PageProps<"/demo">) {
  const { step } = await searchParams;
  const moment = MOMENTS.find((entry) => entry === step) ?? "repair";
  const [locale, t] = await Promise.all([getLocale(), getTranslations("demo")]);
  const now = new Date();

  return (
    <TrackingView tracking={demoTracking(moment, t("item"), locale, now)} locale={locale} now={now} demo>
      <section
        aria-labelledby="demo-title"
        className="flex flex-col gap-4 rounded-sheet bg-pine p-4 text-surface md:p-5 lg:flex-row lg:items-center lg:justify-between"
      >
        <div className="flex flex-col gap-1">
          <h2 id="demo-title" className="text-label-md">
            <span className="mr-2 rounded-full bg-brand px-2.5 py-0.5 text-label-sm text-ink">{t("label")}</span>
            {t("title")}
          </h2>
          <p className="text-p-sm">{t("intro")}</p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <nav aria-label={t("moments")} className="flex flex-wrap gap-1.5">
            {MOMENTS.map((entry: Moment) => (
              <Link
                key={entry}
                href={`/demo?step=${entry}`}
                aria-current={entry === moment ? "page" : undefined}
                className={`rounded-full px-3.5 py-2 text-label-sm transition-colors ${
                  entry === moment ? "bg-brand text-ink" : "bg-surface/10 hover:bg-surface/20"
                }`}
              >
                {t(`steps.${entry}`)}
              </Link>
            ))}
          </nav>
          <Link href="/sign-in" className={buttonClass({ variant: "secondary" })}>
            {t("start")}
          </Link>
        </div>
      </section>
    </TrackingView>
  );
}
