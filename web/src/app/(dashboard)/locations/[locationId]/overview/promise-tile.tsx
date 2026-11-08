import { useTranslations } from "next-intl";
import Link from "next/link";
import { ProgressBar } from "@/components/ui/progress-bar";
import type { components } from "@/lib/api/schema";

type Promise = components["schemas"]["InsightsPromiseDto"];

// ADR 0116: the date a Customer was told is the promise, so keeping it is the
// shop's quality, more than speed alone.
export function PromiseTile({
  promise,
  settingsHref,
  className,
}: {
  promise: Promise;
  // Where the turnaround is set, for those who can.
  settingsHref: string | null;
  className: string;
}) {
  const t = useTranslations("today.promise");
  const { dated, onTime, averageDays, turnaroundDays } = promise;
  const percent = dated ? Math.round((onTime / dated) * 100) : null;

  return (
    <section className={`flex flex-col rounded-sheet border border-border bg-surface p-5 lg:p-6 ${className}`}>
      <h2 className="text-label-md">{t("title")}</h2>
      {percent === null ? (
        <p className="mt-2 text-p-sm">{t("noDates")}</p>
      ) : (
        <>
          <p className={`text-[3rem] leading-[3.5rem] font-bold tracking-tight ${percent < 80 ? "text-danger" : ""}`}>
            {percent}%
          </p>
          <p className="text-p-sm">{t("onTime", { onTime, dated })}</p>
          <div className="mt-3">
            <ProgressBar value={onTime} max={dated} label={t("title")} />
          </div>
        </>
      )}
      <div className="mt-auto flex flex-col gap-1 border-t border-border pt-4 max-lg:mt-6">
        <p className="text-label-lg">
          {averageDays === null
            ? t("noAverage")
            : averageDays < 1
              ? t("sameDay")
              : t("averageDays", { days: averageDays })}
        </p>
        {turnaroundDays !== null ? (
          <p className="text-p-sm text-muted">{t("promised", { days: turnaroundDays })}</p>
        ) : (
          settingsHref && (
            <Link href={settingsHref} className="text-label-sm text-brand-text hover:text-ink hover:underline">
              {t("setTurnaround")}
            </Link>
          )
        )}
      </div>
    </section>
  );
}
