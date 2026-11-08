import { useTranslations } from "next-intl";
import type { components } from "@/lib/api/schema";

type YourDay = components["schemas"]["InsightsYourDayDto"];

// ADR 0116: an Employee's own part of the day, in place of the month's growth.
export function YourDayTile({ yourDay, className }: { yourDay: YourDay; className: string }) {
  const t = useTranslations("today.yourDay");
  const numbers = [
    [t("created"), yourDay.created],
    [t("moved"), yourDay.moved],
  ] as const;
  return (
    <section className={`flex flex-col rounded-sheet border border-border bg-surface p-5 lg:p-6 ${className}`}>
      <h2 className="text-label-md">{t("title")}</h2>
      <dl className="mt-3 grid grid-cols-2 gap-3">
        {numbers.map(([label, value]) => (
          <div key={label} className="flex flex-col-reverse justify-start rounded-card bg-subtle p-4">
            <dt className="text-label-sm">{label}</dt>
            <dd className="text-[3rem] leading-[3.5rem] font-bold tracking-tight">{value}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-auto pt-4 text-p-sm">{yourDay.created + yourDay.moved > 0 ? t("thanks") : t("start")}</p>
    </section>
  );
}
