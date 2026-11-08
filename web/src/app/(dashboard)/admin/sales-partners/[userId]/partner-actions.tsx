"use client";

import { ErrorCode } from "@readyyet/shared";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Icon } from "@/components/ui/icon";
import { useToast } from "@/components/ui/toast";
import { orFailure } from "@/lib/api/or-failure";
import { markCommissionsPaid, removeSalesPartner } from "../../actions";

// After the bank transfer, so the app records what was paid (ADR 0032).
export function MarkPaid({
  ids,
  amount,
  name,
  lastOwed,
}: {
  ids: string[];
  amount: string;
  name: string;
  // Paying these takes this page away, so it goes back to the list.
  lastOwed: boolean;
}) {
  const t = useTranslations("admin.markPaid");
  const tForm = useTranslations("tickets.form");
  const toast = useToast();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function confirm() {
    startTransition(async () => {
      const result = await orFailure(markCommissionsPaid(ids));
      setOpen(false);
      if (result.ok) {
        toast({ message: t("done", { amount, name }) });
        if (lastOwed) router.push("/admin");
      } else if (result.code === ErrorCode.CONFLICT) {
        // One was voided or paid since the page loaded, the total changed.
        // The action's revalidation already shows the new one.
        toast({ tone: "error", message: t("changed") });
      } else {
        toast({ tone: "error", message: t("failed") });
      }
    });
  }

  return (
    <>
      <Button variant="secondary" onClick={() => setOpen(true)} className="w-full">
        <Icon name="check" className="size-3.5" />
        {t("open", { count: ids.length, amount })}
      </Button>
      <Dialog open={open} onClose={() => setOpen(false)} title={t("title", { amount, name })} locked={pending}>
        <p className="text-p-sm text-muted">{t("body", { count: ids.length })}</p>
        <div className="mt-5 flex justify-end gap-3">
          <Button variant="secondary" disabled={pending} onClick={() => setOpen(false)}>
            {tForm("cancel")}
          </Button>
          <Button pending={pending} pendingLabel={t("saving")} onClick={confirm}>
            {t("confirm")}
          </Button>
        </div>
      </Dialog>
    </>
  );
}

export function RemovePartner({ userId, name }: { userId: string; name: string }) {
  const t = useTranslations("admin.remove");
  const tForm = useTranslations("tickets.form");
  const toast = useToast();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function confirm() {
    startTransition(async () => {
      const result = await orFailure(removeSalesPartner(userId));
      setOpen(false);
      if (result.ok) {
        toast({ message: t("done", { name }) });
        // Their page goes away with the status once nothing is owed.
        router.push("/admin");
      } else {
        toast({ tone: "error", message: t("failed") });
      }
    });
  }

  return (
    <>
      <Button variant="danger-secondary" size="sm" onClick={() => setOpen(true)}>
        {t("open")}
      </Button>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title={t("title", { name })}
        variant="destructive"
        locked={pending}
      >
        <p className="text-p-sm text-muted">{t("body", { name })}</p>
        <div className="mt-5 flex justify-end gap-3">
          <Button variant="secondary" disabled={pending} onClick={() => setOpen(false)}>
            {tForm("cancel")}
          </Button>
          <Button variant="danger" pending={pending} onClick={confirm}>
            {t("confirm")}
          </Button>
        </div>
      </Dialog>
    </>
  );
}
