"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { orFailure } from "@/lib/api/or-failure";
import { setSetupGuideHidden } from "../actions";

// Where a hidden setup guide comes back from (ADR 0117), to Today where it lives.
export function ShowGuide({ locationId }: { locationId: string }) {
  const t = useTranslations("settings");
  const toast = useToast();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <Button
      variant="secondary"
      size="sm"
      pending={pending}
      onClick={() =>
        startTransition(async () => {
          const result = await orFailure(setSetupGuideHidden(locationId, false));
          if (result.ok) router.push(`/locations/${locationId}`);
          else toast({ tone: "error", message: t("saveFailed") });
        })
      }
    >
      {t("showGuide")}
    </Button>
  );
}
