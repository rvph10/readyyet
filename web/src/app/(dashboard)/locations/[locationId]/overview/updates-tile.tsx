import { useTranslations } from "next-intl";
import Link from "next/link";
import { Icon, type IconName } from "@/components/ui/icon";
import type { components } from "@/lib/api/schema";

type Updates = components["schemas"]["InsightsUpdatesDto"];

// ADR 0116: what ReadyYet did for the shop this month, each email one call the
// shop didn't have to take or make.
export function UpdatesTile({
  updates,
  feedbackHref,
  className,
}: {
  updates: Updates;
  // The private notes link to Feedback, for those who can read it.
  feedbackHref: string | null;
  className: string;
}) {
  const t = useTranslations("today.updates");
  const rows: [IconName, string, number, string | null][] = [
    ["notification", t("reminders"), updates.reminders, null],
    ["comment", t("reviewRequests"), updates.reviewRequests, null],
    ["message", t("notes"), updates.notes, feedbackHref],
  ];

  return (
    <section className={`flex flex-col rounded-sheet bg-brand p-5 text-ink lg:p-6 ${className}`}>
      <h2 className="text-label-md">{t("title")}</h2>
      <p className="text-[3rem] leading-[3.5rem] font-bold tracking-tight">{updates.delivered}</p>
      <p className="text-p-sm">{t("delivered", { count: updates.delivered })}</p>
      <ul className="mt-auto flex flex-col gap-1 pt-5">
        {rows.map(([icon, label, count, href]) => {
          const content = (
            <>
              <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-pine text-brand">
                <Icon name={icon} className="size-3" />
              </span>
              <span className="min-w-0 flex-1 truncate text-label-sm">{label}</span>
              <span className="text-label-lg">{count}</span>
            </>
          );
          return (
            <li key={label}>
              {href ? (
                <Link
                  href={href}
                  className="-mx-2 flex items-center gap-3 rounded-xl px-2 py-1.5 transition-colors hover:bg-brand-hover"
                >
                  {content}
                </Link>
              ) : (
                <div className="flex items-center gap-3 py-1.5">{content}</div>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
