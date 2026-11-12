"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Illustration } from "@/components/illustration";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Icon } from "@/components/ui/icon";
import { track } from "@/lib/analytics";
import { PLAN_FEATURES, PLAN_NAMES, type Plan } from "../plan-prices";

const CONFETTI_PIECES = 18;

interface Props {
  locationId: string;
  locationName: string;
  // Null if the return link was edited, the rest still holds.
  plan: Plan | null;
  firstPayment: string | null;
}

// ADR 0094: paying deserves a moment. Closing it drops ?checkout from the URL,
// so a refresh doesn't celebrate twice.
export function PlanCelebration({ locationId, locationName, plan, firstPayment }: Props) {
  const t = useTranslations("today.celebration");
  const tBilling = useTranslations("billing");
  const router = useRouter();
  const [open, setOpen] = useState(true);

  useEffect(() => {
    track("plan_chosen", plan ? { plan } : undefined);
  }, [plan]);

  function close() {
    setOpen(false);
    router.replace(`/locations/${locationId}`, { scroll: false });
  }

  return (
    <Dialog
      open={open}
      onClose={close}
      variant="announcement"
      title={plan ? t("title", { plan: PLAN_NAMES[plan] }) : t("titleNoPlan")}
      media={
        <div className="absolute inset-0 flex items-center justify-center bg-pine">
          <div aria-hidden="true" className="confetti motion-reduce:hidden">
            {Array.from({ length: CONFETTI_PIECES }, (_, piece) => (
              <span key={piece} />
            ))}
          </div>
          <Illustration name="trophy-on-pine" className="relative h-[86%] w-auto" />
        </div>
      }
    >
      <p className="text-p-md text-muted">{t("body", { location: locationName })}</p>
      {plan && (
        <ul className="mt-4 flex flex-col gap-2.5">
          {PLAN_FEATURES[plan].map((feature) => (
            <li key={feature} className="flex items-center gap-2.5 text-label-sm">
              <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-pine text-brand">
                <Icon name="check" className="size-2.5" />
              </span>
              {tBilling(`features.${feature}`)}
            </li>
          ))}
        </ul>
      )}
      {firstPayment && (
        <p className="mt-4 rounded-xl bg-subtle px-3.5 py-3 text-label-sm">
          {t("firstPayment", { date: firstPayment })}
        </p>
      )}
      <Button size="lg" className="mt-5" onClick={close}>
        {t("action")}
        <Icon name="arrow-right" className="size-2.5 text-brand" />
      </Button>
    </Dialog>
  );
}
