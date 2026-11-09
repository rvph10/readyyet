"use client";

import { NEGATIVE_FEEDBACK_TAGS } from "@readyyet/shared";
import { useFormatter, useTranslations } from "next-intl";
import Link from "next/link";
import { RollingNumber } from "@/components/ui/rolling-number";
import { Skeleton } from "@/components/ui/skeleton";
import type { components } from "@/lib/api/schema";
import { sized } from "@/lib/sized";
import { Stars } from "./stars";

type Insights = components["schemas"]["FeedbackInsightsDto"];

const TAGS_SHOWN = 6;

// ADR 0125: the page's one hero, this month's answers, so the shop sees what
// asking brings: how Customers rate it, what they mention, who went to Google.
export function FeedbackInsights({
  insights,
  settingsHref,
  hasReviewLink,
}: {
  // Null while the numbers load: the tiles stand, their numbers wait.
  insights: Insights | null;
  settingsHref: string;
  hasReviewLink: boolean;
}) {
  const t = useTranslations("feedback.insights");
  const tTags = useTranslations("feedbackTags");
  const format = useFormatter();
  const loading = <Skeleton className="h-3/5 w-16 bg-surface/15!" />;
  const most = insights ? Math.max(...insights.stars, 1) : 1;

  return (
    <section
      aria-label={t("label")}
      className="on-pine grid shrink-0 gap-3 rounded-sheet bg-pine p-4 text-surface md:grid-cols-2 xl:grid-cols-[1.25fr_1.25fr_1fr_1fr] lg:p-5"
    >
      <div className="flex flex-col rounded-card bg-brand p-4 text-ink">
        <span className="text-label-sm">
          {insights
            ? t("average", { month: format.dateTime(new Date(`${insights.month}-15`), { month: "long" }) })
            : t("label")}
        </span>
        {/* No number before a first rating: a 0 would read as a bad score. */}
        <span className="mt-1 flex h-14 items-center gap-3 text-[2.75rem] leading-[3.5rem] font-bold tracking-tight">
          {insights === null ? (
            <Skeleton className="h-3/5 w-20 bg-pine/15!" />
          ) : (
            insights.average !== null &&
            format.number(insights.average, { maximumFractionDigits: 1, minimumFractionDigits: 1 })
          )}
          {insights && <Stars value={Math.round(insights.average ?? 0)} className="text-2xl" />}
        </span>
        <span className="text-p-sm">
          {insights ? t("ratings", { count: insights.ratings }) : <Skeleton className="my-1 h-3.5 w-32 bg-pine/15!" />}
        </span>
        {insights && insights.allTime.average !== null && (
          <span className="mt-1 text-label-sm">
            {t("allTime", {
              average: format.number(insights.allTime.average, { maximumFractionDigits: 1, minimumFractionDigits: 1 }),
              count: insights.allTime.ratings,
            })}
          </span>
        )}
      </div>

      <div className="flex flex-col gap-1 rounded-card bg-surface/8 p-4">
        <span className="mb-0.5 text-label-sm">{t("spread")}</span>
        {[5, 4, 3, 2, 1].map((star) => {
          const count = insights?.stars[star - 1] ?? 0;
          return (
            <div key={star} className="flex items-center gap-3 text-label-xs">
              <span className="w-6 shrink-0 tabular-nums">{star}★</span>
              <span className="h-2.5 flex-1 overflow-hidden rounded-full bg-surface/12">
                <span
                  className={`block h-full rounded-full transition-[width] duration-500 ${star <= 2 ? "bg-danger" : "bg-brand"}`}
                  ref={sized("width", (count / most) * 100)}
                />
              </span>
              <span className="w-6 shrink-0 text-right tabular-nums">{insights ? count : ""}</span>
            </div>
          );
        })}
      </div>

      <div className="flex flex-col rounded-card bg-surface/8 p-4">
        <span className="text-label-sm">{t("google")}</span>
        <span className="mt-1 flex h-14 items-center text-[2.75rem] leading-[3.5rem] font-bold tracking-tight">
          {insights === null ? loading : <RollingNumber value={insights.google} />}
        </span>
        {hasReviewLink ? (
          <span className="text-p-sm">{insights && t("googleOf", { count: insights.ratings })}</span>
        ) : (
          <Link href={settingsHref} className="text-label-sm text-brand underline-offset-4 hover:underline">
            {t("addGoogleLink")}
          </Link>
        )}
      </div>

      <div className="flex flex-col rounded-card bg-surface/8 p-4">
        <span className="text-label-sm">{t("answered")}</span>
        <span className="mt-1 flex h-14 items-center text-[2.75rem] leading-[3.5rem] font-bold tracking-tight">
          {insights === null ? loading : <RollingNumber value={insights.answers} />}
        </span>
        <span className="text-p-sm">{insights && t("answeredOf", { count: insights.asked })}</span>
      </div>

      <div className="flex flex-wrap items-center gap-2 md:col-span-2 xl:col-span-4">
        <span className="mr-1 text-label-sm">{t("mentioned")}</span>
        {insights && insights.tags.length === 0 && <span className="text-p-sm">{t("noTags")}</span>}
        {insights?.tags.slice(0, TAGS_SHOWN).map(({ tag, count }) => (
          <span
            key={tag}
            className={`inline-flex h-8 items-center gap-2 rounded-full px-3 text-label-sm ${
              NEGATIVE_FEEDBACK_TAGS.includes(tag) ? "bg-danger text-surface" : "bg-surface text-ink"
            }`}
          >
            {tTags(tag)}
            <span className="tabular-nums opacity-70">{count}</span>
          </span>
        ))}
      </div>
    </section>
  );
}
