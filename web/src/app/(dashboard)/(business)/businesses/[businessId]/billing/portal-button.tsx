"use client";

import { useTranslations } from "next-intl";
import { useTransition } from "react";
import { openPortal } from "@/app/(dashboard)/locations/[locationId]/billing/actions";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { orFailure } from "@/lib/api/or-failure";

export function PortalButton({ businessId }: { businessId: string }) {
  const t = useTranslations("billing");
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  return (
    <Button
      variant="secondary"
      className="w-full"
      pending={pending}
      pendingLabel={t("opening")}
      onClick={() =>
        startTransition(async () => {
          const result = await orFailure(openPortal(businessId));
          if (!result.ok) toast({ tone: "error", message: t("errors.portal") });
        })
      }
    >
      {t("cardsAndInvoices")}
    </Button>
  );
}
