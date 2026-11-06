import { useTranslations } from "next-intl";
import { Avatar } from "@/components/ui/avatar";
import { Panel } from "@/components/ui/panel";

const AVATARS_SHOWN = 3;

export interface ComingDay {
  date: string;
  label: string;
  customers: { id: string; name: string }[];
}

// What the next days ask of the shop, by the people expecting their item, which
// says more at a counter than how many Tickets sit at each step.
export function ComingUp({ days, className }: { days: ComingDay[]; className: string }) {
  const t = useTranslations("today");
  return (
    <Panel as="section" className={`flex flex-col ${className}`}>
      <h2 className="text-title-h6">{t("comingUp")}</h2>
      <ul className="mt-3 flex flex-1 flex-col justify-between">
        {days.map(({ date, label, customers }) => {
          const hidden = customers.length - AVATARS_SHOWN;
          return (
            <li
              key={date}
              className="flex min-h-13 items-center justify-between gap-3 border-t border-border first:border-t-0"
            >
              <span className={`min-w-0 truncate text-label-sm ${customers.length ? "" : "text-muted"}`}>{label}</span>
              {customers.length > 0 ? (
                <span className="flex shrink-0 items-center">
                  <span className="flex -space-x-2">
                    {customers.slice(0, AVATARS_SHOWN).map(({ id, name }) => (
                      <Avatar key={id} id={name} name={name} src={null} size="sm" className="ring-2 ring-surface" />
                    ))}
                  </span>
                  {hidden > 0 && <span className="ml-1.5 text-label-xs font-semibold text-muted">+{hidden}</span>}
                </span>
              ) : (
                <span className="shrink-0 text-p-xs text-muted">{t("nothingDue")}</span>
              )}
            </li>
          );
        })}
      </ul>
    </Panel>
  );
}
