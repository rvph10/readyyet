"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Icon, type IconName } from "@/components/ui/icon";
import { useToast } from "@/components/ui/toast";
import { orFailure } from "@/lib/api/or-failure";
import { deleteLocation } from "./actions";
import { SectionHeading } from "./section-form";

const LOSSES: { key: "tracking" | "photos" | "customers" | "plan" | "team"; icon: IconName }[] = [
  { key: "tracking", icon: "link" },
  { key: "photos", icon: "camera" },
  // ADR 0128.
  { key: "customers", icon: "user" },
  { key: "plan", icon: "receipt" },
  { key: "team", icon: "id-card" },
];

// ADR 0017: the Owner's alone, and final. Typing the name stops the wrong
// Location going, where a Business has several that look alike. ADR 0111: a
// danger zone as in most SaaS, saying what goes before asking anything.
export function DeleteLocation({
  locationId,
  businessId,
  name,
  openTickets,
}: {
  locationId: string;
  businessId: string;
  name: string;
  openTickets: number;
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
    <section className="max-w-3xl pb-8">
      <SectionHeading title={t("deleteTitle")} hint={t("deleteHint")} />
      <div className="overflow-clip rounded-3xl border border-danger/40">
        <div className="p-5 lg:p-6">
          <h3 className="text-label-md">{t("deleteLosesTitle", { name })}</h3>
          <ul className="mt-4 grid gap-3 sm:grid-cols-2">
            {LOSSES.map(({ key, icon }) => (
              <li key={key} className="flex items-center gap-3 text-p-sm">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-danger-subtle text-danger">
                  <Icon name={icon} className="size-3.5" />
                </span>
                {t(`deleteLoses.${key}`)}
              </li>
            ))}
          </ul>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-danger/40 bg-danger-subtle px-5 py-4 lg:px-6">
          <p className="min-w-0 flex-1 basis-56 text-p-sm text-danger">{t("deleteFinal")}</p>
          <Button
            variant="danger"
            onClick={() => {
              setTyped("");
              setOpen(true);
            }}
          >
            {t("deleteAction")}
          </Button>
        </div>
      </div>

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title={t("deleteConfirmTitle", { name })}
        variant="destructive"
      >
        <p className="text-p-sm text-muted">{t("deleteConfirmBody")}</p>
        <p className="mt-3 text-p-sm">
          {t("exportFirst")}{" "}
          <Link
            href={`/locations/${locationId}/settings?section=export`}
            onClick={() => setOpen(false)}
            className="font-semibold underline underline-offset-2"
          >
            {t("exportFirstLink")}
          </Link>
        </p>
        {openTickets > 0 && (
          <p className="mt-3 rounded-xl bg-danger-subtle px-3 py-2.5 text-label-sm text-danger">
            {t("deleteOpenTickets", { count: openTickets })}
          </p>
        )}
        <div className="mt-4 border-t border-border pt-4">
          <p className="mb-2 text-p-sm">
            {t.rich("deleteType", {
              name,
              shop: (chunks) => <strong className="rounded-md bg-subtle px-1.5 py-0.5 font-semibold">{chunks}</strong>,
            })}
          </p>
          <Field
            label={t("deleteTypeLabel")}
            hideLabel
            autoComplete="off"
            value={typed}
            onChange={(event) => setTyped(event.target.value)}
          />
        </div>
        <div className="mt-5 flex flex-col gap-2">
          <Button
            variant="danger"
            className="w-full"
            disabled={typed.trim() !== name}
            pending={pending}
            pendingLabel={t("deleting")}
            onClick={remove}
          >
            {t("deleteConfirm", { name })}
          </Button>
          <Button variant="secondary" className="w-full" disabled={pending} onClick={() => setOpen(false)}>
            {tForm("cancel")}
          </Button>
        </div>
      </Dialog>
    </section>
  );
}
