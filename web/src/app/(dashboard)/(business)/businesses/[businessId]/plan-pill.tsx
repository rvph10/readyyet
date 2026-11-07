import { useTranslations } from "next-intl";
import { PLAN_NAMES } from "@/app/(dashboard)/locations/[locationId]/plan-prices";
import { planState, type BusinessLocation, type PlanState } from "./business-views";

const TONES: Record<PlanState, string> = {
  active: "bg-pine-subtle text-pine",
  trial: "bg-brand text-ink",
  changing: "bg-warning-subtle text-warning",
  stopping: "bg-warning-subtle text-warning",
  failed: "bg-danger text-surface",
  paused: "bg-danger text-surface",
};

// Solid, as a stopped Location has to stand out of a table at a glance.
export function PlanPill({ location }: { location: Pick<BusinessLocation, "billing" | "daysLeft"> }) {
  const t = useTranslations("business.plan");
  const { billing, daysLeft } = location;
  const state = planState(billing);
  return (
    <span
      className={`inline-flex h-7 w-fit items-center rounded-full px-3 text-label-xs font-semibold whitespace-nowrap ${TONES[state]}`}
    >
      {state === "active" && PLAN_NAMES[billing.plan!]}
      {state === "trial" && t("trial", { days: daysLeft ?? 0 })}
      {state !== "active" && state !== "trial" && t(state)}
    </span>
  );
}
