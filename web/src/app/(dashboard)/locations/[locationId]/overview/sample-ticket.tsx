"use client";

import { useTranslations } from "next-intl";
import { useParams } from "next/navigation";
import { useTransition } from "react";
import { useToast } from "@/components/ui/toast";
import { orFailure } from "@/lib/api/or-failure";
import { createSampleTicket } from "../new-ticket/actions";

// className styles it for where it sits: on pine or in a white card.
export function SampleTicket({ className }: { className: string }) {
  const t = useTranslations("today.sample");
  const { locationId } = useParams<{ locationId: string }>();
  const toast = useToast();
  const [pending, start] = useTransition();

  function create() {
    start(async () => {
      // On success this opens the new Ticket and never comes back here.
      const result = await orFailure(createSampleTicket(locationId));
      if (!result.ok) toast({ tone: "error", message: t("failed") });
    });
  }

  return (
    <button type="button" onClick={create} disabled={pending} aria-busy={pending || undefined} className={className}>
      {pending ? t("creating") : t("action")}
    </button>
  );
}
