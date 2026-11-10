"use client";

import { useTranslations } from "next-intl";
import { useTransition } from "react";
import { acceptTerms } from "@/app/(dashboard)/terms-actions";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";
import { orFailure } from "@/lib/api/or-failure";

const link = "font-semibold underline underline-offset-2";

// ADR 0130: an Owner whose Business hasn't accepted the terms in force, from
// before they existed or since a version to accept again, can't go on with
// it until they do.
export function TermsDialog({
  businessId,
  businessName,
  legal,
}: {
  businessId: string;
  businessName: string;
  legal: { terms: string; dpa: string };
}) {
  const t = useTranslations("terms");
  const toast = useToast();
  const [pending, startTransition] = useTransition();

  function accept() {
    startTransition(async () => {
      const result = await orFailure(acceptTerms(businessId));
      if (!result.ok) toast({ tone: "error", message: t("failed") });
    });
  }

  return (
    <Dialog open required onClose={() => undefined} title={t("title")}>
      <p className="text-p-md text-pretty">
        {t.rich("ask", {
          name: businessName,
          terms: (chunks) => (
            <a href={legal.terms} target="_blank" rel="noopener" className={link}>
              {chunks}
            </a>
          ),
          dpa: (chunks) => (
            <a href={legal.dpa} target="_blank" rel="noopener" className={link}>
              {chunks}
            </a>
          ),
        })}
      </p>
      <Button className="mt-6 w-full" size="lg" pending={pending} pendingLabel={t("accepting")} onClick={accept}>
        {t("accept")}
      </Button>
    </Dialog>
  );
}
