"use client";

import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";
import { orFailure } from "@/lib/api/or-failure";
import { deleteLocation } from "./actions";
import { SectionHeading } from "./section-form";

// ADR 0017: the Owner's alone, and final. Typing the name stops the wrong
// Location going, where a Business has several that look alike.
export function DeleteLocation({
  locationId,
  businessId,
  name,
}: {
  locationId: string;
  businessId: string;
  name: string;
}) {
  const t = useTranslations("settings");
  const tForm = useTranslations("tickets.form");
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const [pending, startTransition] = useTransition();

  function remove() {
    startTransition(async () => {
      // On success this redirects and never comes back here.
      const result = await orFailure(deleteLocation(locationId, businessId));
      if (!result.ok) {
        setOpen(false);
        toast({ tone: "error", message: t("deleteFailed") });
      }
    });
  }

  return (
    <section className="pb-8">
      <SectionHeading title={t("deleteTitle")} hint={t("deleteHint")} />
      <Button
        variant="danger-secondary"
        onClick={() => {
          setTyped("");
          setOpen(true);
        }}
      >
        {t("deleteAction")}
      </Button>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title={t("deleteConfirmTitle", { name })}
        variant="destructive"
      >
        <p className="text-p-sm text-muted">{t("deleteConfirmBody")}</p>
        <Field
          className="mt-4"
          label={t("deleteType", { name })}
          autoComplete="off"
          value={typed}
          onChange={(event) => setTyped(event.target.value)}
        />
        <div className="mt-5 flex justify-end gap-3">
          <Button variant="secondary" disabled={pending} onClick={() => setOpen(false)}>
            {tForm("cancel")}
          </Button>
          <Button
            variant="danger"
            disabled={typed.trim() !== name}
            pending={pending}
            pendingLabel={t("deleting")}
            onClick={remove}
          >
            {t("deleteConfirm")}
          </Button>
        </div>
      </Dialog>
    </section>
  );
}
