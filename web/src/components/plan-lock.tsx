import Link from "next/link";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { buttonClass } from "./ui/button";
import { Icon } from "./ui/icon";

interface Props {
  locationId: string;
  // A frozen Location gets its features back by choosing any plan, one on
  // Essentiel by moving to Pro.
  frozen: boolean;
  title: string;
  children: ReactNode;
  className?: string;
}

// Where a Pro feature would be: what it does and the way to it, the same
// everywhere so a shop always knows what its plan holds and what unlocks the
// rest. The pages showing it are the Owner's and Admins', who can choose.
export function PlanLock({ locationId, frozen, title, children, className = "" }: Props) {
  const t = useTranslations("planLock");
  return (
    <section className={`flex flex-col items-start rounded-sheet bg-brand p-6 ${className}`}>
      <span className="rounded-full bg-ink px-2.5 py-1 text-label-xs text-brand">{t("badge")}</span>
      <h2 className="mt-3 text-title-h6 text-balance">{title}</h2>
      <div className="mt-1 text-p-sm text-pretty">{children}</div>
      {frozen && <p className="mt-2 text-p-sm font-medium text-pretty">{t("frozen")}</p>}
      <Link href={`/locations/${locationId}/billing`} className={`${buttonClass()} mt-4`}>
        {t(frozen ? "choose" : "upgrade")}
        <Icon name="arrow-right" className="size-2.5" />
      </Link>
    </section>
  );
}
