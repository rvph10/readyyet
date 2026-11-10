"use client";

import { useTranslations } from "next-intl";
import { useTransition } from "react";
import { acceptTerms } from "@/app/(dashboard)/terms-actions";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { useToast } from "@/components/ui/toast";
import { orFailure } from "@/lib/api/or-failure";

const link = "font-semibold underline underline-offset-2";

// ADR 0130: an Owner whose Business hasn't accepted the terms in force, from
// before they existed or since a version to accept again, until they do.
export function TermsBanner({
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
    <div className="mb-4 flex flex-wrap items-center gap-x-4 gap-y-3 rounded-2xl bg-pine px-5 py-4 text-surface lg:mb-5">
      <Icon name="info" className="size-3.5 shrink-0 text-brand" />
      <p className="min-w-0 flex-1 basis-72 text-p-sm text-pretty">
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
      <Button size="sm" variant="brand" pending={pending} pendingLabel={t("accepting")} onClick={accept}>
        {t("accept")}
      </Button>
    </div>
  );
}
