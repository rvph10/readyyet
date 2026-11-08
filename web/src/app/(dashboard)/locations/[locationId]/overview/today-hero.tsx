"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";
import { Icon, type IconName } from "@/components/ui/icon";
import { useLocationActions } from "../location-actions";

export interface HeroStat {
  href: string;
  icon: IconName;
  label: string;
  value: number;
  sub: string;
  tone?: "lime" | "late";
}

// ADR 0116: the page's one hero. It greets, says the one thing to know about
// the day, and holds the day's numbers, Ready the biggest (ADR 0108).
export function TodayHero({
  greeting,
  date,
  summary,
  stats,
}: {
  greeting: string;
  date: string;
  summary: string;
  stats: HeroStat[];
}) {
  const t = useTranslations("today");
  const { newTicket } = useLocationActions();
  return (
    <section className="on-pine flex flex-col gap-6 rounded-sheet bg-pine p-5 text-surface lg:gap-8 lg:p-8">
      <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-5">
        <div className="min-w-0">
          <p className="text-label-sm text-brand">{date}</p>
          <h1 className="mt-1 text-title-h4 wrap-anywhere lg:text-title-h3">{greeting}</h1>
          <p className="mt-1 text-p-lg">{summary}</p>
        </div>
        {/* On a phone the bottom bar already holds New Ticket. */}
        <button
          type="button"
          onClick={newTicket}
          className="inline-flex h-12 max-md:hidden shrink-0 cursor-pointer items-center gap-2 rounded-full bg-brand px-5 text-label-sm text-ink transition-[background-color,scale] hover:bg-brand-hover active:scale-[0.97]"
        >
          <Icon name="add" className="size-3.5" />
          {t("newTicket")}
        </button>
      </div>
      <ul className="grid grid-cols-2 gap-3 md:grid-cols-[1.5fr_1fr_1fr_1fr]">
        {stats.map((stat) => (
          <li
            key={stat.label}
            className={stat.tone === "lime" ? "col-span-2 md:col-span-1" : "last:col-span-2 md:last:col-span-1"}
          >
            <Stat {...stat} />
          </li>
        ))}
      </ul>
    </section>
  );
}

function Stat({ href, icon, label, value, sub, tone }: HeroStat) {
  const lime = tone === "lime";
  const late = tone === "late" && value > 0;
  return (
    <Link
      href={href}
      className={`flex h-full flex-col rounded-card p-4 transition-colors lg:p-5 ${
        lime ? "bg-brand text-ink hover:bg-brand-hover" : "bg-surface/8 hover:bg-surface/14"
      }`}
    >
      <span className="flex items-center justify-between gap-2">
        <span className="min-w-0 text-label-sm md:truncate">{label}</span>
        <span
          className={`flex size-8 max-sm:hidden shrink-0 items-center justify-center rounded-full ${
            lime ? "bg-pine text-brand" : late ? "bg-danger text-surface" : "bg-surface/12"
          }`}
        >
          <Icon name={icon} className="size-3" />
        </span>
      </span>
      <span
        className={`mt-2 font-bold tracking-tight ${lime ? "text-[4rem] leading-[4.25rem]" : "text-[2.75rem] leading-[3.5rem]"}`}
      >
        {value}
      </span>
      <span className="text-p-sm">{sub}</span>
    </Link>
  );
}
