"use client";

import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Dialog } from "@/components/ui/dialog";
import { NewTicketPanel, type NewTicketProps } from "./new-ticket/new-ticket-panel";
import { PlanChooser } from "./plan-chooser";

interface Actions {
  newTicket: () => void;
  choosePlan: () => void;
}

const ActionsContext = createContext<Actions | null>(null);

// New Ticket and the plan chooser open from many places, from the header to an
// empty list, and always over the page you're on.
export function useLocationActions() {
  return useContext(ActionsContext)!;
}

interface Props extends NewTicketProps {
  // Days left of the trial, 0 once it's over, null when there's no plan to choose.
  trialDaysLeft: number | null;
  children: ReactNode;
}

export function LocationActions({ trialDaysLeft, children, ...newTicket }: Props) {
  const t = useTranslations("plans");
  const tTickets = useTranslations("tickets");
  const [creating, setCreating] = useState(false);
  // Remounted each time, so a closed form doesn't reopen on the last Customer.
  const [run, setRun] = useState(0);
  const [choosing, setChoosing] = useState(false);
  const actions = useMemo(
    () => ({
      newTicket: () => {
        setRun((value) => value + 1);
        setCreating(true);
      },
      choosePlan: () => setChoosing(true),
    }),
    [],
  );

  return (
    <ActionsContext.Provider value={actions}>
      {children}
      <Dialog open={creating} onClose={() => setCreating(false)} title={tTickets("new")} variant="panel">
        {creating && <NewTicketPanel key={run} {...newTicket} onClose={() => setCreating(false)} />}
      </Dialog>
      <Dialog open={choosing} onClose={() => setChoosing(false)} title={t("title")}>
        {choosing && <PlanChooser locationId={newTicket.locationId} trialDaysLeft={trialDaysLeft} />}
      </Dialog>
    </ActionsContext.Provider>
  );
}
