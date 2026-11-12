"use client";

import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import type { components } from "@/lib/api/schema";
import { NewTicketPanel, type NewTicketProps } from "./new-ticket/new-ticket-panel";
import { PlanChooser } from "./plan-chooser";

type Customer = components["schemas"]["CustomerDto"];

interface Actions {
  newTicket: () => void;
  // Opens on this Customer already chosen, with their details filled in.
  newTicketFor: (customer: Customer) => void;
  choosePlan: () => void;
  locationName: string;
}

const ActionsContext = createContext<Actions | null>(null);

// New Ticket and the plan chooser open from many places, from the header to an
// empty list, and always over the page you're on.
export function useLocationActions() {
  return useContext(ActionsContext)!;
}

interface Props extends NewTicketProps {
  locationName: string;
  // No new Tickets until a plan is chosen (ADR 0031).
  frozen: boolean;
  canChoosePlan: boolean;
  // Days left of the trial, 0 once it's over, null when there's no plan to choose.
  trialDaysLeft: number | null;
  children: ReactNode;
}

export function LocationActions({
  locationName,
  frozen,
  canChoosePlan,
  trialDaysLeft,
  children,
  ...newTicket
}: Props) {
  const t = useTranslations("plans");
  const tTickets = useTranslations("tickets");
  const [creating, setCreating] = useState(false);
  // Remounted each time, so a closed form doesn't reopen on the last Customer.
  const [run, setRun] = useState(0);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [choosing, setChoosing] = useState(false);
  const actions = useMemo(() => {
    function open(chosen: Customer | null) {
      setCustomer(chosen);
      setRun((value) => value + 1);
      setCreating(true);
    }
    return {
      newTicket: () => open(null),
      newTicketFor: open,
      choosePlan: () => setChoosing(true),
      locationName,
    };
  }, [locationName]);

  return (
    <ActionsContext.Provider value={actions}>
      {children}
      <Dialog open={creating} onClose={() => setCreating(false)} title={tTickets("new")} variant="panel">
        {creating &&
          (frozen ? (
            <PausedNotice
              onChoosePlan={
                canChoosePlan
                  ? () => {
                      setCreating(false);
                      setChoosing(true);
                    }
                  : null
              }
            />
          ) : (
            <NewTicketPanel key={run} {...newTicket} customer={customer} onClose={() => setCreating(false)} />
          ))}
      </Dialog>
      <Dialog open={choosing} onClose={() => setChoosing(false)} title={t("title")} variant="pricing">
        {choosing && <PlanChooser locationId={newTicket.locationId} trialDaysLeft={trialDaysLeft} />}
      </Dialog>
    </ActionsContext.Provider>
  );
}

// Said before the form, not after it's filled in and refused.
function PausedNotice({ onChoosePlan }: { onChoosePlan: (() => void) | null }) {
  const t = useTranslations("billing");
  const tPlans = useTranslations("plans");
  const tForm = useTranslations("tickets.form");
  return (
    <div className="flex flex-col gap-4 px-6 py-6 md:px-7">
      <p className="text-title-h4">{t("pausedTitle")}</p>
      <p className="text-p-md">{onChoosePlan ? t("pausedBody") : tForm("frozen")}</p>
      {onChoosePlan && <Button onClick={onChoosePlan}>{tPlans("choosePlan")}</Button>}
    </div>
  );
}
