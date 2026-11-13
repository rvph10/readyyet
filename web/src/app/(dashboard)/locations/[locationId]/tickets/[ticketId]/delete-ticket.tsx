"use client";

import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";
import { orFailure } from "@/lib/api/or-failure";
import { deleteTicket } from "./actions";

// ADR 0155: the Owner's and admins', behind a confirmation, as it can't be undone.
export function DeleteTicket({
  locationId,
  ticketId,
  number,
}: {
  locationId: string;
  ticketId: string;
  number: number;
}) {
  const t = useTranslations("ticketDetail");
  const tForm = useTranslations("tickets.form");
  const toast = useToast();
  const [confirming, setConfirming] = useState(false);
  const [deleting, startDeleting] = useTransition();

  function remove() {
    startDeleting(async () => {
      // On success this redirects and never comes back here.
      const result = await orFailure(deleteTicket(locationId, ticketId));
      if (!result.ok) {
        setConfirming(false);
        toast({ tone: "error", message: t("deleteTicket.failed") });
      }
    });
  }

  return (
    <section className="mt-8 border-t border-border pt-6">
      <h3 className="text-label-sm">{t("deleteTicket.title")}</h3>
      <p className="mt-1 text-p-sm text-muted">{t("deleteTicket.hint")}</p>
      <Button variant="danger-secondary" size="sm" className="mt-3" onClick={() => setConfirming(true)}>
        {t("deleteTicket.action")}
      </Button>

      <Dialog
        open={confirming}
        onClose={() => setConfirming(false)}
        title={t("deleteTicket.confirmTitle", { number })}
        variant="destructive"
      >
        <p className="text-p-sm text-muted">{t("deleteTicket.confirmBody")}</p>
        <div className="mt-5 flex justify-end gap-3">
          <Button variant="secondary" disabled={deleting} onClick={() => setConfirming(false)}>
            {tForm("cancel")}
          </Button>
          <Button variant="danger" pending={deleting} pendingLabel={t("deleting")} onClick={remove}>
            {t("deleteTicket.confirm")}
          </Button>
        </div>
      </Dialog>
    </section>
  );
}
